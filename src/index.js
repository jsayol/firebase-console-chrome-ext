'use strict';

const fbToolbox = new FBToolbox();

// Listen to messages from the background process
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // console.log(`Background requested ${request.action}`);

    if (request.action == 'inProject') {
        fbToolbox.inProject(request.data);
    } else if (request.action == 'inDatabase') {
        fbToolbox.inDatabase(request.data);
    } else if (request.action == 'log') {
        // console.log('Background:', request.data);
    }
});

// Inject the script into the page when the document is ready
chrome.extension.sendMessage({}, response => {
    const readyStateCheckInterval = setInterval(_ => {
        if (document.readyState === "complete") {
            clearInterval(readyStateCheckInterval);

            $.getScript(chrome.extension.getURL('lib/js/json-schema-faker.js'))
                .done(_ => {
                    $.getScript(chrome.extension.getURL('src/inject.js'))
                        .fail(err => console.error('FBToolbox', 'Failed to inject script into the page', err));
                })
                .fail(err => console.error('FBToolbox', 'Failed to inject "json-schema-faker.js" into the page', err));
        }
    }, 10);
});

// Listen to messages from the injected script
document.addEventListener('FBToolboxInjectedMessage', e => {
    // console.log('Received FBToolboxInjectedMessage', e.detail);
    fbToolbox.injectedReady();
});