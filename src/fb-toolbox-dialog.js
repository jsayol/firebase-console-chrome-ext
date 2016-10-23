'use strict';

const FbToolboxDialog = {
    open(name) {
        const body = $('body')
            .prepend('<md-backdrop class="md-dialog-backdrop md-opaque md-gmp-blue-theme" style="position: fixed;" aria-hidden="true"></md-backdrop>')
            .append('<div class="md-scroll-mask" aria-hidden="true"><div class="md-scroll-mask-bar"></div></div>');


        var request = new XMLHttpRequest();
        request.open('GET', chrome.extension.getURL(`src/dialogs/${name}.html`), true);

        request.onload = function () {
            $($.parseHTML(this.response)).appendTo(body);
            body.find('.md-dialog-container > md-dialog > .fb-dialog > button.c5e-close-icon')
                .on('click', FbToolboxDialog.close);
        };

        request.onerror = function () {
            // TODO: Can there really be an error on this request? Should we do something?
            FbToolboxDialog.close();
        };

        request.send();

        return {close: this.close};
    },

    close() {
        $('body').children('md-backdrop, .md-scroll-mask, .md-dialog-container').remove();
    }
};