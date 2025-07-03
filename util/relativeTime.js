'use strict';

/**
 * Get a string showing the relative time represented by a number of milliseconds.
 * @param {number} x The time (in ms)
 * @param {string=} outIn Current output (recursion)
 * @returns {string} The string.
 */
const relativeTime = (x) => {
    let out = "";
    let periods = [
        [1000 * 60 * 60 * 24 * 365, " year"],
        [1000 * 60 * 60 * 24 * 28, " month"],
        [1000 * 60 * 60 * 24 * 7, " week"],
        [1000 * 60 * 60 * 24, " day"],
        [1000 * 60 * 60, " hour"],
        [1000 * 60, " min"],
        [1000, " sec"]
    ];

    for (let i = 0; i < periods.length; i++) {
        if (x >= periods[i][0]) {
            let res = parseInt(x / periods[i][0], 10);
            out += res;
            out += periods[i][1];
            out += res > 1 ? "s" : " ";
            out += relativeTime(x - (res * periods[i][0]));
            break;
        }
    }

    return out.trim();
}

module.exports = relativeTime;