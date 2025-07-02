'use strict';

const dbManager = require("../data/DatabaseManagers").DataDBManager;
const hash = require("../../util/hash");
const compareHash = require("../../util/compareHash");
const AtomError = require("../../util/AtomError");

class LocalAuthManager {
    /**
     * Get a user's LocalAuthDetails.
     * @param {string} userID The user's ID.
     * @returns {LocalAuthDetails=} The resulting LocalAuthDetails.
     */
    static get(userID) {
        let entry = dbManager.operation(db => 
            db.prepare("SELECT * FROM localLogins WHERE userID = ?").get(userID)
        );

        if (!entry) return undefined;
        let details = new LocalAuthDetails();
        details.readFromEntry(entry);

        return details;
    }

    /**
     * Get a user's LocalAuthDetails.
     * @param {string} username The user's username.
     * @returns {LocalAuthDetails=} The resulting LocalAuthDetails.
     */
    static getForUsername(username) {
        let entry = dbManager.operation(db => 
            db.prepare("SELECT * FROM localLogins WHERE username = ?").get(username)
        );

        if (!entry) return undefined;
        let details = new LocalAuthDetails();
        details.readFromEntry(entry);

        return details;
    }

    /**
     * Create a local for a user.
     * @param {string} userID The user's ID.
     * @param {string} username The username to use.
     * @param {string} password The password to use.
     * @returns {LocalAuthDetails} The resulting LocalAuthDetails.
     */
    static createForUser(userID, username, password) {
        if (!userID) throw new AtomError("Cannot create a local login without a user ID.");
        if (!username) throw new AtomError("Cannot create a local login without a username.");
        if (!password) throw new AtomError("Cannot create a local login without a password.");

        if (LocalAuthManager.get(userID)) {
            throw new AtomError("Cannot create a local login for a user that already has a local login.");
        }

        let details = new LocalAuthDetails();
        details.username = username;
        details.userID = userID;
        let hashed = hash(password);
        details.passwordHash = hashed;

        details.save();

        return details;
    }
}

class LocalAuthDetails {
    constructor() {
        this.username = undefined;
        this.userID = undefined;
        this.passwordHash = undefined;
    }

    /**
     * Read this set of LocalAuthDetails from a DB entry.
     * @param {Object} entry The entry.
     * @returns {LocalAuthDetails} This set of LocalAuthDetails.
     */
    readFromEntry(entry) {
        [
            "username",
            "userID",
            "passwordHash"
        ].forEach(x => {
            this[x] = entry[x]?.toString?.();
        });

        return this;
    }
    
    /**
     * Save this set of LocalAuthDetails.
     * @returns {LocalAuthDetails} This set of LocalAuthDetails.
     */
    save() {
        if (!this.userID) throw new AtomError("Cannot save LocalAuthDetails without a user ID.");
        if (!this.username) throw new AtomError("Cannot save LocalAuthDetails without a username.");
        if (!this.passwordHash) throw new AtomError("Cannot save LocalAuthDetails without a password hash.");

        dbManager.operation(db=> {
            db.prepare("REPLACE INTO localLogins (userID, username, passwordHash) VALUES (?, ?, ?)").run(this.userID, this.username, this.passwordHash);
        });

        return this;
    }

    /**
     * Check if a password matches the password hash.
     * @param {string} password The plaintext password.
     * @returns {boolean} True/false depending on whether the password was a match.
     */
    checkPassword(password) {
        if (!this.passwordHash) throw new AtomError("Cannot check against empty password hash.");

        return compareHash(password, this.passwordHash);
    }
}

module.exports = LocalAuthManager;