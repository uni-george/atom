'use strict';

const AtomError = require("../../util/AtomError");
const FileManager = require("./FileManager");
const dbManager = require("./DatabaseManagers").DataDBManager;
const fileDBManager = require("./DatabaseManagers").FileDBManager;
const SnowflakeID = require("snowflake-id").default;
const snowflake = new SnowflakeID();

class ImageManager {
    static acceptedTypes = ["bmp", "jpeg", "png"]
    static typeRegex = new RegExp(`^image\\\/(${ImageManager.acceptedTypes.map(x => require("regex-escape")(x)).join("|")})$`);
    static imageMaxSize = 4 * 1024; // 4 kiB

    /**
     * Get an image from its ID.
     * @param {string} id The image's ID.
     * @returns {Image=} The image.
     */
    static get(id) {
        let entry = dbManager.operation(db => db.prepare("SELECT * FROM images WHERE id = ?").get(id));
        if (!entry) return undefined;

        return ImageManager.create().readFromEntry(entry);
    }

    /**
     * Create a new Image.
     * @returns {Image} The new Image.
     */
    static create() {
        return new Image();
    }

    /**
     * Search images based on a set of conditions.
     * @param {ImageSearchParams} params The search parameters.
     * @returns {Image[]} The resulting images.
     */
    static search(params) {
        /** @type {Object[]} */
        let entries;

        let internal = params.internal || false;
        let limit = Math.min(Math.max(0, params.limit || 50), 50); 
        let offset = Math.max(0, params.offset || 0);
        let name = (params.name || "").replaceAll(/[%_\\]/g, "\\$&");
        let uploadedBy = params.uploadedBy;
        let type = params.type;
        
        if (internal) {
            entries = dbManager.operation(db => 
                db.prepare(`
                    SELECT *
                    FROM images
                    WHERE isExternal = 0
                    ORDER BY id DESC
                    LIMIT ?
                    OFFSET ?
                `).all(limit, offset)
            );
            if (name || uploadedBy || type) {
                /** @type {string[]} */
                let filterFiles = fileDBManager.operation(db => 
                    db.prepare(`
                        SELECT id, name
                        FROM files
                        WHERE
                            CASE 
                                WHEN ? = 1
                                THEN name LIKE ? ESCAPE '\\'
                                ELSE 1
                            END
                        AND
                            CASE
                                WHEN ? = 1
                                THEN addedBy = ?
                                ELSE 1
                            END
                        AND
                            CASE
                                WHEN ? = 1
                                THEN mime = ?
                                ELSE 1
                            END
                    `).all(name ? 1 : 0, name, uploadedBy ? 1 : 0, uploadedBy, type ? 1 : 0, `image/${type}`)
                );

                let filterFileIDs = filterFiles.map(x => x?.id);
                
                entries = entries.filter(x => filterFileIDs.includes(x.id));
                entries.forEach(x => {
                    let i;
                    if (i = filterFiles.findIndex(y => y.id == x.id)) {
                        x.name = filterFiles[i].name;
                        return;
                    }
                })
            }
        } else {
            entries = dbManager.operation(db => 
                db.prepare(`
                    SELECT *
                    FROM images
                    WHERE
                    isExternal = 1
                    ORDER BY id DESC
                    LIMIT ?
                    OFFSET ?
                `).all(limit, offset)
            );
        }

        return entries.map(x => ImageManager.create().readFromEntry(x)).map(x => {
            x.url = x.getURL();
            return x;
        });
    }
}

class Image {
    constructor() {
        /**
         * The ID of this image.
         * @type {string=}
         */
        this.id = undefined;
        /**
         * Whether this image is stored as a URL or file ID.
         * @type {boolean=}
         */
        this.isExternal = true;
        /**
         * The source of this image.
         * @type {string=}
         */
        this.source = undefined;
    }

    /**
     * Get the file associated with this image.
     * @returns {import("./FileManager").File=} The file.
     */
    getFile() {
        if (!this.isExternal) return undefined;
        if (!this.source) return undefined;
        return FileManager.get(this.source);
    }

    /**
     * Read a DB entry's data into this Image.
     * @param {Object} entry The entry.
     * @returns {Image} This image.
     */
    readFromEntry(entry) {
        [
            "name", // added for search stuff
            "id",
            "source"
        ].forEach(x => {
            this[x] = entry[x]?.toString?.();
        });

        this.isExternal = entry.isExternal ? true : false;

        return this;
    }

    /**
     * Check this image has an ID.
     * @returns {Image} This image.
     */
    checkID() {
        this.id ||= snowflake.generate();
        return this;
    }

    /**
     * Save this image.
     * @returns {Image} This image.
     */
    save() {
        if (!this.id) throw new AtomError("Cannot save image without ID.");
        if (!this.source) throw new AtomError("Cannot save image without source.");

        dbManager.operation(db => {
            db.prepare("REPLACE INTO images (id, isExternal, source) VALUES (?, ?, ?)").run(this.id, this.isExternal ? 1 : 0, this.source);
        });


        return this;
    }

    /**
     * Delete this image.
     */
    delete() {
        if (!this.id) throw new AtomError("Cannot delete image without ID.");

        dbManager.operation(db => {
            db.prepare("DELETE FROM images WHERE id = ?").run(this.id);
        });
        
        delete this;
    }

    /**
     * Get the source URL of this image.
     * @returns {string} The URL to the image.
     */
    getURL() {
        if (!this.id) throw new AtomError("Cannot get image without ID.");
        if (!this.isExternal) {
            let file = this.getFile();
            return `/file/${encodeURIComponent(file.id)}/${encodeURIComponent(file.name)}`
        } else {
            return this.source;
        }
    }
}

module.exports = ImageManager;

/**
 * @typedef {Object} ImageSearchParams
 * @property {number=} limit
 * @property {number=} offset
 * @property {string=} name
 * @property {string=} type
 * @property {boolean=} internal
 * @property {string=} uploadedBy
 */