(function () {
  'use strict';

  const STROKE_ICONS = { '1': '一', '2': '丨', '3': '丿', '4': '丶', '5': '乙', '6': '＊' };
  const KEY_MAP = { u: '1', i: '2', o: '3', j: '4', k: '5', l: '6' };
  const NUMPAD_MAP = {
    Numpad7: '1', Numpad8: '2', Numpad9: '3',
    Numpad4: '4', Numpad5: '5', Numpad6: '6'
  };
  const USER_DICT_KEY = 't5_user_dict';
  const MAX_RENDER = 80;

  // --- DOM ---
  const $ = (id) => document.getElementById(id);
  const modeBtn = $('mode-btn');
  const copyBtn = $('copy-btn');
  const copyOk = $('copy-ok');
  const settingsBtn = $('settings-btn');
  const floatBtn = $('float-btn');
  const textarea = $('textarea');
  const relatedBar = $('related-bar');
  const candidateBox = $('candidate-box');
  const candStrokes = $('cand-strokes');
  const candCode = $('cand-code');
  const candGrid = $('cand-grid');
  const keyGrid = $('key-grid');
  const settingsOverlay = $('settings-overlay');
  const dictStatus = $('dict-status');
  const dictProgress = $('dict-progress');
  const refreshDictBtn = $('refresh-dict-btn');
  const addWordForm = $('add-word-form');
  const importInput = $('import-dict-input');
  const closeSettingsBtn = $('close-settings-btn');

  // --- State ---
  let isImeMode = true;
  let inputBuffer = '';
  let candidates = [];
  let selectionIndex = 0;
  let userDict = [];
  let dictEntries = []; // {c, k, f, j} from the online dictionary
  let trieRoot = null;
  let assocIndex = {}; // leadChar -> [{w, f, s}] "what usually follows this char"
  let relatedWords = []; // the words currently rendered in the related-bar (for number-key picking)

  // ---------- Key guide ----------
  function buildKeyGuide() {
    keyGrid.innerHTML = '';
    ['1', '2', '3', '4', '5', '6'].forEach((code) => {
      const letter = Object.keys(KEY_MAP).find((k) => KEY_MAP[k] === code) || '?';
      const cell = document.createElement('div');
      cell.className = 'key-cell';
      cell.dataset.code = code;
      cell.innerHTML = `<span class="key-letter">${letter.toUpperCase()}</span><span class="key-stroke">${STROKE_ICONS[code]}</span>`;
      keyGrid.appendChild(cell);
    });
  }

  function flashKey(code) {
    const cell = keyGrid.querySelector(`.key-cell[data-code="${code}"]`);
    if (!cell) return;
    cell.classList.add('active');
    setTimeout(() => cell.classList.remove('active'), 150);
  }

  // ---------- Trie (fast prefix + wildcard lookup over 100k+ entries) ----------
  function buildTrie(entries) {
    const root = { next: {}, chars: [] };
    for (const e of entries) {
      let node = root;
      for (const digit of e.k) {
        node = node.next[digit] || (node.next[digit] = { next: {}, chars: [] });
      }
      node.chars.push(e);
    }
    return root;
  }

  // Collect every entry reachable from `node` (used once we've walked the
  // typed prefix, to gather all longer completions too).
  function collectAll(node, out) {
    for (const e of node.chars) out.push(e);
    for (const k in node.next) collectAll(node.next[k], out);
  }

  function lookup(buffer) {
    // Walk the trie one digit at a time. '6' is a wildcard matching any of 1-5.
    let frontier = [trieRoot];
    for (const digit of buffer) {
      const next = [];
      for (const node of frontier) {
        if (digit === '6') {
          for (const d of ['1', '2', '3', '4', '5']) {
            if (node.next[d]) next.push(node.next[d]);
          }
        } else if (node.next[digit]) {
          next.push(node.next[digit]);
        }
      }
      frontier = next;
      if (frontier.length === 0) return [];
    }
    const out = [];
    for (const node of frontier) collectAll(node, out);
    return out;
  }

  // ---------- Candidate ranking ----------
  // "Recommended / likely" ordering: exact stroke-length matches first, then
  // by Cantonese usage frequency (from rime-cantonese), then shorter codes,
  // then stable order. This is what actually answers "which word did I mean"
  // instead of an arbitrary dictionary-insertion order.
  function rankCandidates(buffer, matches) {
    const sorted = matches.slice().sort((a, b) => {
      const aExact = a.k.length === buffer.length;
      const bExact = b.k.length === buffer.length;
      if (aExact !== bExact) return aExact ? -1 : 1;
      if (b.f !== a.f) return b.f - a.f;
      if (a.k.length !== b.k.length) return a.k.length - b.k.length;
      return 0;
    });
    const seen = new Set();
    const unique = [];
    for (const m of sorted) {
      if (!seen.has(m.c)) {
        seen.add(m.c);
        unique.push(m);
      }
    }
    return unique;
  }

  function updateCandidates() {
    relatedBar.style.display = 'none'; // composing a stroke code now — hand the UI to the candidate box
    if (!inputBuffer) {
      candidates = [];
      candidateBox.style.display = 'none';
      refreshRelatedBar();
      return;
    }
    const matches = trieRoot ? lookup(inputBuffer) : [];
    candidates = rankCandidates(inputBuffer, matches);
    selectionIndex = 0;
    renderCandidates();
  }

  function renderCandidates() {
    candidateBox.style.display = 'flex';
    candStrokes.textContent = inputBuffer.split('').map((c) => STROKE_ICONS[c] || c).join('');
    candCode.textContent = inputBuffer;
    candGrid.innerHTML = '';

    if (candidates.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'grid-column:1/-1;text-align:center;color:#94a3b8;font-size:11px;padding:8px;';
      empty.textContent = dictEntries.length === 0
        ? '字典未載入 — 請去設定下載'
        : '無配對 No match';
      candGrid.appendChild(empty);
      return;
    }

    candidates.slice(0, MAX_RENDER).forEach((c, idx) => {
      const btn = document.createElement('button');
      btn.className = 'cand-btn' + (idx === selectionIndex ? ' sel' : '') + (idx === 0 ? ' top' : '');
      btn.innerHTML = `<span class="cand-char">${c.c}</span>` +
        (c.j ? `<span class="cand-jyut">${c.j}</span>` : '') +
        (idx < 9 ? `<span class="cand-num">${idx + 1}</span>` : '');
      btn.addEventListener('mousedown', (e) => e.preventDefault()); // keep textarea focus
      btn.addEventListener('click', () => commitChar(c.c));
      candGrid.appendChild(btn);
    });
  }

  // ---------- Commit / editing ----------
  function insertAtCursor(str) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const val = textarea.value;
    textarea.value = val.slice(0, start) + str + val.slice(end);
    const pos = start + str.length;
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = pos;
  }

  function commitChar(char) {
    insertAtCursor(char);
    inputBuffer = '';
    candidates = [];
    candidateBox.style.display = 'none';
    refreshRelatedBar();
  }

  // ---------- Related words ("what usually comes after this character") ----------
  // e.g. after committing 我, suggest 我們/我的/我是/... (ranked by real corpus
  // frequency) as well as Cantonese-only continuations like 我哋 that a
  // general-Chinese corpus wouldn't have. Clicking a chip inserts only the
  // remaining characters, since the lead character is already on screen.
  function refreshRelatedBar() {
    if (inputBuffer) { relatedBar.style.display = 'none'; return; } // mid-stroke, candidate box owns the UI
    const pos = textarea.selectionStart;
    const leadChar = pos > 0 ? [...textarea.value.slice(0, pos)].pop() : null;
    const words = leadChar ? assocIndex[leadChar] : null;

    if (!words || words.length === 0) {
      relatedWords = [];
      relatedBar.style.display = 'none';
      relatedBar.innerHTML = '';
      return;
    }

    relatedWords = words.slice(0, 9); // capped to 9 so every chip has a number key
    relatedBar.innerHTML = '';
    relatedBar.style.display = 'flex';

    const label = document.createElement('span');
    label.className = 'related-label';
    label.textContent = '關聯:';
    relatedBar.appendChild(label);

    relatedWords.forEach((entry, idx) => {
      const rest = [...entry.w].slice(1).join('');
      const btn = document.createElement('button');
      btn.className = 'related-btn' + (entry.s === 'canto' ? ' canto' : '');
      btn.innerHTML = `<span class="related-num">${idx + 1}</span>${rest}`;
      btn.title = (entry.s === 'canto'
        ? `${entry.w}　粵語口語詞 (無頻率數據)`
        : `${entry.w}　語料出現 ${entry.f.toLocaleString()} 次`);
      btn.addEventListener('mousedown', (e) => e.preventDefault());
      btn.addEventListener('click', () => selectRelatedWord(idx));
      relatedBar.appendChild(btn);
    });
  }

  function selectRelatedWord(idx) {
    const entry = relatedWords[idx];
    if (!entry) return;
    const rest = [...entry.w].slice(1).join('');
    insertAtCursor(rest);
    refreshRelatedBar(); // chain: suggest what follows the word just completed
  }

  async function copyAndClear() {
    if (!textarea.value) return;
    try {
      await navigator.clipboard.writeText(textarea.value);
      textarea.value = '';
      copyOk.style.opacity = '1';
      setTimeout(() => (copyOk.style.opacity = '0'), 1500);
    } catch (err) {
      alert('複製失敗 Failed to copy: ' + err.message);
    }
  }

  // ---------- Keyboard handling ----------
  function setImeMode(on) {
    isImeMode = on;
    modeBtn.textContent = isImeMode ? '中 T5' : 'EN';
    modeBtn.className = 'mode-btn ' + (isImeMode ? 'mode-on' : 'mode-off');
  }

  function handleKeyDown(e) {
    // Don't hijack keystrokes meant for the settings form (add-word inputs,
    // file picker, etc.) — only drive the IME while the editor has focus.
    if (document.activeElement !== textarea) return;

    const key = e.key.toLowerCase();

    if (key === 'shift' && !e.repeat) {
      setImeMode(!isImeMode);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && key === 'enter') {
      e.preventDefault();
      copyAndClear();
      return;
    }
    if (!isImeMode) return;

    if (e.location === 3 && NUMPAD_MAP[e.code]) {
      e.preventDefault();
      inputBuffer += NUMPAD_MAP[e.code];
      flashKey(NUMPAD_MAP[e.code]);
      updateCandidates();
      return;
    }

    if (KEY_MAP.hasOwnProperty(key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      inputBuffer += KEY_MAP[key];
      flashKey(KEY_MAP[key]);
      updateCandidates();
      return;
    }

    if (inputBuffer.length > 0) {
      if (key === 'backspace') {
        e.preventDefault();
        inputBuffer = inputBuffer.slice(0, -1);
        updateCandidates();
      } else if (key === 'escape') {
        e.preventDefault();
        inputBuffer = '';
        candidates = [];
        candidateBox.style.display = 'none';
        refreshRelatedBar();
      } else if (key === ' ' || key === 'enter') {
        e.preventDefault();
        if (candidates.length > 0) commitChar(candidates[selectionIndex].c);
      } else if (key === 'arrowdown' || key === '=') {
        e.preventDefault();
        selectionIndex = Math.min(selectionIndex + 1, candidates.length - 1);
        renderCandidates();
      } else if (key === 'arrowup' || key === '-') {
        e.preventDefault();
        selectionIndex = Math.max(selectionIndex - 1, 0);
        renderCandidates();
      } else if (/^[1-9]$/.test(key) && e.location !== 3) {
        e.preventDefault();
        const idx = parseInt(key, 10) - 1;
        if (idx < candidates.length) commitChar(candidates[idx].c);
      }
    } else if (relatedWords.length > 0) {
      // Not mid-stroke, but the related-word bar has suggestions — number
      // keys pick them, same as the candidate box does while composing.
      // Esc dismisses the bar so 1-9 go back to typing literal digits.
      if (key === 'escape') {
        e.preventDefault();
        relatedWords = [];
        relatedBar.style.display = 'none';
      } else if (/^[1-9]$/.test(key) && e.location !== 3) {
        e.preventDefault();
        selectRelatedWord(parseInt(key, 10) - 1);
      }
    }
  }

  // ---------- Dictionary loading / settings ----------
  function formatMeta(meta) {
    if (!meta) return '未有字典 — 撳「更新字典」落載。No dictionary yet — click "Update dictionary".';
    const when = new Date(meta.updatedAt).toLocaleString('zh-HK');
    return [
      `${meta.charCount} 字 / ${meta.entryCount} 組編碼 (連自訂 ${userDict.length})`,
      `來源: rime-stroke + rime-cantonese + rime-essay`,
      `粵拼覆蓋: ${meta.jyutpingMatched} 字　關聯字: ${meta.assocLeadCount}`,
      `更新於: ${when}`
    ].join('\n');
  }

  function rebuildFullDictionary() {
    trieRoot = buildTrie(dictEntries.concat(userDict));
  }

  async function loadUserDict() {
    const data = await chrome.storage.local.get([USER_DICT_KEY]);
    userDict = data[USER_DICT_KEY] || [];
  }

  async function saveUserDict() {
    await chrome.storage.local.set({ [USER_DICT_KEY]: userDict });
  }

  async function loadDictionaryIntoMemory() {
    const { entries, meta, assoc } = await T5Dict.loadDictionary();
    dictEntries = entries;
    assocIndex = assoc || {};
    rebuildFullDictionary();
    dictStatus.textContent = formatMeta(meta);
    return meta;
  }

  async function refreshDictionaryNow() {
    refreshDictBtn.disabled = true;
    try {
      const { meta } = await T5Dict.refreshDictionary((msg) => {
        dictProgress.textContent = msg;
      });
      const loaded = await T5Dict.loadDictionary();
      dictEntries = loaded.entries;
      assocIndex = loaded.assoc || {};
      rebuildFullDictionary();
      dictStatus.textContent = formatMeta(meta);
      dictProgress.textContent = '✓ 完成';
      setTimeout(() => (dictProgress.textContent = ''), 3000);
    } catch (e) {
      dictProgress.textContent = '失敗 Failed: ' + e.message;
    } finally {
      refreshDictBtn.disabled = false;
    }
  }

  // ---------- Wiring ----------
  function wireEvents() {
    document.body.addEventListener('keydown', handleKeyDown);
    // Keep the related-word bar in sync with wherever the cursor actually is —
    // covers EN-mode typing, pasting, and clicking/arrowing around the text,
    // not just IME commits (setting textarea.value in JS doesn't fire 'input').
    textarea.addEventListener('input', refreshRelatedBar);
    textarea.addEventListener('click', refreshRelatedBar);
    textarea.addEventListener('keyup', (e) => {
      if (e.key.startsWith('Arrow') || e.key === 'Home' || e.key === 'End') refreshRelatedBar();
    });
    modeBtn.addEventListener('click', () => setImeMode(!isImeMode));
    copyBtn.addEventListener('click', copyAndClear);

    floatBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'openFloating' });
      // In the anchored toolbar popup, clicking anything that isn't inside
      // it causes Chrome to close it anyway once the new window takes
      // focus — nothing extra to do here.
    });

    settingsBtn.addEventListener('click', () => {
      settingsOverlay.style.display = 'flex';
      refreshDictBtn.focus(); // move focus off the textarea so IME keys don't leak into the panel
      loadDictionaryIntoMemory();
    });
    closeSettingsBtn.addEventListener('click', () => {
      settingsOverlay.style.display = 'none';
      textarea.focus();
    });
    refreshDictBtn.addEventListener('click', refreshDictionaryNow);

    addWordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const char = e.target.char.value.trim();
      const code = e.target.code.value.trim();
      if (!char || !/^[1-5]+$/.test(code)) return;
      userDict.push({ c: char, k: code, f: 999, j: '' }); // rank custom words high
      await saveUserDict();
      rebuildFullDictionary();
      dictStatus.textContent = formatMeta((await T5Dict.loadDictionary()).meta);
      e.target.reset();
    });

    importInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const json = JSON.parse(ev.target.result);
          if (!Array.isArray(json)) throw new Error('Expected a JSON array');
          const normalised = json
            .filter((w) => w && w.char && /^[1-5]+$/.test(w.code || ''))
            .map((w) => ({ c: w.char, k: w.code, f: 500, j: w.jyutping || '' }));
          userDict = userDict.concat(normalised);
          await saveUserDict();
          rebuildFullDictionary();
          alert(`已加入 ${normalised.length} 個自訂字`);
        } catch (err) {
          alert('JSON 格式錯誤: ' + err.message);
        }
      };
      reader.readAsText(file);
    });
  }

  function applyFloatingModeUi() {
    const isFloating = new URLSearchParams(location.search).get('floating') === '1';
    if (isFloating) {
      // Already the pinned/floating window — the button to open another
      // one would just be confusing, so hide it and let the title say so.
      floatBtn.style.display = 'none';
      document.querySelector('.header-title').textContent = 'T5 筆畫輸入 📌';
    }
  }

  async function init() {
    buildKeyGuide();
    setImeMode(true);
    applyFloatingModeUi();
    wireEvents();
    textarea.focus();

    await loadUserDict();
    const meta = await loadDictionaryIntoMemory();
    if (!meta) {
      // First run: kick off a download right away instead of leaving the
      // user stuck typing strokes into an empty dictionary.
      dictStatus.textContent = '首次使用，下載緊字典…';
      await refreshDictionaryNow();
    }
    refreshRelatedBar();
  }

  init();
})();
