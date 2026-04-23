'use strict';

const STROKE_ICONS = { '1':'一', '2':'丨', '3':'丿', '4':'丶', '5':'乙', '6':'*' };
const KEY_MAP = { 'u':'1', 'i':'2', 'o':'3', 'j':'4', 'k':'5', 'l':'6' };
const KEY_LABELS = { '1':'U', '2':'I', '3':'O', '4':'J', '5':'K', '6':'L' };

const INITIAL_DICTIONARY = [
    {char:'係',code:'323554234'},{char:'唔',code:'2511251251'},
    {char:'嘅',code:'25151154'},{char:'喺',code:'2513554234'},
    {char:'佢',code:'322511'},{char:'哋',code:'251525211'},
    {char:'嗰',code:'25125125111234'},{char:'嚟',code:'25131234342534'},
    {char:'咁',code:'25112211'},{char:'噉',code:'25112211134'},
    {char:'乜',code:'55'},{char:'嘢',code:'25125112154523'},
    {char:'睇',code:'2511143515'},{char:'畀',code:'25121'},
    {char:'諗',code:'4511251344544'},{char:'冇',code:'132511'},
    {char:'𡃁',code:'25112511135'},{char:'搵',code:'311225221'},
    {char:'攞',code:'31122522131234'},{char:'點',code:'2112512514444'},
    {char:'攰',code:'125453'},{char:'呃',code:'2511355'},
    {char:'一',code:'1'},{char:'二',code:'11'},{char:'三',code:'111'},
    {char:'四',code:'25351'},{char:'五',code:'1251'},{char:'六',code:'4134'},
    {char:'七',code:'151'},{char:'八',code:'34'},{char:'九',code:'35'},
    {char:'十',code:'12'},{char:'百',code:'132511'},{char:'千',code:'312'},
    {char:'萬',code:'12225112534'},{char:'零',code:'14524444'},
    {char:'億',code:'324143125114544'},
    {char:'我',code:'3121534'},{char:'你',code:'3235234'},
    {char:'他',code:'32525'},{char:'她',code:'531525'},
    {char:'它',code:'44535'},{char:'們',code:'3225112511'},
    {char:'自',code:'325111'},{char:'己',code:'515'},
    {char:'誰',code:'411125132411121'},
    {char:'人',code:'34'},{char:'民',code:'51515'},
    {char:'是',code:'251112134'},{char:'有',code:'132511'},
    {char:'做',code:'32122513134'},{char:'去',code:'12154'},
    {char:'來',code:'1431234'},{char:'食',code:'344511534'},
    {char:'飲',code:'3445113534'},{char:'講',code:'4111251112211'},
    {char:'說',code:'411125143251'},{char:'看',code:'311325111'},
    {char:'見',code:'2511135'},{char:'買',code:'252212511134'},
    {char:'賣',code:'1254252212511134'},{char:'行',code:'332112'},
    {char:'走',code:'1212134'},{char:'跑',code:'251212135515'},
    {char:'想',code:'1234251114544'},{char:'要',code:'125221531'},
    {char:'會',code:'34112432511'},{char:'知',code:'31134251'},
    {char:'識',code:'4111251414312511534'},{char:'玩',code:'11211135'},
    {char:'愛',code:'3443451354'},{char:'喜',code:'121251431251'},
    {char:'歡',code:'1221251324111213534'},{char:'打',code:'31112'},
    {char:'開',code:'11221132'},{char:'關',code:'444455132511134'},
    {char:'問',code:'42512511'},{char:'回',code:'252511'},
    {char:'車',code:'1251112'},{char:'屋',code:'51315412154'},
    {char:'水',code:'2534'},{char:'火',code:'4334'},
    {char:'飯',code:'3445113354'},{char:'錢',code:'341124311534'},
    {char:'手',code:'3112'},{char:'口',code:'251'},
    {char:'心',code:'4544'},{char:'頭',code:'412125143132511134'},
    {char:'學',code:'321134521'},{char:'校',code:'12344134'},
    {char:'家',code:'4451353334'},{char:'國',code:'25125115341'},
    {char:'文',code:'4134'},{char:'字',code:'445521'},
    {char:'名',code:'354251'},{char:'書',code:'511212511'},
    {char:'電',code:'145244445'},{char:'腦',code:'3511415525121'},
    {char:'機',code:'123455413434'},{char:'工',code:'121'},
    {char:'作',code:'3231211'},{char:'業',code:'2243143111234'},
    {char:'商',code:'41432534251'},{char:'店',code:'41321251'},
    {char:'好',code:'531521'},{char:'大',code:'134'},
    {char:'小',code:'234'},{char:'多',code:'354354'},
    {char:'少',code:'2343'},{char:'靚',code:'112125111352511135'},
    {char:'快',code:'4425134'},{char:'慢',code:'44225112522154'},
    {char:'新',code:'4143112343312'},{char:'舊',code:'122324111212511'},
    {char:'早',code:'251112'},{char:'晚',code:'25113525135'},
    {char:'美',code:'431121134'},{char:'高',code:'4125125251'},
    {char:'低',code:'3235251'},{char:'長',code:'311534'},
    {char:'短',code:'311341251431'},{char:'遠',code:'12125132454'},
    {char:'近',code:'3312454'},{char:'難',code:'1221251132411121'},
    {char:'易',code:'25113533'},
    {char:'的',code:'32511354'},{char:'了',code:'52'},
    {char:'和',code:'31234251'},{char:'與',code:'321115'},
    {char:'以',code:'5434'},{char:'在',code:'132121'},
    {char:'就',code:'412512341354'},{char:'都',code:'1213251152'},
    {char:'而',code:'132522'},{char:'但',code:'3225111'},
    {char:'個',code:'3225122511'},{char:'這',code:'4111251454'},
    {char:'那',code:'511352'},{char:'把',code:'3115215'},
    {char:'被',code:'4523453254'},{char:'讓',code:'41112511251125211'},
    {char:'給',code:'55441341251'},{char:'並',code:'431132'},
    {char:'日',code:'2511'},{char:'月',code:'3511'},
    {char:'年',code:'311212'},{char:'時',code:'2511121124'},
    {char:'今',code:'3445'},{char:'明',code:'25113511'},
    {char:'天',code:'1134'},{char:'地',code:'121525'},
    {char:'現',code:'11212511135'},{char:'場',code:'12125113533'},
    {char:'所',code:'335123312'},{char:'處',code:'21531535'},
    {char:'金',code:'34112431'},{char:'木',code:'1234'},
    {char:'土',code:'121'},{char:'風',code:'353251214'},
    {char:'雨',code:'12524444'},{char:'山',code:'252'},
    {char:'海',code:'4413155414'},{char:'河',code:'44112512'},
    {char:'公',code:'3454'},{char:'共',code:'122134'},
    {char:'同',code:'251251'},{char:'社',code:'4524121'},
    {char:'情',code:'44211212511'},{char:'理',code:'1121251121'},
    {char:'事',code:'12515112'},{char:'實',code:'445445251134'},
    {char:'體',code:'321134251221121'},{char:'然',code:'35441344444'},
    {char:'後',code:'33255452'},{char:'最',code:'251112211154'},
    {char:'因',code:'251341'},{char:'果',code:'25111234'},
    {char:'意',code:'4143125114544'},{char:'思',code:'251214544'},
    {char:'感',code:'1312515344544'}
];

