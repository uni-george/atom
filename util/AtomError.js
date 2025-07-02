'use strict';

/**
 * Enum for Atom errors.
 * @readonly
 * @enum {string}
 */
const AtomErrorCodes = {
    ERR_UNKNOWN: "ERR_UNKNOWN"
    
}

/**
 * MESSAGE MUST BE SAFE FOR CLIENT TO SEE
 */
class AtomError extends Error {
    static codes = AtomErrorCodes;

    /**
     * Create a new AtomError. MESSAGE MUST BE SAFE FOR CLIENT TO SEE
     * @param {string} message MUST BE SAFE FOR CLIENT TO SEE
     * @param {AtomErrorCodes} code
     */
    constructor(message, code = "ERR_UNKNOWN") {
        super(message);
        this.name = "AtomError";
        this.code = code;
    }
}

module.exports = AtomError;