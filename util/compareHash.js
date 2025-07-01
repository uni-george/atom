'use strict';

const bcrypt = require("bcrypt");

/**
 * Check if some plaintext matches a hash.
 * @param {string} plain The plain text to check.
 * @param {string} hash The hashed text to check.
 * @returns {boolean} True/false depending on whether the plain text matches the hashed text.
 */
const compareHash = (plain, hash) => {
    return bcrypt.compareSync(plain, hash);
}

module.exports = compareHash;