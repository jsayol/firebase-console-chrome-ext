'use strict';

// Monitor changes to the tabs where the console is open, in order to
// decide if we need to start or stop the Mutation Observer.
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo && (changeInfo.status == "complete")) {
        if (tab && tab.url) {
            // Detect when we enter a project's console
            let isProjectUrl = tab.url.match(/^https:\/\/console\.firebase\.google\.com\/project\/([^\/]+)\//);
            if (isProjectUrl) {
                chrome.tabs.sendMessage(tabId, {
                    action: 'inProject',
                    data: {
                        project: isProjectUrl[1]
                    }
                });
            }

            // Detect when we enter the database section of a project
            let isDatabaseUrl = tab.url.match(/^https:\/\/console\.firebase\.google\.com\/project\/([^\/]+)\/database\/data($|\/|~2F)/);
            chrome.tabs.sendMessage(tabId, {
                action: 'inDatabase',
                data: {
                    isDatabaseUrl: isDatabaseUrl !== null
                }
            });
        }
    }
});

