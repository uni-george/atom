'use strict';

const tokenGenerate = require("../../util/tokenGenerate");
const hash = require("../../util/hash");

const SnowflakeID = require("snowflake-id").default;
const snowflake = new SnowflakeID();

const dbManager = require("./DatabaseManagers").DataDBManager;

class UserManager {
    /**
     * Get a user from their ID.
     * @param {string} userID The user's ID.
     * @returns {User=} The user.
     */
    static get(userID) {
        if (!userID) return;
        let entry = dbManager.operation(db => db.prepare("SELECT * FROM users WHERE id = ?").get(userID));
        if (!entry) return;
        return UserManager.create().readFromEntry(entry);
    }
    
    /**
     * Create a new user.
     * @returns {User} A new user.
     */
    static create() {
        return new User
    }
}

class User {
    /**
     * Create a new User.
     */
    constructor() {
        /**
         * The user's display name.
         * @type {string=}
         */
        this.name = "unnamed user";
        /**
         * The user's ID.
         * @type {string=}
         */
        this.id = undefined;
        /**
         * The user's avatar ID.
         * @type {string=}
         */
        this.avatarID = undefined;
    }

    /**
     * Read a DB entry's values into this user.
     * @param {Object} entry The DB entry.
     * @returns {User} This user.
     */
    readFromEntry(entry) {
        [
            "id",
            "name",
            "avatarID"
        ].forEach(x => {
            this[x] = entry[x]?.toString?.();
        });

        return this;
    }

    /**
     * Save this user.
     * @returns {User} This user.
     */
    save() {
        if (!this.id) throw new Error("Cannot save user without ID.");
        dbManager.operation(db => db.prepare("REPLACE INTO users (id, name, avatarID) VALUES (?, ?, ?)").run(this.id, this.name, this.avatarID));
        return this;
    }

    /**
     * Check this user has an ID.
     * @returns {User} This user.
     */
    checkID() {
        this.id ||= snowflake.generate();
        return this;
    }

    /**
     * Get this user's sessions.
     * @returns {UserSession[]} The sessions.
     */
    getSessions() {
        let entries = dbManager.operation(db => 
            db.prepare("SELECT * FROM sessions WHERE userID = ?").all(this.id)
        );
        
        return entries.filter(x => x).map(x => new UserSession().readFromEntry(x));
    }

    /**
     * Start a new session for this user.
     * @param {SessionCreationSettings} creationSettings Settings to create the session with.
     * @returns {string} The created session token.
     */
    newSession(creationSettings) {
        if (!this.id) throw new Error("Cannot start a session for a user without an ID.");
        if (!creationSettings?.validDuration) throw new Error("Session must be started with at least a valid duration.");

        let token = tokenGenerate();
        let hashed = hash(token);

        dbManager.operation(db => {
            db.prepare("INSERT INTO sessions (id, userID, created, expires, originIP, device, browser) VALUES (?, ?, ?, ?, ?, ?, ?)")
                .run(hashed, this.id, new Date().getTime(), new Date().getTime() + (creationSettings.validDuration?.getTime() || 1000 * 60 * 60), creationSettings.originIP || null, creationSettings.device || null, creationSettings.browser || null);
        });

        return token;
    }
}

class UserSession {
    constructor() {
        this.id = undefined;
        this.userID = undefined;
        this.created = undefined;
        this.expires = undefined;
        this.originIP = undefined;
        this.device = undefined;
        this.browser = undefined;
    }

    /**
     * Read user session information in from a database entry.
     * @param {Object} entry The entry to read from.
     * @returns {UserSession} This UserSession.
     */
    readFromEntry(entry) {
        [
            "id",
            "userID",
            "originIP",
            "device",
            "browser"
        ].forEach(x => {
            this[x] = entry[x]?.toString?.();
        });
        [
            "created",
            "expires"
        ].forEach(x => {
            this[x] = new Date(entry[x]);
        })

        return this;
    }

    /**
     * Delete this session.
     */
    delete() {
        if (!this.id) throw new Error("Cannot end session without an ID.");
        dbManager.operation(db => {
            db.prepare("DELETE FROM sessions WHERE id = ?").run(this.id);
        });
        delete this;
    }
}

module.exports = UserManager;

/**
 * 
 * @typedef {Object} SessionCreationSettings
 * @property {Date} validDuration
 * @property {string=} originIP
 * @property {string=} device
 * @property {string=} browser
 */