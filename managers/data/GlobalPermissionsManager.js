'use strict';

const { get } = require("./UserManager");

const dbManager = require("./DatabaseManagers").DataDBManager;

/**
 * An enum for storing global permissions.
 * @enum {string}
 * @readonly
 */
const GlobalPermissions = {
    Administrator:          "ADMINISTRATOR",
    AccessDashboard:        "ACCESS_DASHBOARD",
    UploadFiles:            "UPLOAD_FILES",
    DownloadFiles:          "DOWNLOAD_FILES",
    ManageUsers:            "MANAGE_USERS",
    EditProfile:            "EDIT_PROFILE",
    ViewAPIDocs:            "VIEW_API_DOCS", // only used when requiresAuthentication in /config/api/docs.json is set to true
    CreateContent:          "CREATE_CONTENT",
    EditContent:            "EDIT_CONTENT",
    DeleteContent:          "DELETE_CONTENT",
    CreateContentFolders:   "CREATE_CONTENT_FOLDERS",
    EditContentFolders:     "EDIT_CONTENT_FOLDERS",
    DeleteContentFolders:   "DELETE_CONTENT_FOLDERS"
}

class GlobalPermissionsManager {
    static permissions = GlobalPermissions;

    /**
     * Check if a user has a permission.
     * @param {string} userID The user's ID.
     * @param {GlobalPermissions} permission The permission.
     * @returns {boolean} True/false depending on whether the user has the permission.
     */
    static checkUser(userID, permission) {
        if (!GlobalPermissionsManager.#validatePermission(permission)) throw new Error("Cannot check invalid permission.");
        if (!get(userID)) throw new Error("Cannot check permission for non-existent user.");

        // TODO: add checking for user groups etc
        if (GlobalPermissionsManager.#userHasPermission(userID, GlobalPermissions.Administrator)) return true;
        else return GlobalPermissionsManager.#userHasPermission(userID, permission);
    }

    static #userHasPermission(userID, permission) {
        if (!GlobalPermissionsManager.#validatePermission(permission)) throw new Error("Cannot check invalid permission.");
        return dbManager.operation(db => db.prepare("SELECT * FROM userGlobalPermissions WHERE userID = ? AND permission = ?").get(userID, permission)) !== undefined;
    }

    /**
     * Allow a global permission for a user.
     * @param {string} userID The ID of the user.
     * @param {GlobalPermissions} permission The permission to allow.
     * @returns {GlobalPermissionsManager} A reference to the GlobalPermissionsManager.
     */
    static allowUser(userID, permission) {
        if (!GlobalPermissionsManager.#validatePermission(permission)) throw new Error("Cannot allow non-existent permission.");
        if (!get(userID)) throw new Error("Cannot allow permission for non-existent user.");

        dbManager.operation(db => {
            db.prepare("REPLACE INTO userGlobalPermissions (userID, permission) VALUES (?, ?)").run(userID, permission)
        });

        return GlobalPermissionsManager;
    }

    /**
     * Forbid a global permission for a user.
     * @param {string} userID The ID of the user.
     * @param {GlobalPermissions} permission The permission to forbid.
     * @returns {GlobalPermissionsManager} A reference to the GlobalPermissionsManager.
     */
    static forbidUser(userID, permission) {
        if (!GlobalPermissionsManager.#validatePermission(permission)) throw new Error("Cannot forbid non-existent permission.");
        if (!get(userID)) throw new Error("Cannot forbid permission for non-existent user.");

        dbManager.operation(db => {
            db.prepare("DELETE FROM userGlobalPermissions WHERE userID = ? AND permission = ?").run(userID, permission);
        });

        return GlobalPermissionsManager;
    }

    /**
     * Check a permission exists.
     * @param {GlobalPermissions} permission The permission.
     * @returns {boolean} True/false depending on whether the permission is valid.
     */
    static #validatePermission(permission) {
        return Object.keys(GlobalPermissions).map(x => GlobalPermissions[x]).includes(permission);
    }
}

module.exports = GlobalPermissionsManager;