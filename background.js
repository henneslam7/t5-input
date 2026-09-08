// Service worker: keeps the dictionary fresh without the popup having to
// pay the download+parse cost every time it opens.
importScripts('dict-loader.js');

const REFRESH_ALARM = 't5-dict-weekly-refresh';

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
