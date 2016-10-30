'use strict';

const fbToolbox = new FBToolbox();

// Listen to messages from the background process
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action == 'startObserver') {
        fbToolbox.startObserver();
    } else if (request.action == 'stopObserver') {
        fbToolbox.stopObserver();
    } else if (request.action == 'log') {
        console.log('Background:', request.data);
    }
});

// Inject the script into the page when the document is ready
chrome.extension.sendMessage({}, response => {
    const readyStateCheckInterval = setInterval(() => {
        if (document.readyState === "complete") {
            clearInterval(readyStateCheckInterval);

            $.getScript(chrome.extension.getURL('src/inject.js'))
                .done(() => FBToolbox.injected.sendMessage('extensionUrl', chrome.extension.getURL(''), false))
                .fail(() => console.error('FBToolbox', 'Failed to inject script into the page'));
        }
    }, 10);
});

// Listen to messages from the injected script
document.addEventListener('FBToolboxInjectedMessage', e => {
    // console.log(e.detail);
});