'use strict';

var FBToolboxMutationHandler = {
    processSummaries(summaries) {
        if (!summaries) {
            return;
        }

        FBToolboxMutationHandler.handleNameInput(summaries[0]);
        FBToolboxMutationHandler.handleValueInput(summaries[1]);
        FBToolboxMutationHandler.handleAddChildButton(summaries[2]);
    },

    handleNameInput(summary) {
        summary.added.forEach(function (addedElement) {
            var nameInput = $(addedElement);
            var genKeyButton = $('<button></button>')
                .addClass('md-button md-icon-button fbtoolbox-genpushkey')
                .attr('title', 'Generate push key')
                .on('click', FBToolboxMutationHandler.Events.clickOnGeneratePushKey)
                .append($('<i>create</i>').addClass('material-icons').css({fontSize: '16px'}))
                .css({
                    margin: '0 4px',
                    height: '20px',
                    width: '20px'
                });

            nameInput.after(genKeyButton).on('keydown', FBToolboxMutationHandler.Events.keypressOnAddingInput);

            // The "Add" button
            var addButton = nameInput.parents('li.data-tree-leaf').next('li.confirm').find('button.confirmBtn');
            addButton.on('click keydown', {nameInput: nameInput}, FBToolboxMutationHandler.Events.clickOnAddButton);
        });

        summary.removed.forEach(function (removedElement) {
            // Some cleanup. Probably not necessary but better safe than sorry.
            var nameInput = $(removedElement);
            var parentNode = $(summary.getOldParentNode(removedElement));
            if (parentNode) {
                var genKeyButton = parentNode.find('button.fbtoolbox-genpushkey');
                var addButton = nameInput.parents('li.data-tree-leaf').next('li.confirm').find('button.confirmBtn');

                genKeyButton.off('click', FBToolboxMutationHandler.Events.clickOnGeneratePushKey).remove();
                addButton.off('click keydown', FBToolboxMutationHandler.Events.clickOnAddButton);
            }
            nameInput.off('keydown', FBToolboxMutationHandler.Events.keypressOnAddingInput);
        });
    },

    handleValueInput(summary) {
        summary.added.forEach(function (addedElement) {
            $(addedElement).on('keydown', FBToolboxMutationHandler.Events.keypressOnAddingInput);
        });

        summary.removed.forEach(function (removedElement) {
            $(removedElement).off('keydown', FBToolboxMutationHandler.Events.keypressOnAddingInput);
        });
    },

    handleAddChildButton(summary) {
        summary.added.forEach(function (addedElement) {
            var addChildButton = $(addedElement);
            var genMockDataButton = $('<button></button>')
                .addClass('md-button md-icon-button fbtoolbox-genmockdata')
                .attr('title', 'Generate mock data at this location')
                .on('click', FBToolboxMutationHandler.Events.clickOnGenerateMockData)
                .append($('<i>system_update_alt</i>').addClass('material-icons'));

            addChildButton.before(genMockDataButton);
        });

        summary.removed.forEach(function (removedElement) {
            // Some cleanup. Probably not necessary but better safe than sorry.
            var parentNode = $(summary.getOldParentNode(removedElement));
            if (parentNode) {
                var genMockDataButton = parentNode.find('button.fbtoolbox-genmockdata');
                genMockDataButton.off('click', FBToolboxMutationHandler.Events.clickOnGenerateMockData).remove();
            }
        });
    }
};

FBToolboxMutationHandler.Events = {
    clickOnGeneratePushKey() {
        var nameInput = this.parentNode.querySelector('input[type=text].nameInput');
        var valueInput = this.parentNode.querySelector('input[type=text].valueInput');

        nameInput.value = generatePushKey();
        nameInput.style.width = '175px';

        valueInput.focus();
    },

    keypressOnAddingInput(evt, extra) {
        if (!(extra && extra._fromFbToolbox) && (evt.which == 13)) {
            FBToolboxMutationHandler.Utils.fillEmptyNameInputs(evt);
        }
    },

    clickOnAddButton(evt, extra) {
        var nameInput = evt.data.nameInput;
        if (!(extra && extra._fromFbToolbox) && ((evt.type != 'keydown') || (evt.which == 13))) {
            var valueInput = nameInput.parent().find('input[type=text].valueInput');
            FBToolboxMutationHandler.Utils.fillEmptyNameInputs(evt);
        }
    },

    clickOnGenerateMockData(evt) {
        const dialog = FbToolboxDialog.open('mock-data');
    }
};

FBToolboxMutationHandler.Utils = {
    fillEmptyNameInputs(evt) {
        var reTrigger = true;
        var firstWithoutValue = null;

        $('fb-card-drawer-wrapper').find('li.data-tree-leaf.adding .tree-content').each(function () {
            var treeContent = $(this);
            var nameInput = treeContent.find('input[type=text].nameInput');
            var valueInput = treeContent.find('input[type=text].valueInput');
            var hasName = (nameInput.val().length > 0);
            var hasValue = (valueInput.val().length > 0) || (valueInput.filter(':visible').length == 0);

            if (!hasName) {
                nameInput.val(generatePushKey());
            }

            if (!hasValue) {
                reTrigger = false;

                if (!firstWithoutValue) {
                    firstWithoutValue = valueInput;
                }
            }
        });

        evt.preventDefault();
        evt.stopPropagation();

        if (reTrigger) {
            $(evt.target).trigger(evt.type, [{_fromFbToolbox: true}])
        } else {
            firstWithoutValue.focus();
        }
    }
};
