'use strict';

var fbToolbox = new FBToolbox();

// Listen to messages from the background process
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action == 'startObserver') {
        fbToolbox.startObserver();
    } else if (request.action == 'stopObserver') {
        fbToolbox.stopObserver();
    } else if (request.action == 'log') {
        console.log('Background:', request.data);
    }
});
