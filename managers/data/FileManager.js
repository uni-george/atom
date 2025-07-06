'use strict';

const dbManager = require("./DatabaseManagers").FileDBManager;
const { statSync } = require("fs");
const GlobalPermissionsManager = require("./GlobalPermissionsManager");
const AtomError = require("../../util/AtomError");
const SnowflakeID = require("snowflake-id").default;
const snowflake = new SnowflakeID();

const TOTAL_MAX_BYTES = 100 * 1024 * 1024 // 100 MiB
const FILE_MAX_BYTES = 10 * 1024; // 10 kiB

class FileManager {
    static fileNamePattern = /^[a-zA-Z0-9.]{1,32}$/;

    /**
     * Get a file from its ID.
     * @param {string} id The file's ID.
     * @returns {File=} The file.
     */
    static get(id) {
        let entry = dbManager.operation(db => db.prepare("SELECT * FROM files WHERE id = ?").get(id));
        if (!entry) return undefined;

        return FileManager.create().readFromEntry(entry);
    }

    /**
     * Check if storage space is available in the files database.
     * @param {number} size The amount of space to check for (bytes). 
     * @returns {boolean} True/false depending on whether the amount of space is available.
     */
    static isStorageSpaceAvailable(size) {
        if (!dbManager.getPath()) return false;

        if (!size) size = 0;
        size = Math.max(size, 0);
        
        let stats = statSync(dbManager.getPath());

        return TOTAL_MAX_BYTES - stats.size > size;
    }

    /**
     * Create a new File.
     * @returns {File} The new file.
     */
    static create() {
        return new File();
    }
}

class File {
    constructor() {
        /**
         * The ID of this file.
         * @type {string=}
         */
        this.id = undefined;
        /**
         * The name of this file.
         * @type {string=}
         */
        this.name = undefined;
        /**
         * The mime of this file.
         * @type {string=}
         */
        this.mime = undefined;
        /**
         * The size of this file in bytes.
         * @type {number=}
         */
        this.size = undefined;
        /**
         * The time this file was added to the database.
         * @type {Date}
         */
        this.added = new Date(0);
        /**
         * The ID of the user that added this file.
         * @type {string=}
         */
        this.addedBy = undefined;
        /**
         * The file's data.
         */
        this.data = undefined;
    }

    /**
     * Read a DB entry's data into this File.
     * @param {Object} entry The DB entry.
     * @returns {File} This file.
     */
    readFromEntry(entry) {
        if (!entry) return this;
        [
            "id",
            "name",
            "mime",
            "addedBy"
        ].forEach(x => {
            this[x] = entry[x]?.toString?.();
        })

        this.size = entry.size ||= 0;

        this.added = new Date(entry.added || 0);
        this.data = entry.data;
        return this;
    }

    /**
     * Check this file has an ID.
     * @returns {File} This file.
     */
    checkID() {
        this.id ||= snowflake.generate();
        return this;
    }

    /**
     * Save this file.
     * @returns {File} This file.
     */
    save() {
        if (!FileManager.isStorageSpaceAvailable()) throw new Error("No more user-generated file space available. Please delete some files or increase the max file size in /managers/data/FileManager.");

        if (!this.id) throw new AtomError("Cannot save file without ID.");
        if (!this.mime) throw new AtomError("Cannot save file without mime type.");
        if (!this.addedBy) throw new AtomError("Cannot save file without adding user.");
        if (!this.size && this.size !== 0) throw new AtomError("Cannot save file without size.");
        if (this.size <= 0) throw new ErrAtomErroror("Cannot save empty file.");
        if (this.size > FILE_MAX_BYTES) throw new AtomError("File is too large.");

        if (!GlobalPermissionsManager.checkUser(this.addedBy, GlobalPermissionsManager.permissions.UploadFiles)) throw new Error("User does not have sufficient permission to upload files.")

        this.name ||= "unnamed file";
        if (!this.name.match(FileManager.fileNamePattern)) throw new AtomError(`File names must follow RegEx: ${FileManager.fileNamePattern.toString?.()}`);

        dbManager.operation(db => {
            db.prepare("REPLACE INTO files (id, name, mime, size, added, addedBy, data) VALUES (?, ?, ?, ?, ?, ?, ?)")
                .run(this.id, this.name, this.mime, this.size, this.added.getTime(), this.addedBy, this.data);
        });

        return this;
    }
}

module.exports = FileManager;