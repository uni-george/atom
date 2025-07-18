'use strict';

const tokenGenerate = require("../../util/tokenGenerate");
const hash = require("../../util/hash");
const compareHash = require("../../util/compareHash");

const SnowflakeID = require("snowflake-id").default;
const snowflake = new SnowflakeID();

const dbManager = require("./DatabaseManagers").DataDBManager;

/**
 * An enum of columns possible to sort by.
 * @enum {string}
 * @readonly
 */
const UserSortByColumns = {
    id: "id",
    name: "name"
}

class UserManager {
    static sortByColumns = UserSortByColumns;
    static namePattern = /^.{1,48}$/;

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
        return new User();
    }

    /**
     * Search for users.
     * @param {UserSearchParams} searchParams The parameters for the search.
     * @returns {User[]} The found users.
     */
    static search(searchParams) {
        let limit = searchParams.limit === undefined ? 50 : Math.max(Math.min(searchParams.limit, 50), 0);
        let offset = searchParams.offset === undefined ? 0 : Math.max(searchParams.offset, 0);
        let group = searchParams.group;

        let sortBy = Object.keys(UserManager.sortByColumns).includes(searchParams.sortBy) ? searchParams.sortBy : UserManager.sortByColumns.name;
        let sortDirection = searchParams.sortDirection == "ascending" ? "ASC" : searchParams.sortDirection == "descending" ? "DESC" : "ASC";

        let name = (searchParams.name || "").replaceAll(/[%_\\]/g, "\\$&");

        let entries = dbManager.operation(db => (
            db.prepare(`
                SELECT *
                FROM users
                WHERE
                    CASE
                        WHEN ? = 1
                        THEN id = (
                            SELECT userID
                            FROM groupMember
                            WHERE groupID = (
                                WITH RECURSIVE
                                    descendant(id) AS (
                                        VALUES(?)
                                        UNION ALL
                                        SELECT groups.id
                                        FROM groups
                                        JOIN descendant
                                        ON groups.parentID = descendant.id
                                    )
                                SELECT id FROM descendant
                            )
                        )
                        ELSE 1
                    END
                AND
                    CASE
                        WHEN ? = 1
                        THEN name LIKE ? ESCAPE '\\'
                        ELSE 1
                    END
                ORDER BY ${sortBy} ${sortDirection}
                LIMIT ?
                OFFSET ?
            `).all(group ? 1 : 0, group, name ? 1 : 0, `%${name}%`, limit, offset)
        ));

        if (!entries) return [];

        return entries.map(x => UserManager.create().readFromEntry(x));
    }

    /**
     * Get the total number of results for a user search query.
     * @param {UserSearchParams} searchParams The parameters for the search.
     * @returns {number} The number of users that meet the requirements.
     */
    static count(searchParams) {
        let group = searchParams.group;

        let name = (searchParams.name || "").replaceAll(/[%_\\]/g, "\\$&");

        let entry = dbManager.operation(db => (
            db.prepare(`
                SELECT COUNT(*)
                FROM users
                WHERE
                    CASE
                        WHEN ? = 1
                        THEN id = (
                            SELECT userID
                            FROM groupMember
                            WHERE groupID = (
                                WITH RECURSIVE
                                    descendant(id) AS (
                                        VALUES(?)
                                        UNION ALL
                                        SELECT groups.id
                                        FROM groups
                                        JOIN descendant
                                        ON groups.parentID = descendant.id
                                    )
                                SELECT id FROM descendant
                            )
                        )
                        ELSE 1
                    END
                AND
                    CASE
                        WHEN ? = 1
                        THEN name LIKE ? ESCAPE '\\'
                        ELSE 1
                    END
            `).get(group ? 1 : 0, group, name ? 1 : 0, `%${name}%`)
        ));

        if (!entry) return 0;

        return entry["COUNT(*)"];
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

    /**
     * Permanently delete this user.
     */
    delete() {
        if (!this.id) throw new Error("Cannot delete user without an ID.");

        dbManager.operation(db => {
            db.prepare("DELETE FROM googleLogins WHERE userID = ?").run(this.id);
            db.prepare("DELETE FROM groupMember WHERE userID = ?").run(this.id);
            db.prepare("DELETE FROM localLogins WHERE userID = ?").run(this.id);
            db.prepare("DELETE FROM sessions WHERE userID = ?").run(this.id);
            db.prepare("DELETE FROM userGlobalPermissions WHERE userID = ?").run(this.id);
            db.prepare("DELETE FROM users WHERE id = ?").run(this.id);
        });

        delete this;
    }
}

class UserSession {
    constructor() {
        /**
         * This session's ID.
         * @type {string=}
         */
        this.id = undefined;
        /**
         * This session's user.
         * @type {string=}
         */
        this.userID = undefined;
        /**
         * The time this session was created.
         * @type {Date=}
         */
        this.created = undefined;
        /**
         * The time this session expires.
         * @type {Date=}
         */
        this.expires = undefined;
        /**
         * The IP of the device this session was started from.
         * @type {string=}
         */
        this.originIP = undefined;
        /**
         * A description of the device this session was started from.
         * @type {string=}
         */
        this.device = undefined;
        /**
         * A description of the client this session was started from.
         * @type {string=}
         */
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

    /**
     * Save this UserSession.
     * @returns {UserSession} This UserSession.
     */
    save() {
        if (!this.id) throw new Error("Cannot save session without an ID.");
        dbManager.operation(db => {
            db.prepare("REPLACE INTO sessions (id, userID, created, expires, originIP, device, browser) VALUES (?, ?, ?, ?, ?, ?, ?)")
                .run(this.id, this.userID, this.created?.getTime(), this.expires?.getTime(), this.originIP, this.device, this.browser);
        });

        return this;
    }
}

/**
 * @typedef {Object} SessionCreationSettings
 * @property {Date} validDuration
 * @property {string=} originIP
 * @property {string=} device
 * @property {string=} browser
 */

/**
 * @typedef {Object} UserSearchParams
 * @property {number=} limit
 * @property {number=} offset
 * @property {string=} group
 * @property {UserSortByColumns=} sortBy
 * @property {"ascending"|"descending"=} sortDirection
 * @property {string=} name
 */

module.exports = UserManager;