// Shared dictionary pipeline — used by both background.js and popup.js.
// There is NO hard-coded word list in this extension. Every character/code/
// frequency/association comes from verified open-source projects, fetched
// at runtime:
//
//   1. rime-stroke    — stroke codes (h/s/p/n/z -> 橫/直/撇/點/折 -> 1-5).
//                        Source data: Taiwan's official CNS11643 全字庫.
//                        https://github.com/rime/rime-stroke
//   2. rime-cantonese  — jyutping pronunciation (chars) + Cantonese-only
//                        colloquial phrases (words), e.g. 我哋/佢哋/唔該.
//                        https://github.com/rime/rime-cantonese
//   3. rime-essay      — real corpus usage-frequency counts (word -> count),
//                        the same "八股文字頻" preset data Rime itself uses
//                        to rank candidates. Traditional-Chinese script,
//                        general written register (covers 我們/我的/我要
//                        as well as Cantonese function words 唔/係/冇/嘅/...
//                        which do show up in this corpus with real counts).
//                        https://github.com/rime/rime-essay
//
// rime-stroke's own data already includes Cantonese-specific characters
// (係/唔/嘅/喺/佢/哋/嗰/冇/...) because CNS11643 covers them, so no separate
// "Cantonese stroke" source is needed.

(function (global) {
  const STROKE_SOURCE_URL =
    'https://raw.githubusercontent.com/rime/rime-stroke/master/stroke.dict.yaml';
  const CANTONESE_CHARS_URL =
    'https://raw.githubusercontent.com/rime/rime-cantonese/main/jyut6ping3.chars.dict.yaml';
  const CANTONESE_WORDS_URL =
    'https://raw.githubusercontent.com/rime/rime-cantonese/main/jyut6ping3.words.dict.yaml';
  const ESSAY_URL =
    'https://raw.githubusercontent.com/rime/rime-essay/master/essay.txt';

  const LETTER_TO_DIGIT = { h: '1', s: '2', p: '3', n: '4', z: '5' };

  // How many "next word" suggestions to keep per lead character, split
  // between the two sources (essay = real frequency, canto = colloquial
  // coverage essay.txt lacks). The popup only renders ~10-12 of these, the
  // rest just give the related-bar somewhere to scroll to.
  const ASSOC_ESSAY_PER_LEAD = 15;
  const ASSOC_CANTO_PER_LEAD = 10;

  const STORAGE_KEYS = {
    ENTRIES: 't5_dict_entries',
    META: 't5_dict_meta',
    ASSOC: 't5_assoc_index'
  };

  function letterCodeToDigits(letters) {
    let out = '';
    for (const ch of letters) {
      const d = LETTER_TO_DIGIT[ch];
      if (!d) return null; // unrecognised symbol -> skip this line
      out += d;
    }
    return out || null;
  }

  // rime-stroke lines look like: "係\tpspzznzpn"
  // Header/YAML metadata lines (name:, version:, ---, ...) have no tab and
  // are skipped automatically.
  function parseStrokeDict(text) {
    const entries = [];
    for (const line of text.split('\n')) {
      if (!line || line[0] === '#') continue;
      const tab = line.indexOf('\t');
      if (tab === -1) continue;
      const char = line.slice(0, tab);
      const rest = line.slice(tab + 1).trim();
      if (!char || !rest || [...char].length !== 1) continue;
      const digits = letterCodeToDigits(rest);
      if (digits) entries.push([char, digits]);
    }
    return entries;
  }

  // rime-cantonese chars lines look like: "嘅\tge3\t8%" (char, jyutping, weight%)
  // The weight% here is only a homophone-disambiguation hint (which
  // character to prefer for a given jyutping syllable), NOT a general
  // usage-frequency score — most common characters have no weight at all.
  // We only use this file for jyutping display now; real frequency comes
  // from rime-essay (parseEssay below).
  function parseCantoneseChars(text) {
    const jyutping = new Map(); // char -> jyutping string
    for (const line of text.split('\n')) {
      if (!line || line[0] === '#') continue;
      const cols = line.split('\t');
      if (cols.length < 2) continue;
      const char = cols[0];
      if (!char || [...char].length !== 1) continue;
      if (!jyutping.has(char)) jyutping.set(char, cols[1]);
    }
    return jyutping;
  }

  // rime-cantonese words lines look like: "我哋\tngo5 dei6" (word, jyutping).
  // No frequency column — this is a supplementary colloquial phrase list,
  // not a general corpus, so it's used only to fill in Cantonese-specific
  // continuations that rime-essay (a general written-Chinese corpus) won't
  // have, e.g. 我哋/佢哋/唔該/冇問題.
  function parseCantoneseWords(text) {
    const words = [];
    for (const line of text.split('\n')) {
      if (!line || line[0] === '#') continue;
      const tab = line.indexOf('\t');
      if (tab === -1) continue;
      const word = line.slice(0, tab);
      if ([...word].length >= 2) words.push(word);
    }
    return words;
  }

  // rime-essay lines look like: "我們\t479209" (word, real corpus occurrence
  // count). Used for (a) single-character usage frequency -> ranks stroke
  // candidates by how common the character actually is, and (b) multi-
  // character continuations -> the "related words" bar.
  function parseEssay(text) {
    const charFreq = new Map(); // single char -> count
    const phrases = []; // [word, count] for word.length >= 2
    for (const line of text.split('\n')) {
      const tab = line.indexOf('\t');
      if (tab === -1) continue;
      const word = line.slice(0, tab);
      const count = parseInt(line.slice(tab + 1), 10);
      if (!word || !Number.isFinite(count)) continue;
      const chars = [...word];
      if (chars.length === 1) {
        charFreq.set(word, count);
      } else if (chars.length >= 2 && count > 0) {
        phrases.push([word, count]);
      }
    }
    return { charFreq, phrases };
  }

  // Build leadChar -> [{w: word, f: freq|0, s: 'essay'|'canto'}] so that
  // after committing a character, popup.js can show what usually follows
  // it. essay entries (real frequency) are ranked first per lead char;
  // canto-only entries (colloquial, no frequency signal available) are
  // appended after, shortest first as a weak "more general" proxy.
  function buildAssociationIndex(essayPhrases, cantoWords) {
    const byLead = new Map();

    for (const [word, freq] of essayPhrases) {
      const lead = [...word][0];
      let arr = byLead.get(lead);
      if (!arr) byLead.set(lead, (arr = []));
      arr.push({ w: word, f: freq, s: 'essay' });
    }
    for (const [, arr] of byLead) {
      arr.sort((a, b) => b.f - a.f);
      if (arr.length > ASSOC_ESSAY_PER_LEAD) arr.length = ASSOC_ESSAY_PER_LEAD;
    }

    const cantoByLead = new Map();
    for (const word of cantoWords) {
      const lead = [...word][0];
      let arr = cantoByLead.get(lead);
      if (!arr) cantoByLead.set(lead, (arr = []));
      arr.push(word);
    }
    for (const [lead, cantoArr] of cantoByLead) {
      cantoArr.sort((a, b) => a.length - b.length);
      const essayArr = byLead.get(lead) || [];
      const essayWords = new Set(essayArr.map((e) => e.w));
      let added = 0;
      for (const w of cantoArr) {
        if (added >= ASSOC_CANTO_PER_LEAD) break;
        if (essayWords.has(w)) continue;
        essayArr.push({ w, f: 0, s: 'canto' });
        added++;
      }
      if (added > 0) byLead.set(lead, essayArr);
    }

    return Object.fromEntries(byLead);
  }

  // Keep the CJK Unified Ideographs main block (covers virtually all common
  // Traditional Chinese / Cantonese characters, incl. 嘅/喺/冇/佢/哋/嗰/乜/唔/係)
  // plus anything rime-cantonese explicitly lists (covers rarer Cantonese-only
  // characters like 𡃁 that live outside the main block). This trims
  // rime-stroke's ~170k entries (mostly archaic/rare CJK-Ext characters no
  // Cantonese or Traditional Chinese writer will ever type) down to a set
  // that keeps the in-popup trie build fast without dropping real coverage.
  function isKeptCharacter(char, jyutpingMap) {
    const cp = char.codePointAt(0);
    if (cp >= 0x4e00 && cp <= 0x9fff) return true;
    return jyutpingMap.has(char);
  }

  async function fetchText(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
    return res.text();
  }

  async function buildDictionary(onProgress) {
    const report = (msg) => { if (onProgress) onProgress(msg); };

    report('下載緊 rime-stroke 筆畫字典…');
    const strokeText = await fetchText(STROKE_SOURCE_URL);
    const rawEntries = parseStrokeDict(strokeText);
    if (rawEntries.length === 0) {
      throw new Error('rime-stroke returned no usable entries (format may have changed)');
    }

    let jyutpingMap = new Map();
    try {
      report('下載緊 rime-cantonese 粵拼…');
      const charsText = await fetchText(CANTONESE_CHARS_URL);
      jyutpingMap = parseCantoneseChars(charsText);
    } catch (e) {
      report('粵拼資料下載失敗：' + e.message);
    }

    let cantoWords = [];
    try {
      report('下載緊 rime-cantonese 粵語詞組…');
      const wordsText = await fetchText(CANTONESE_WORDS_URL);
      cantoWords = parseCantoneseWords(wordsText);
    } catch (e) {
      report('粵語詞組下載失敗：' + e.message);
    }

    let charFreq = new Map();
    let essayPhrases = [];
    try {
      report('下載緊 rime-essay 真實用字頻率…');
      const essayText = await fetchText(ESSAY_URL);
      const parsed = parseEssay(essayText);
      charFreq = parsed.charFreq;
      essayPhrases = parsed.phrases;
    } catch (e) {
      report('用字頻率下載失敗，將用預設排序：' + e.message);
    }

    report('整理緊索引…');
    // Keep every valid stroke-order variant for a character (some characters
    // have more than one textbook-accepted stroke sequence) instead of
    // silently picking one, since that mismatch was the root cause of
    // characters being "impossible to find" before.
    const entries = rawEntries
      .filter(([char]) => isKeptCharacter(char, jyutpingMap))
      .map(([char, code]) => ({
        c: char,
        k: code,
        f: charFreq.get(char) || 0,
        j: jyutpingMap.get(char) || ''
      }));

    const assoc = buildAssociationIndex(essayPhrases, cantoWords);

    const meta = {
      strokeSource: 'rime-stroke (CNS11643 全字庫)',
      strokeSourceUrl: STROKE_SOURCE_URL,
      cantoneseSource: 'rime-cantonese (jyut6ping3.chars + .words)',
      cantoneseSourceUrl: CANTONESE_WORDS_URL,
      freqSource: 'rime-essay (真實語料用字/用詞頻率)',
      freqSourceUrl: ESSAY_URL,
      entryCount: entries.length,
      charCount: new Set(entries.map((e) => e.c)).size,
      jyutpingMatched: jyutpingMap.size,
      assocLeadCount: Object.keys(assoc).length,
      updatedAt: new Date().toISOString()
    };

    report(`完成：${meta.charCount} 個字，${meta.entryCount} 組編碼，${meta.assocLeadCount} 個關聯字`);
    return { entries, meta, assoc };
  }

  async function saveDictionary(entries, meta, assoc) {
    await chrome.storage.local.set({
      [STORAGE_KEYS.ENTRIES]: entries,
      [STORAGE_KEYS.META]: meta,
      [STORAGE_KEYS.ASSOC]: assoc || {}
    });
  }

  async function loadDictionary() {
    const data = await chrome.storage.local.get([
      STORAGE_KEYS.ENTRIES,
      STORAGE_KEYS.META,
      STORAGE_KEYS.ASSOC
    ]);
    return {
      entries: data[STORAGE_KEYS.ENTRIES] || [],
      meta: data[STORAGE_KEYS.META] || null,
      assoc: data[STORAGE_KEYS.ASSOC] || {}
    };
  }

  async function refreshDictionary(onProgress) {
    const { entries, meta, assoc } = await buildDictionary(onProgress);
    await saveDictionary(entries, meta, assoc);
    return { entries, meta, assoc };
  }

  global.T5Dict = {
    STORAGE_KEYS,
    parseStrokeDict,
    parseCantoneseChars,
    parseCantoneseWords,
    parseEssay,
    buildAssociationIndex,
    isKeptCharacter,
    buildDictionary,
    saveDictionary,
    loadDictionary,
    refreshDictionary
  };
})(typeof self !== 'undefined' ? self : this);
