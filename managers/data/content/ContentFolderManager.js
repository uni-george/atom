'use strict';

const AtomError = require("../../../util/AtomError");
const dbManager = require("../DatabaseManagers").DataDBManager;
const SnowflakeID = require("snowflake-id").default;
const snowflake = new SnowflakeID();

class ContentFolderManager {
    static folderNamePattern = /^.{1,32}$/;

    /**
     * Get a ContentFolder from its ID.
     * @param {string} id The ContentFolder's ID.
     * @returns {ContentFolder=} The ContentFolder.
     */
    static get(id) {
        let entry = dbManager.operation(db => db.prepare("SELECT * FROM contentFolders WHERE id = ?").get(id));
        if (!entry) return undefined;

        return ContentFolderManager.create().readFromEntry(entry);
    }

    /**
     * Get top level (no parent) ContentFolders.
     * @returns {ContentFolder[]} The ContentFolders.
     */
    static getTopLevel() {
        let entries = dbManager.operation(db => db.prepare("SELECT * FROM contentFolders WHERE IFNULL(parentID, '') = ''").all());

        return entries.map(x => x).map(x => ContentFolderManager.create().readFromEntry(x));
    }

    /**
     * Create a new ContentFolder.
     * @returns {ContentFolder} The new ContentFolder.
     */
    static create() {
        return new ContentFolder();
    }
}

class ContentFolder {
    #parentID;

    constructor() {
        /**
         * The ID of this folder.
         * @type {string=}
         */
        this.id = undefined;
        /**
         * The name of this folder.
         * @type {string=}
         */
        this.name = undefined;
        /**
         * The ID of this folder's parent folder.
         * @type {string=}
         */
        this.#parentID = undefined;
    }

    /**
     * Get this ContentFolder's parent.
     * @returns {ContentFolder=}
     */
    get parent() {
        if (!this.#parentID) return undefined;
        return ContentFolderManager.get(this.#parentID);
    }

    /**
     * Set this ContentFolder's parent.
     * @param {ContentFolder|string=} val
     */
    set parent(val) {
        if (!val) {
            this.#parentID = undefined;
            return;
        }
        if (typeof(val) == "string") {
            if (this.getChildFolderIDs()?.includes(val)) throw new AtomError("Cannot set parent of folder to current child.");
            this.#parentID = val;
            return;
        }
        if (!(val instanceof ContentFolder)) throw new Error("Attempted to set parent of ContentFolder to not ContentFolder object.");
        if (!val.id) throw new AtomError("Cannot set parent to folder without ID.");
        if (this.getChildFolderIDs()?.includes(val.id)) throw new AtomError("Cannot set parent of folder to current child.");
        this.#parentID = val.id;
    }

    /**
     * Read a DB entry's data into this ContentFolder.
     * @param {Object} entry The entry.
     * @returns {ContentFolder} This ContentFolder.
     */
    readFromEntry(entry) {
        [
            "id",
            "name"
        ].forEach(x => {
            this[x] = entry[x]?.toString?.();
        });

        this.#parentID = entry.parentID?.toString?.();

        return this;
    }

    /**
     * Check this ContentFolder has an ID.
     * @returns {ContentFolder} This ContentFolder.
     */
    checkID() {
        this.id ||= snowflake.generate();
        return this;
    }

    /**
     * Save this ContentFolder.
     * @returns {ContentFolder} This ContentFolder.
     */
    save() {
        if (!this.id) throw new AtomError("Cannot save ContentFolder without ID.");

        dbManager.operation(db =>
            db.prepare("REPLACE INTO contentFolders (id, name, parentID) VALUES (?, ?, ?)").run(this.id, this.name, this.#parentID)
        );

        return this;
    }

    /**
     * Get the IDs of this folder's direct children.
     * @returns {string[]=} The IDs.
     */
    getDirectChildFolderIDs() {
        return dbManager.operation(db => db.prepare("SELECT id FROM contentFolders WHERE parentID = ?").all(this.id))?.map(x => x.id);
    }

    /**
     * Get the IDs of all direct and indirect children of this folder.
     * @returns {string[]=} The ContentFolder IDs.
     */
    getChildFolderIDs() {
        return dbManager.operation(db => db.prepare(`
            WITH RECURSIVE
                descendant(id) AS (
                    VALUES(?)
                    UNION ALL
                    SELECT contentFolders.id
                    FROM contentFolders
                    JOIN descendant
                    ON contentFolders.parentID = descendant.id
                )
            SELECT id
            FROM descendant
        `).all(this.id))?.map(x => x.id);
    }

    /**
     * Get the path of this folder.
     * @returns {Object[]} The path.
     */
    getPath() {
        return dbManager.operation(db => 
            db.prepare(`
                WITH RECURSIVE
                    ancestor(id, name, parent, level) AS (
                        SELECT id, name, parentID, 0
                        FROM contentFolders
                        WHERE id = ?
                        UNION ALL
                        SELECT contentFolders.id, contentFolders.name, contentFolders.parentID, ancestor.level + 1
                        FROM contentFolders
                        JOIN ancestor
                        ON ancestor.parent = contentFolders.id
                    )
                SELECT id, name
                FROM ancestor
                ORDER BY level DESC
            `).all(this.id)
        );
    }

    /**
     * Delete this ContentFolder. (also deletes all child content)
     */
    delete() {
        if (!this.id) throw new AtomError("Cannot delete ContentFolder without ID.");

        dbManager.operation(db => {
            // delete folder content
            db.prepare(`
                DELETE FROM content
                WHERE
                parentID IN (
                    WITH RECURSIVE
                        descendant(id) AS (
                            VALUES(?)
                            UNION ALL
                            SELECT contentFolders.id
                            FROM contentFolders
                            JOIN descendant
                            ON contentFolders.parentID = descendant.id
                        )
                    SELECT id
                    FROM descendant
                ) 
            `).run(this.id);
            // delete self and child folders
            db.prepare(`
                DELETE FROM contentFolders
                WHERE
                id IN (
                    WITH RECURSIVE
                        descendant(id) AS (
                            VALUES(?)
                            UNION ALL
                            SELECT contentFolders.id
                            FROM contentFolders
                            JOIN descendant
                            ON contentFolders.parentID = descendant.id
                        )
                    SELECT id
                    FROM descendant
                )    
            `).run(this.id);
            // delete folder
        }).run(this.id);

        delete this;
    }
}

ContentFolderManager.ContentFolder = ContentFolder;
module.exports = ContentFolderManager;