const RELATED_WORDS = {
    '我': ['們','的','係','唔','想','去','喺','知','好','都','哋'],
    '你': ['好','們','的','係','喺','去','知','想','都','哋'],
    '佢': ['哋','係','喺','去','唔','話','知','都','的'],
    '係': ['咁','唔','都','就','啲','嘅'],
    '唔': ['係','知','好','想','去','講','識','見'],
    '好': ['嘅','靚','快','大','小','多','人','玩','似'],
    '嘅': ['嗰','時','人','事','嘢'],
    '哋': ['係','喺','去','唔','都'],
    '喺': ['度','邊','嘅','呢'],
    '咁': ['嘅','多','大','好','快','先','做'],
    '都': ['係','唔','好','可','要','話'],
    '就': ['係','咁','算','去'],
    '食': ['飯','嘢','水','咗','過'],
    '飲': ['水','嘢','咗'],
    '去': ['嘅','咗','先','邊','咁','到','做'],
    '嚟': ['嘅','咗','先','過','到'],
    '講': ['嘢','嘅','咗','到','過','吓'],
    '知': ['道','唔','嘅','咗','到'],
    '想': ['食','去','做','買','嘅','到','知'],
    '買': ['嘢','嘅','咗','到'],
    '做': ['嘢','嘅','咗','到','人'],
    '睇': ['嘢','書','戲','吓'],
    '玩': ['嘢','吓','緊'],
    '學': ['嘢','校','習','識'],
    '行': ['路','嘅','咗','先'],
    '工': ['作','人','廠','資','夫'],
    '日': ['本','文','期','子','時','光'],
    '月': ['亮','份','球','光'],
    '年': ['代','份','輕','青','初'],
    '家': ['人','庭','裡','長','嘅'],
    '電': ['腦','話','視','影','子','郵'],
    '手': ['機','錶','工','藝'],
    '車': ['站','廂','票','行'],
    '人': ['家','們','民','生','情','員'],
    '大': ['家','學','人','小','聲'],
    '小': ['心','朋','學','時','聲'],
    '心': ['理','情','地','思','水'],
    '時': ['間','代','候','光','常'],
    '地': ['方','上','下','球','址','區'],
    '國': ['家','際','內','外','語'],
    '文': ['字','化','章','件','學'],
    '錢': ['包','財','幣'],
    '水': ['果','份','平','準'],
    '火': ['車','山','災'],
    '風': ['景','水','光','雨'],
    '書': ['本','店','包'],
    '一': ['個','次','定','起','百','千'],
    '二': ['個','次','十','百'],
    '三': ['個','次','十','百'],
    '今': ['日','年','次','晚'],
    '明': ['日','年','白','天'],
    '早': ['上','晨','咗'],
    '晚': ['上','間','咗'],
    '天': ['氣','色','空'],
    '嗰': ['個','件','度','時','陣'],
    '嘢': ['食','飲','買','做'],
    '啲': ['嘢','人','時'],
    '多': ['嘅','啲','謝'],
    '少': ['嘅','啲'],
    '快': ['嘅','啲','速'],
    '慢': ['嘅','啲'],
    '新': ['嘅','年','式'],
    '舊': ['嘅','年','式'],
    '有': ['啲','嘅','冇','錢','時'],
    '冇': ['嘅','啲','錢','時','問'],
};

