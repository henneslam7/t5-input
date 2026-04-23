'use strict';

let t5WindowId = null;

chrome.action.onClicked.addListener(() => {
    if (t5WindowId !== null) {
        chrome.windows.get(t5WindowId, {}, (win) => {
            if (chrome.runtime.lastError || !win) {
                openWindow();
            } else {
                chrome.windows.update(t5WindowId, { focused: true });
            }
        });
    } else {
        openWindow();
    }
});

function openWindow() {
    chrome.windows.create({
        url: chrome.runtime.getURL('popup.html'),
        type: 'popup',
        width: 440,
        height: 640,
        focused: true
    }, (win) => {
        t5WindowId = win.id;
        chrome.windows.onRemoved.addListener(function onRemoved(id) {
            if (id === t5WindowId) {
                t5WindowId = null;
                chrome.windows.onRemoved.removeListener(onRemoved);
            }
        });
    });
}
