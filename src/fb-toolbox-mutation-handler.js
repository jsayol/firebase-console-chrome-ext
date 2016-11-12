'use strict';

const FBToolboxMutationHandler = summaries => {
    if (!summaries) {
        return;
    }

    FBToolboxMutationHandler.for.nameInput(summaries[0]);
    FBToolboxMutationHandler.for.valueInput(summaries[1]);
    FBToolboxMutationHandler.for.removeChildButton(summaries[2]);
};

FBToolboxMutationHandler.for = {
    nameInput(summary) {
        summary.added.forEach(function (addedElement) {
            var nameInput = $(addedElement);
            var genKeyButton = $('<button></button>')
                .addClass('md-button md-icon-button fbtoolbox-genpushkey')
                .attr('title', 'Generate push key')
                .on('click', FBToolboxMutationHandler.events.clickOnGeneratePushKey)
                .append($('<i>create</i>').addClass('material-icons').css({fontSize: '16px'}))
                .css({
                    margin: '0 4px',
                    height: '20px',
                    width: '20px'
                });

            nameInput.after(genKeyButton).on('keydown', FBToolboxMutationHandler.events.keypressOnAddingInput);

            // The "Add" button
            var addButton = nameInput.parents('li.data-tree-leaf').next('li.confirm').find('button.confirmBtn');
            if (!addButton.attr('fbtoolbox-evtAttached')) {
                addButton.attr('fbtoolbox-evtAttached', true);
                addButton.on('click keydown', {nameInput: nameInput}, FBToolboxMutationHandler.events.clickOnAddButton);
            }
        });

        summary.removed.forEach(function (removedElement) {
            // Some cleanup. Probably not necessary but better safe than sorry.
            var nameInput = $(removedElement);
            var parentNode = $(summary.getOldParentNode(removedElement));
            if (parentNode) {
                var genKeyButton = parentNode.find('button.fbtoolbox-genpushkey');
                var addButton = nameInput.parents('li.data-tree-leaf').next('li.confirm').find('button.confirmBtn');

                genKeyButton.off('click', FBToolboxMutationHandler.events.clickOnGeneratePushKey).remove();
                addButton.off('click keydown', FBToolboxMutationHandler.events.clickOnAddButton);
            }
            nameInput.off('keydown', FBToolboxMutationHandler.events.keypressOnAddingInput);
        });
    },

    valueInput(summary) {
        summary.added.forEach(function (addedElement) {
            $(addedElement).on('keydown', FBToolboxMutationHandler.events.keypressOnAddingInput);
        });

        summary.removed.forEach(function (removedElement) {
            $(removedElement).off('keydown', FBToolboxMutationHandler.events.keypressOnAddingInput);
        });
    },

    removeChildButton(summary) {
        summary.added.forEach(function (addedElement) {
            const removeChildButton = $(addedElement);
            const locationLink = removeChildButton.parent().find('span a').attr('href');

            if (locationLink) {
                const location = locationLink.replace(/^project\/([^\/]+)\/database\/data/, '');

                const genMockDataButton = $('<button></button>')
                    .addClass('md-button md-icon-button fbtoolbox-genmockdata')
                    .attr('title', 'generate mock data at this location')
                    .attr('data-location', location)
                    .on('click', FBToolboxMutationHandler.events.clickOnGenerateMockData)
                    .append($('<i>system_update_alt</i>').addClass('material-icons'));

                const prevNode = removeChildButton.prev();
                const insertBeforeNode = prevNode.prop('tagName') == 'BUTTON' ? prevNode : removeChildButton;

                insertBeforeNode.before(genMockDataButton);
            }
        });

        summary.removed.forEach(function (removedElement) {
            // Some cleanup. Probably not necessary but better safe than sorry.
            var parentNode = $(summary.getOldParentNode(removedElement));
            if (parentNode) {
                var genMockDataButton = parentNode.find('button.fbtoolbox-genmockdata');
                genMockDataButton
                    .off('click', FBToolboxMutationHandler.events.clickOnGenerateMockData)
                    .remove();
            }
        });
    }
};

FBToolboxMutationHandler.events = {
    clickOnGeneratePushKey() {
        FBToolboxMutationHandler.utils.generatePushKey().then(newKey => {
            let parent = $(this).parent();
            parent.find('input[type=text].nameInput').val(newKey);//.css('width', '175px');
            parent.find('input[type=text].valueInput').focus();
        });
    },

    keypressOnAddingInput(evt, extra) {
        if (!(extra && extra._fromFbToolbox) && (evt.which == 13)) {
            FBToolboxMutationHandler.utils.fillEmptyNameInputs(evt);
        }
    },

    clickOnAddButton(evt, extra) {
        evt.preventDefault();
        var nameInput = evt.data.nameInput;
        if (!(extra && extra._fromFbToolbox) && ((evt.type != 'keydown') || (evt.which == 13))) {
            var valueInput = nameInput.parent().find('input[type=text].valueInput');
            FBToolboxMutationHandler.utils.fillEmptyNameInputs(evt);
        }
    },

    clickOnGenerateMockData(evt) {
        const payload = {
            type: 'mockData',
            data: {
                location: $(this).attr('data-location')
            }
        };
        FBToolbox.injected.sendMessage('createDialog', payload, false);
    }
};

FBToolboxMutationHandler.utils = {
    fillEmptyNameInputs(evt) {
        let reTrigger = true;
        let firstWithoutValue = null;

        const treeContents = $('fb-card-drawer-wrapper').find('li.data-tree-leaf.adding .tree-content');
        const countWithoutName = treeContents.find('input[type=text].nameInput').filter((_, ni) => !ni.value).length;

        evt.preventDefault();
        evt.stopPropagation();

        this.generatePushKeys(countWithoutName).then(newKeys => {
            treeContents.each(function () {
                const treeContent = $(this);
                const nameInput = treeContent.find('input[type=text].nameInput');
                const valueInput = treeContent.find('input[type=text].valueInput');
                const hasName = (nameInput.val().length > 0);
                const hasValue = (valueInput.val().length > 0) || (valueInput.filter(':visible').length == 0);

                if (!hasName) {
                    nameInput.val(newKeys.shift());
                }

                if (!hasValue) {
                    reTrigger = false;

                    if (!firstWithoutValue) {
                        firstWithoutValue = valueInput;
                    }
                }
            });

            if (reTrigger) {
                $(evt.target).trigger(evt.type, [{_fromFbToolbox: true}])
            } else {
                firstWithoutValue.focus();
            }
        });
    },

    generatePushKeys(count = 1) {
        return new Promise(resolve => {
            FBToolbox.injected.sendMessage('generatePushKeys', {count}).then(newKeys => {
                resolve(newKeys);
            });
        });
    },

    generatePushKey() {
        return this.generatePushKeys(1).then(newKeys => Promise.resolve(newKeys[0]));
    }
};
