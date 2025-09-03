'use strict';

const AtomError = require("../../../util/AtomError");
const ContentFolderManager = require("./ContentFolderManager");

const dbManager = require("../DatabaseManagers").DataDBManager;
const SnowflakeID = require("snowflake-id").default;
const snowflake = new SnowflakeID();

class ContentManager {
    /**
     * Get a Content from its ID.
     * @param {string} id The Content's ID.
     * @returns {Content=} The Content.
     */
    static get(id) {
        let entry = dbManager.operation(db => db.prepare("SELECT * FROM content WHERE id = ?").get(id));
        if (!entry) return undefined;

        return ContentManager.create().readFromEntry(entry);
    }

    /**
     * Get top level (no parent) Contents. 
     * @returns {Content[]} The Contents.
     */
    static getTopLevel() {
        let entries = dbManager.operation(db => db.prepare("SELECT * FROM content WHERE IFNULL(parentID, '') = ''").all());

        return entries.map(x => x).map(x => ContentFolderManager.create().readFromEntry(x));
    }

    /**
     * Create a new Content.
     * @returns {Content} The new Content.
     */
    static create() {
        return new Content();
    }

    /**
     * Get the direct child Contents of a ContentFolder.
     * @param {string} folderID The ContentFolder's ID.
     * @returns {Content[]} The Contents.
     */
    static getFolderDirectContent(folderID) {
        let entries = dbManager.operation(db => db.prepare("SELECT * FROM content WHERE parentID = ?").all(folderID));
        if (!entries?.length) return [];

        return entries.filter(x => x).map(x => ContentManager.create().readFromEntry(x));
    }

    /**
     * Get all Contents contained within a folder or any subfolder of the folder.
     * @param {string} folderID The ContentFolder's ID.
     * @returns {Content[]} The Contents.
     */
    static getFolderAllContent(folderID) {
        return dbManager.operation(db => 
            db.prepare(`
                SELECT *
                FROM content
                WHERE parentID IN (
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
            `).all(folderID)
        )?.filter(x => x).map(x => ContentManager.create().readFromEntry(x));
    }
}

/**
 * @enum {string}
 */
const ContentType = {
    string: "string",
    number: "number"
}

class Content {
    #parentID;

    constructor() {
        /**
         * This Content's ID.
         * @type {string=}
         */
        this.id = undefined;
        /**
         * This Content's name.
         * @type {number|string=}
         */
        this.name = undefined;
        /**
         * The type of this Content.
         * @type {ContentType}
         */
        this.type = ContentType.string;
        /**
         * This Content's parent folder ID.
         * @type {string=}
         */
        this.#parentID = undefined;
        /**
         * This Content's data.
         * @type {string|number=}
         */
        this.data = undefined;
    }

    /**
     * Get this Content's folder.
     * @returns {ContentFolderManager.ContentFolder=}
     */
    get folder() {
        if (!this.#parentID) return undefined;
        return ContentFolderManager.get(this.#parentID);
    }

    /**
     * Set this Content's folder.
     * @param {ContentFolderManager.ContentFolder|string=}
     */
    set folder(val) {
        if (!val) {
            this.#parentID = undefined;
            return;
        }
        if (typeof(val) == "string") {
            if (!ContentFolderManager.get(val)) throw new AtomError("Cannot place content in non-existent folder.");
            this.#parentID = val;
            return;
        }
        if (!(val instanceof ContentFolderManager.ContentFolder)) throw new Error("Attempted to set parent of Content to not ContentFolder object.");
        if (!val.id) throw new AtomError("Cannot set parent to folder without ID.");
        this.#parentID = val.id;
    }

    /**
     * Read a DB entry's data into this Content.
     * @param {Object} entry The entry.
     * @returns {Content} This Content.
     */
    readFromEntry(entry) {
        [
            "id",
            "name",
            "type"
        ].forEach(x => {
            this[x] = entry[x]?.toString?.();
        });

        if (this.type == ContentType.number) {
            this.data = parseFloat(entry.data || 0);
        } else {
            this.data = entry.data?.toString?.();
        }

        this.#parentID = entry.parentID?.toString?.();

        return this;
    }

    /**
     * Check this Content has an ID.
     * @returns {Content} This Content.
     */
    checkID() {
        this.id ||= snowflake.generate();
        return this;
    }

    /**
     * Save this Content.
     * @returns {Content} This Content.
     */
    save() {
        if (!this.id) throw new AtomError("Cannot save Content without ID.");

        dbManager.operation(db => 
            db.prepare("REPLACE INTO content (id, name, type, parentID, data) VALUES (?, ?, ?, ?, ?)").run(this.id, this.name, this.type, this.#parentID, this.data)
        );

        return this;
    }

    /**
     * Delete this Content.
     */
    delete() {
        if (!this.id) throw new AtomError("Cannot delete Content without ID.");

        dbManager.operation(db => 
            db.prepare("DELETE FROM content WHERE id = ?").run(this.id)
        );

        delete this;
    }
}

module.exports = ContentManager;