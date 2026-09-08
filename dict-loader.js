// Shared dictionary pipeline — used by both background.js and popup.js.
// There is NO hard-coded word list in this extension. Every character/code
// comes from two verified open-source projects, fetched at runtime:
//
//   1. rime-stroke   — stroke codes (h/s/p/n/z -> 橫/直/撇/點/折 -> 1-5).
//                       Source data: Taiwan's official CNS11643 全字庫.
//                       https://github.com/rime/rime-stroke
//   2. rime-cantonese — Cantonese character/word frequency + jyutping.
//                       Used only to rank candidates and show pronunciation,
//                       not for stroke codes.
//                       https://github.com/rime/rime-cantonese
//
// rime-stroke's own data already includes Cantonese-specific characters
// (係/唔/嘅/喺/佢/哋/嗰/冇/...) because CNS11643 covers them, so no separate
// "Cantonese stroke" source is needed.

(function (global) {
  const STROKE_SOURCE_URL =
    'https://raw.githubusercontent.com/rime/rime-stroke/master/stroke.dict.yaml';
  const CANTONESE_FREQ_URL =
    'https://raw.githubusercontent.com/rime/rime-cantonese/main/jyut6ping3.chars.dict.yaml';

  const LETTER_TO_DIGIT = { h: '1', s: '2', p: '3', n: '4', z: '5' };

  const STORAGE_KEYS = {
    ENTRIES: 't5_dict_entries',
    META: 't5_dict_meta'
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

  // rime-cantonese lines look like: "嘅\tge3\t8%"  (char, jyutping, weight%)
  function parseCantoneseFreq(text) {
    const freq = new Map(); // char -> { weight, jyutping }
    for (const line of text.split('\n')) {
      if (!line || line[0] === '#') continue;
      const cols = line.split('\t');
      if (cols.length < 2) continue;
      const char = cols[0];
      if (!char || [...char].length !== 1) continue;
      let weight = 0;
      if (cols[2] && cols[2].endsWith('%')) weight = parseFloat(cols[2]) || 0;
      const prev = freq.get(char);
      if (!prev || weight > prev.weight) {
        freq.set(char, { weight, jyutping: cols[1] });
      }
    }
    return freq;
  }

  // Keep the CJK Unified Ideographs main block (covers virtually all common
  // Traditional Chinese / Cantonese characters, incl. 嘅/喺/冇/佢/哋/嗰/乜/唔/係)
  // plus anything rime-cantonese explicitly lists (covers rarer Cantonese-only
  // characters like 𡃁 that live outside the main block). This trims
  // rime-stroke's ~170k entries (mostly archaic/rare CJK-Ext characters no
  // Cantonese or Traditional Chinese writer will ever type) down to a set
  // that keeps the in-popup trie build fast without dropping real coverage.
  function isKeptCharacter(char, freqMap) {
    const cp = char.codePointAt(0);
    if (cp >= 0x4e00 && cp <= 0x9fff) return true;
    return freqMap.has(char);
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

    let freq = new Map();
    try {
      report('下載緊 rime-cantonese 詞頻同粵拼…');
      const freqText = await fetchText(CANTONESE_FREQ_URL);
      freq = parseCantoneseFreq(freqText);
    } catch (e) {
      report('粵語詞頻下載失敗，將用預設排序：' + e.message);
    }

    report('整理緊索引…');
    // Keep every valid stroke-order variant for a character (some characters
    // have more than one textbook-accepted stroke sequence) instead of
    // silently picking one, since that mismatch was the root cause of
    // characters being "impossible to find" before.
    const entries = rawEntries
      .filter(([char]) => isKeptCharacter(char, freq))
      .map(([char, code]) => {
        const f = freq.get(char);
        return { c: char, k: code, f: f ? f.weight : 0, j: f ? f.jyutping : '' };
      });

    const meta = {
      strokeSource: 'rime-stroke (CNS11643 全字庫)',
      strokeSourceUrl: STROKE_SOURCE_URL,
      freqSource: 'rime-cantonese (jyut6ping3.chars)',
      freqSourceUrl: CANTONESE_FREQ_URL,
      entryCount: entries.length,
      charCount: new Set(entries.map((e) => e.c)).size,
      cantoneseMatched: freq.size,
      updatedAt: new Date().toISOString()
    };

    report(`完成：${meta.charCount} 個字，${meta.entryCount} 組編碼`);
    return { entries, meta };
  }

  async function saveDictionary(entries, meta) {
    await chrome.storage.local.set({
      [STORAGE_KEYS.ENTRIES]: entries,
      [STORAGE_KEYS.META]: meta
    });
  }

  async function loadDictionary() {
    const data = await chrome.storage.local.get([STORAGE_KEYS.ENTRIES, STORAGE_KEYS.META]);
    return {
      entries: data[STORAGE_KEYS.ENTRIES] || [],
      meta: data[STORAGE_KEYS.META] || null
    };
  }

  async function refreshDictionary(onProgress) {
    const { entries, meta } = await buildDictionary(onProgress);
    await saveDictionary(entries, meta);
    return { entries, meta };
  }

  global.T5Dict = {
    STORAGE_KEYS,
    parseStrokeDict,
    parseCantoneseFreq,
    isKeptCharacter,
    buildDictionary,
    saveDictionary,
    loadDictionary,
    refreshDictionary
  };
})(typeof self !== 'undefined' ? self : this);
