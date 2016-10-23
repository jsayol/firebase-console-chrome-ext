'use strict';

class FBToolbox {
    constructor() {
        // Instantiate the mutation observer via the MutationSummary helper class (see https://github.com/rafaelw/mutation-summary)
        this.observer = new MutationSummary({
            queries: [
                {element: 'input[type=text].nameInput'},
                {element: 'input[type=text].valueInput'},
                {element: 'button.addBtn.md-icon-button'}
            ],
            callback: FBToolboxMutationHandler.processSummaries
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
        FBToolboxMutationHandler.processSummaries(this.observer.disconnect());
    }
}
