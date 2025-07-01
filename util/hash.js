'use strict';

const bcrypt = require("bcrypt");

/**
 * Hash a key.
 * @param {string} key The key to hash.
 * @param {number} rounds The number of salting rounds to use.
 * @returns {string} The hashed key.
 */
const hash = (key, rounds = 10) => {
    return bcrypt.hashSync(key, rounds);
}

module.exports = hash;