let inputBuffer = '', candidates = [], selIdx = 0, userDict = [];
let isImeMode = true, relatedWords = [], activeKey = null;
let $textarea, $candBox, $candStrokes, $candCode, $candGrid;
let $relatedBar, $modeBtn, $copyOk, $keyGrid;

function fullDict() { return [...INITIAL_DICTIONARY, ...userDict]; }
function bufferToStrokes(buf) { return buf.split('').map(c => STROKE_ICONS[c] || c).join(''); }

function computeCandidates() {
    if (!inputBuffer) { candidates = []; return; }
    try {
        const pat = new RegExp('^' + inputBuffer.replace(/6/g, '[1-5]'));
        const matches = fullDict().filter(e => pat.test(e.code));
        matches.sort((a, b) => {
            const ae = a.code.length === inputBuffer.length;
            const be = b.code.length === inputBuffer.length;
            if (ae && !be) return -1;
            if (!ae && be) return 1;
            return a.code.length - b.code.length;
        });
        const seen = new Set();
        candidates = [];
        matches.forEach(m => { if (!seen.has(m.char)) { seen.add(m.char); candidates.push(m); } });
        selIdx = 0;
    } catch (_) { candidates = []; }
}

function commitChar(char) {
    const s = $textarea.selectionStart, e = $textarea.selectionEnd, v = $textarea.value;
    $textarea.value = v.substring(0, s) + char + v.substring(e);
    const newPos = s + char.length;
    setTimeout(() => { $textarea.focus(); $textarea.setSelectionRange(newPos, newPos); }, 0);
    inputBuffer = ''; candidates = []; selIdx = 0;
    relatedWords = RELATED_WORDS[char] || RELATED_WORDS[char[char.length - 1]] || [];
    render(); saveState();
}

function renderModeBtn() {
    $modeBtn.textContent = isImeMode ? '中 T5' : 'EN';
    $modeBtn.className = 'mode-btn ' + (isImeMode ? 'mode-on' : 'mode-off');
}

