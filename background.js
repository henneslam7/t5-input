// Service worker: keeps the dictionary fresh without the popup having to
// pay the download+parse cost every time it opens, and manages the
// always-on-top "floating" input window (an ordinary chrome.windows popup,
// not the toolbar action popup — the action popup auto-closes on blur so
// it can't be parked in a corner while you switch to another app).
importScripts('dict-loader.js');

const REFRESH_ALARM = 't5-dict-weekly-refresh';
const GEOM_KEY = 't5_float_geom';
const DEFAULT_WIDTH = 430;
const DEFAULT_HEIGHT = 640; // includes ~room for the OS window frame
const MARGIN = 16;

async function getFloatingWindowId() {
  const data = await chrome.storage.session.get(['floatWindowId']);
  return data.floatWindowId ?? null;
}

async function setFloatingWindowId(id) {
  if (id === null) {
    await chrome.storage.session.remove(['floatWindowId']);
  } else {
    await chrome.storage.session.set({ floatWindowId: id });
  }
}

async function computeDefaultGeometry() {
  const saved = await chrome.storage.local.get([GEOM_KEY]);
  if (saved[GEOM_KEY]) return saved[GEOM_KEY];

  try {
    const displays = await chrome.system.display.getInfo();
    const primary = displays.find((d) => d.isPrimary) || displays[0];
    const area = primary.workArea;
    return {
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      left: area.left + area.width - DEFAULT_WIDTH - MARGIN,
      top: area.top + area.height - DEFAULT_HEIGHT - MARGIN
    };
  } catch (e) {
    // system.display unavailable (rare) — fall back to letting Chrome place it.
    return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
  }
}

async function openOrFocusFloatingWindow() {
  const existingId = await getFloatingWindowId();
  if (existingId !== null) {
    try {
      await chrome.windows.update(existingId, { focused: true });
      return;
    } catch (e) {
      // Window was closed some other way (e.g. Alt+F4); fall through and recreate.
      await setFloatingWindowId(null);
    }
  }

  const geom = await computeDefaultGeometry();
  const win = await chrome.windows.create({
    url: chrome.runtime.getURL('popup.html') + '?floating=1',
    type: 'popup',
    width: geom.width,
    height: geom.height,
    left: geom.left,
    top: geom.top
  });
  await setFloatingWindowId(win.id);
}

async function closeFloatingWindow() {
  const existingId = await getFloatingWindowId();
  if (existingId === null) return;
  try {
    await chrome.windows.remove(existingId);
  } catch (e) {
    // already gone
  }
  await setFloatingWindowId(null);
}

async function toggleFloatingWindow() {
  const existingId = await getFloatingWindowId();
  if (existingId !== null) {
    try {
      const win = await chrome.windows.get(existingId);
      if (win.focused) {
        await closeFloatingWindow();
        return;
      }
      await chrome.windows.update(existingId, { focused: true });
      return;
    } catch (e) {
      await setFloatingWindowId(null);
    }
  }
  await openOrFocusFloatingWindow();
}

// Remember where the user leaves the floating window so it reopens in the
// same spot next time, instead of always resetting to the default corner.
chrome.windows.onBoundsChanged?.addListener(async (win) => {
  const existingId = await getFloatingWindowId();
  if (win.id !== existingId) return;
  await chrome.storage.local.set({
    [GEOM_KEY]: { left: win.left, top: win.top, width: win.width, height: win.height }
  });
});

chrome.windows.onRemoved.addListener(async (id) => {
  const existingId = await getFloatingWindowId();
  if (id === existingId) await setFloatingWindowId(null);
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'openFloating') {
    openOrFocusFloatingWindow().then(() => sendResponse({ ok: true }));
    return true; // async response
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-floating') toggleFloatingWindow();
});

async function ensureDictionary() {
  const { entries } = await T5Dict.loadDictionary();
  if (entries.length === 0) {
    try {
      await T5Dict.refreshDictionary();
    } catch (e) {
      console.error('T5: initial dictionary download failed', e);
    }
  }
}

chrome.runtime.onInstalled.addListener(() => {
  ensureDictionary();
  chrome.alarms.create(REFRESH_ALARM, { periodInMinutes: 60 * 24 * 7 });
});

chrome.runtime.onStartup.addListener(() => {
  ensureDictionary();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === REFRESH_ALARM) {
    T5Dict.refreshDictionary().catch((e) =>
      console.error('T5: weekly dictionary refresh failed', e)
    );
  }
});
