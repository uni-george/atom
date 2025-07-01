'use strict';

const { randomBytes } = require("crypto");

/**
 * Generate a token.
 * @param {number} length The length of the token to generate.
 * @returns {string} The generated token.
 */
const tokenGenerate = (length = 48) => {
    return Buffer.from(randomBytes(length)).toString("hex");
}

module.exports = tokenGenerate;