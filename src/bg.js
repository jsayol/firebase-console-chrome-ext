var inDatabseConsole = false;

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