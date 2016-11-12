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
    }

    startObserver() {
        // Start the observer when asked by the background process
        try {
            this.observer.reconnect();
        }
        catch (err) {
            /*
             * Sometimes the observer might already be connected even if we think it isn't.
             * From what I've seen, it can happen when the machine enters into suspension mode
             * while already observing.
             * Let's make sure to catch that to prevent throwing unnecessary errors.
             */
            if (err.message != 'Already connected') {
                throw err;
            }
        }
    }

    stopObserver() {
        // Stop the observer when asked by the background process
        FBToolboxMutationHandler(this.observer.disconnect());
    }
}

FBToolbox.injected = {
    // Method to send a message to the injected script and optionally wait for a response.
    sendMessage(msg, payload = null, expectResponse = true) {
        const id = Date.now() + '_' + ~~(Math.random() * 1e9);
        let promise;

        if (expectResponse) {
            const eventName = 'FBToolboxInjectedResponse_' + id;
            const doc = $(document);
            promise = new Promise(resolve => {
                doc.on(eventName, event => {
                    doc.off(eventName);
                    resolve(event.detail);
                });
            });
        } else {
            promise = Promise.resolve(null);
        }

        document.dispatchEvent(new CustomEvent('FBToolboxContentMessage', {
            detail: {id, msg, payload}
        }));

        return promise;
    }
};


