'use strict';

var inDatabseConsole = false;

// Monitor changes to the tabs where the console is open, in order to
// decide if we need to start or stop the Mutation Observer.
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo && (changeInfo.status == "complete")) {
        if (tab && tab.url) {
            var isDatabaseUrl = tab.url.match(/^https?:\/\/console.firebase.google.com\/project\/([^\/]+)\/database\/data($|\/|~2F)/);

            if (isDatabaseUrl && !inDatabseConsole) {
                inDatabseConsole = true;
                chrome.tabs.sendMessage(tabId, {action: 'startObserver'});
            } else if (!isDatabaseUrl && inDatabseConsole) {
                inDatabseConsole = false;
                chrome.tabs.sendMessage(tabId, {action: 'stopObserver'});
            }
        }
    }
});

// chrome.tabs.executeScript(tabId, {
//     code: 'window.name = "NG_DEFER_BOOTSTRAP!" + window.name;'
// }, function () {
//     // Inject our app's script
//     chrome.tabs.executeScript(tabId, {file: 'content.js'});
// });