function renderCandidateBox() {
    if (!inputBuffer) { $candBox.style.display = 'none'; return; }
    $candBox.style.display = 'flex';
    $candStrokes.textContent = bufferToStrokes(inputBuffer);
    $candCode.textContent = inputBuffer;
    $candGrid.innerHTML = '';
    const slice = candidates.slice(0, 60);
    if (slice.length === 0) {
        const msg = document.createElement('div');
        msg.style.cssText = 'grid-column:1/-1;text-align:center;color:#94a3b8;font-size:12px;padding:8px';
        msg.textContent = '無符合字';
        $candGrid.appendChild(msg);
        return;
    }
    slice.forEach((c, i) => {
        const btn = document.createElement('button');
        btn.className = 'cand-btn' + (i === selIdx ? ' sel' : '');
        btn.textContent = c.char;
        if (i < 9) {
            const num = document.createElement('span');
            num.className = 'cand-num'; num.textContent = i + 1;
            btn.appendChild(num);
        }
        btn.addEventListener('mousedown', ev => ev.preventDefault());
        btn.addEventListener('click', () => commitChar(c.char));
        $candGrid.appendChild(btn);
    });
}

function renderRelatedBar() {
    if (!relatedWords.length || inputBuffer) { $relatedBar.style.display = 'none'; return; }
    $relatedBar.style.display = 'flex';
    $relatedBar.innerHTML = '<span class="related-label">相關：</span>';
    relatedWords.forEach(w => {
        const btn = document.createElement('button');
        btn.className = 'related-btn'; btn.textContent = w;
        btn.addEventListener('mousedown', ev => ev.preventDefault());
        btn.addEventListener('click', () => commitChar(w));
        $relatedBar.appendChild(btn);
    });
}

function renderKeyGrid() {
    $keyGrid.innerHTML = '';
    ['1','2','3','4','5','6'].forEach(code => {
        const cell = document.createElement('div');
        cell.className = 'key-cell' + (activeKey === code ? ' active' : '');
        const letter = document.createElement('span');
        letter.className = 'key-letter'; letter.textContent = KEY_LABELS[code];
        const stroke = document.createElement('span');
        stroke.className = 'key-stroke'; stroke.textContent = STROKE_ICONS[code];
        cell.appendChild(letter); cell.appendChild(stroke);
        $keyGrid.appendChild(cell);
    });
}

function render() { renderModeBtn(); renderCandidateBox(); renderRelatedBar(); renderKeyGrid(); }

function handleKeyDown(e) {
    const key = e.key.toLowerCase();
    if (key === 'shift' && !e.repeat) { isImeMode = !isImeMode; render(); return; }
    if ((e.ctrlKey || e.metaKey) && key === 'enter') { e.preventDefault(); copyAndClear(); return; }
    if (!isImeMode) return;
    if (e.location === 3) {
        const nm = {Numpad7:'1',Numpad8:'2',Numpad9:'3',Numpad4:'4',Numpad5:'5',Numpad6:'6'};
        if (nm[e.code]) { e.preventDefault(); flashKey(nm[e.code]); inputBuffer += nm[e.code]; computeCandidates(); render(); return; }
    }
    if (KEY_MAP[key] && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault(); flashKey(KEY_MAP[key]); inputBuffer += KEY_MAP[key]; computeCandidates(); render(); return;
    }
    if (inputBuffer.length > 0) {
        if (key === 'backspace') { e.preventDefault(); inputBuffer = inputBuffer.slice(0, -1); computeCandidates(); render(); }
        else if (key === 'escape') { e.preventDefault(); inputBuffer = ''; candidates = []; render(); }
        else if (key === ' ' || key === 'enter') { e.preventDefault(); if (candidates.length > 0) commitChar(candidates[selIdx].char); }
        else if (key === 'arrowdown' || key === '=') { e.preventDefault(); selIdx = Math.min(selIdx + 1, candidates.length - 1); renderCandidateBox(); }
        else if (key === 'arrowup' || key === '-') { e.preventDefault(); selIdx = Math.max(selIdx - 1, 0); renderCandidateBox(); }
        else if (/^[1-9]$/.test(key) && e.location !== 3) { e.preventDefault(); const i = parseInt(key) - 1; if (i < candidates.length) commitChar(candidates[i].char); }
    }
}

