'use strict';

const AtomError = require("../../util/AtomError");

class DatabaseManager {
    /**
     * True/false depending on whether the database manager is ready to be used.
     * @type {boolean}
     * @private
     */
    #ready = false;

    /**
     * The path of the database.
     * @type {string}
     * @private
     */
    #path;

    /**
     * All table definitions. !-!-!-! THIS MUST BE SAFE !-!-!-!
     * @type {String[]}
     * @private
     */
    #tableDefinitions = [

    ];

    /**
     * Set the table definitions.
     * @param {string[]} definitions The table definitions.
     * @returns {DatabaseManager} This DatabaseManager.
     */
    setDefinitions(definitions) {
        this.#tableDefinitions = definitions;
        // clear this function
        this.setDefinitions = undefined;
        return this;
    }

    /**
     * Initialise this DatabaseManager.
     * @param {string} path The path to the database file.
     * @returns {DatabaseManager} This DatabaseManager.
     */
    init(path) {
        if (!path) throw new AtomError("no database path provided");

        this.#path = path;
        this.#ready = true;

        // create tables if required
        this.operation(db => {
            this.#tableDefinitions.forEach(x => {
                db.exec(`CREATE TABLE IF NOT EXISTS ${x}`);
            });
        });

        return this;
    }

    /**
     * @callback DBFunction
     * @param {import("better-sqlite3").Database} db
     */

    /**
     * Run a function on the database.
     * @param {DBFunction} f The function to run on the database.
     * @returns {any} The result of the function.
     */
    operation(f) {
        if (!this.#ready) throw new AtomError("this database manager has not been initialised");
        // load db
        let db = require("better-sqlite3")(this.#path);
        let output;
        try {
            output = f(db);
        } catch (e) {
            db.close();
            throw e;
        }
        db.close();
        return output;
    }

    /**
     * Get the path of the DB this DatabaseManager manages.
     * @returns {string=} The path the DB is stored at.
     */
    getPath() {
        return this.#path;
    }
}

class DatabaseManagers {
    static DataDBManager = new DatabaseManager();
    
    static FileDBManager = new DatabaseManager();
}

module.exports = DatabaseManagers;