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

// Inject the script when the document is ready
chrome.extension.sendMessage({}, response => {
    const readyStateCheckInterval = setInterval(() => {
        if (document.readyState === "complete") {
            clearInterval(readyStateCheckInterval);

            let s = document.createElement('script');
            s.src = chrome.extension.getURL('src/inject.js');
            s.onload = function() {
                this.remove();

                // The injected script is already loaded so let's send it the extension's URL.
                FBToolbox.injected.sendMessage('extensionUrl', chrome.extension.getURL(''), false);
            };
            document.head.appendChild(s);

        }
    }, 10);
});

// Listen to messages from the injected script
document.addEventListener('FBToolboxInjectedMessage', e => {
    console.log(e.detail);
});