'use strict';

class FBToolbox {
    constructor() {
        // Instantiate the mutation observer via the MutationSummary helper class (see https://github.com/rafaelw/mutation-summary)
        this.observer = new MutationSummary({
            queries: [
                {element: 'input[type=text].nameInput'},
                {element: 'input[type=text].valueInput'},
                {element: 'button.removeBtn.md-icon-button'}
            ],
            callback: FBToolboxMutationHandler
        });

        // And immediately disconnect it until we need it
        this.observer.disconnect();

        // Initialize the list of messages waiting to be sent when the injected script is ready
        this._injectedReady = false;
        this._pendingMessages = [];

        // Some more state
        this._inDatabseConsole = false;
        this._currentProject = null;

    }

    startObserver() {
        // Start the observer when asked by the background process
        // console.log('Starting mutation observer');
        this.observer.reconnect();
    }

    stopObserver() {
        // Stop the observer when asked by the background process
        // console.log('Stopping mutation observer');
        FBToolboxMutationHandler(this.observer.disconnect());
    }

    injectedReady() {
        this._injectedReady = true;

        while (this._pendingMessages.length) {
            const {msg, payload, expectResponse, id} = this._pendingMessages.shift();
            this.sendMessageToInjected(msg, payload, expectResponse, id);
        }

        this.sendMessageToInjected('extensionUrl', chrome.extension.getURL(''), false);
    }

    inProject({project}) {
        if (project !== this._currentProject) {
            this._currentProject = project;
            this.sendMessageToInjected('inProject', null, false);
        }
    }

    inDatabase({isDatabaseUrl}) {
        if (isDatabaseUrl && !this._inDatabseConsole) {
            this._inDatabseConsole = true;
            this.startObserver();
        } else if (!isDatabaseUrl && this._inDatabseConsole) {
            this._inDatabseConsole = false;
            this.stopObserver();
        }
    }

    // Send a message to the injected script and optionally wait for a response.
    sendMessageToInjected(msg, payload = null, expectResponse = true, id = null) {
        let promise;

        // id will be null unless we're sending a messages that was queued. In that case we don't need a new promise.
        if (id === null) {
            id = Date.now() + '_' + ~~(Math.random() * 1e9);

            if (expectResponse) {
                const eventName = 'FBToolboxInjectedResponse_' + id;
                const doc = $(document);
                promise = new Promise(resolve => {
                    doc.on(eventName, event => {
                        // console.log('Received response for FBToolboxContentMessage', msg, id);
                        doc.off(eventName);
                        resolve(event.detail);
                    });
                });
            } else {
                promise = Promise.resolve(null);
            }
        }

        // If the injected script is not ready yet, let's queue the message. Otherwise let's send it.
        if (!this._injectedReady) {
            // console.log('Queuing FBToolboxContentMessage', msg, id);
            this._pendingMessages.push({msg, payload, expectResponse, id});
        } else {
            // console.log('Sending FBToolboxContentMessage', msg, id);
            document.dispatchEvent(new CustomEvent('FBToolboxContentMessage', {
                detail: {id, msg, payload}
            }));
        }

        return promise;
    }
}

