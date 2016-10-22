// Listen to messages from the background process
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action == 'startObserver') {
        observer.reconnect();
    } else if (request.action == 'stopObserver') {
        handleMutation(observer.disconnect());
    } else if (request.action == 'log') {
        console.log('Background:', request.data);
    }
});


// Create a new Mutation Observer
var observer = new MutationSummary({
    queries: [{
        element: 'input[type=text].nameInput'
    }],
    callback: handleMutation
});

// And immediately disconnect it until we need it
observer.disconnect();

// The mutation handler
function handleMutation(summaries) {
    if (!summaries) {
        return;
    }

    summaries.forEach(function(nameInput) {
        nameInput.added.forEach(function (newEl) {
            var keyButton = document.createElement('button');
            keyButton.className = 'md-button md-icon-button fbext-genpushkey';
            Object.assign(keyButton.style, {
                margin: '0 4px',
                height: '20px',
                width: '20px'
            });

            var keyButtonIcon = document.createElement('i');
            keyButtonIcon.className = 'material-icons';
            keyButtonIcon.innerText = 'create';
            Object.assign(keyButtonIcon.style, {
                fontSize: '16px'
            });

            keyButton.appendChild(keyButtonIcon);
            keyButton.addEventListener('click', onGeneratePushKeyClicked);

            newEl.parentNode.insertBefore(keyButton, newEl.nextSibling);
        });

        nameInput.removed.forEach(function (removedEl) {
            // Some cleanup. Probably not necessary but better safe than sorry.
            var keyButton = removedEl.parentNode.querySelector('button.fbext-genpushkey');
            keyButton.removeEventListener('click', onGeneratePushKeyClicked);
            removedEl.parentNode.removeChild(keyButton);
        });
    });
}

// The click handler
function onGeneratePushKeyClicked() {
    var input = this.previousSibling;
    input.value = generatePushKey();
    input.style.width = '175px';
}

/*
 * Generate a Firebase push Key
 * ============================
 * Same code used by the Firebase Web SDK (with minor modifications) except the timestamp used
 * is not corrected to account for a possible offset between the client's and server's clocks.
 */
var generatePushKey = function () {
    var prevTime = 0;
    var randChars = [];
    var chars = "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz";
    return function () {
        var time = Date.now();
        var isSameTime = (time === prevTime);
        var encodedTime = new Array(8);
        var nextPushId;

        prevTime = time;

        for (var i = 7; 0 <= i; i--) {
            encodedTime[i] = chars.charAt(time % 64);
            time = Math.floor(time / 64);
        }

        if (0 !== time) {
            throw Error("Cannot push at time == 0");
        }

        nextPushId = encodedTime.join("");

        if (isSameTime) {
            for (i = 11; 0 <= i && 63 === randChars[i]; i--) {
                randChars[i] = 0;
            }
            randChars[i]++;
        } else {
            for (i = 0; 12 > i; i++) {
                randChars[i] = Math.floor(64 * Math.random());
            }
        }

        for (i = 0; 12 > i; i++) {
            nextPushId += chars.charAt(randChars[i]);
        }

        if (20 !== nextPushId.length) {
            throw Error("nextPushId: Length should be 20.");
        }

        return nextPushId;
    }
}();