function flashKey(code) { activeKey = code; renderKeyGrid(); setTimeout(() => { activeKey = null; renderKeyGrid(); }, 150); }

async function copyAndClear() {
    const val = $textarea.value;
    if (!val) return;
    try { await navigator.clipboard.writeText(val); } catch (_) { $textarea.select(); document.execCommand('copy'); }
    $textarea.value = ''; relatedWords = []; render(); saveState();
    $copyOk.style.opacity = '1'; setTimeout(() => { $copyOk.style.opacity = '0'; }, 1600);
}

function saveState() {
    const data = { composedText: $textarea.value, userDict };
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) chrome.storage.local.set(data);
    else try { localStorage.setItem('t5state', JSON.stringify(data)); } catch(_) {}
}

function loadState(cb) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['composedText','userDict'], data => {
            if (data.composedText) $textarea.value = data.composedText;
            if (Array.isArray(data.userDict)) userDict = data.userDict;
            cb();
        });
    } else {
        try { const d = JSON.parse(localStorage.getItem('t5state') || '{}'); if (d.composedText) $textarea.value = d.composedText; if (Array.isArray(d.userDict)) userDict = d.userDict; } catch(_) {}
        cb();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    $textarea = document.getElementById('textarea');
    $candBox = document.getElementById('candidate-box');
    $candStrokes = document.getElementById('cand-strokes');
    $candCode = document.getElementById('cand-code');
    $candGrid = document.getElementById('cand-grid');
    $relatedBar = document.getElementById('related-bar');
    $modeBtn = document.getElementById('mode-btn');
    $copyOk = document.getElementById('copy-ok');
    $keyGrid = document.getElementById('key-grid');
    $modeBtn.addEventListener('click', () => { isImeMode = !isImeMode; render(); });
    document.getElementById('copy-btn').addEventListener('click', copyAndClear);
    document.addEventListener('keydown', handleKeyDown);
    $textarea.addEventListener('input', saveState);
        // Settings modal
    const $settingsModal = document.getElementById('settings-modal');
    document.getElementById('settings-btn').addEventListener('click', () => {
        $settingsModal.style.display = 'flex';
    });
    document.getElementById('settings-close').addEventListener('click', () => {
        $settingsModal.style.display = 'none';
    });

    // RIME dictionary download
    document.getElementById('rime-btn').addEventListener('click', async () => {
        const btn = document.getElementById('rime-btn');
        const status = document.getElementById('rime-status');
        btn.textContent = '下載中…'; btn.disabled = true;
        status.textContent = '';
        try {
            const res = await fetch('https://raw.githubusercontent.com/rime/rime-stroke/master/stroke.dict.yaml');
            if (!res.ok) throw new Error('Network error');
            const lines = (await res.text()).split('\n');
            const entries = [];
            for (const line of lines) {
                if (!line || line.startsWith('#') || line.startsWith('---')) continue;
                const parts = line.split('\t');
                if (parts.length >= 2) {
                    let numCode = '';
                    for (const c of parts[1].trim()) {
                        if (c==='h') numCode+='1'; else if (c==='s') numCode+='2';
                        else if (c==='p') numCode+='3'; else if (c==='n') numCode+='4';
                        else if (c==='z') numCode+='5';
                    }
                    if (numCode) entries.push({ char: parts[0], code: numCode });
                }
            }
            userDict = [...userDict, ...entries];
            saveState();
            status.textContent = `✓ 已下載 ${entries.length} 個字`;
            btn.textContent = '✓ 完成';
        } catch (e) {
            status.textContent = '✗ 下載失敗: ' + e.message;
            btn.textContent = '重試'; btn.disabled = false;
        }
    });

    // Add custom word
    document.getElementById('add-btn').addEventListener('click', () => {
        const char = document.getElementById('add-char').value.trim();
        const code = document.getElementById('add-code').value.trim();
        if (!char || !code || !/^[1-6]+$/.test(code)) {
            alert('請輸入字和有效筆碼 (1-6)'); return;
        }
        userDict = [...userDict, { char, code }];
        saveState();
        document.getElementById('add-char').value = '';
        document.getElementById('add-code').value = '';
        alert(`已加入：${char} (${code})`);
    });

    loadState(() => render());
});
