'use strict';

const AtomError = require("../../util/AtomError");

const dbManager = require("../data/DatabaseManagers").DataDBManager;

class GoogleAuthManager {
    /**
     * Get the set of GoogleAuthDetails corresponding to a Google ID.
     * @param {string} googleID The Google ID.
     * @returns {GoogleAuthDetails=} The set of GoogleAuthDetails.
     */
    static get(googleID) {
        let entry = dbManager.operation(db => db.prepare("SELECT * FROM googleLogins WHERE googleID = ?").get(googleID));
        if (!entry) return undefined;
        
        return new GoogleAuthDetails().readFromEntry(entry);
    }

    /**
     * Get all GoogleAuthDetails for a user.
     * @param {string} userID The user's ID.
     * @returns {GoogleAuthDetails[]=} The user's GoogleAuthDetails.
     */
    static getForUser(userID) {
        let entries = dbManager.operation(db => db.prepare("SELECT * FROM googleLogins WHERE userID = ?").all(userID));
        if (!entries?.length) return undefined;

        return entries.map(x => new GoogleAuthDetails().readFromEntry(x));
    }

    /**
     * Create a set of GoogleAuthDetails for a user.
     * @param {string} userID The user's ID.
     * @param {string} googleID The user's Google ID.
     * @param {string=} email The email associated with the user's Google account.
     * @returns {GoogleAuthDetails} The created set of GoogleAuthDetails.
     */
    static createForUser(userID, googleID, email) {
        if (!userID) throw new AtomError("Cannot create GoogleAuthDetails without a user ID.");
        if (!googleID) throw new AtomError("Cannot create GoogleAuthDetails without a Google ID.");
        if (GoogleAuthManager.get(googleID)) throw new AtomError("Cannot create GoogleAuthDetails for an already tracked account.");

        let details = new GoogleAuthDetails();
        details.userID = userID;
        details.googleID = googleID;
        details.accountEmail = email;

        return details.save();
    }
}

class GoogleAuthDetails {
    constructor() {
        /**
         * The user's ID.
         * @type {string}
         */
        this.userID = undefined;
        /**
         * The user's Google ID.
         * @type {string}
         */
        this.googleID = undefined;
        /**
         * The user's account's email. Only used for display purposes.
         * @type {string}
         */
        this.accountEmail = undefined;
    }

    /**
     * Read values from the database.
     * @param {Object} entry The entry.
     * @returns {GoogleAuthDetails} This set of GoogleAuthDetails.
     */
    readFromEntry(entry) {
        [
            "userID",
            "googleID",
            "accountEmail"
        ].forEach(x => {
            this[x] = entry[x]?.toString?.();
        });

        return this;
    }

    /**
     * Save this set of GoogleAuthDetails.
     * @returns {GoogleAuthDetails} This set of GoogleAuthDetails.
     */
    save() {
        if (!this.userID) throw new AtomError("Cannot save GoogleAuthDetails without a user ID.");
        if (!this.googleID) throw new AtomError("Cannot save GoogleAuthDetails without a Google ID.");

        dbManager.operation(db => {
            db.prepare("REPLACE INTO googleLogins (userID, googleID, accountEmail) VALUES (?, ?, ?)").run(this.userID, this.googleID, this,this.accountEmail);
        });

        return this;
    }
}

module.exports = GoogleAuthManager;