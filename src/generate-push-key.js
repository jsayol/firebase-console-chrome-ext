'use strict';

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