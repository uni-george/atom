'use strict';

/**
 * @enum {string}
 */
const AuthenticationMethod = {
    local: "local",
    google: "google"
}

class AuthManager {
    /**
     * Clear require cache (for reloading config).
     */
    static clearRequireCache() {
        delete require.cache[require.resolve("../../config/auth/methods.json")];
    }

    /**
     * Get currently enabled login methods.
     * @returns {AuthenticationMethod[]} Useable login methods.
     */
    static getEnabledLoginMethods() {
        return AuthManager.#getEnabledAuthMethods("login");
    }

    /**
     * Get currently enabled signup methods.
     * @returns {AuthenticationMethod[]} Useable signup methods.
     */
    static getEnabledSignupMethods() {
        return AuthManager.#getEnabledAuthMethods("signup");
    }

    /**
     * Get currently enabled auth methods.
     * @param {"login"|"signup"} type The auth type to get methods for.
     * @returns {AuthenticationMethod[]} The useable methods.
     */
    static #getEnabledAuthMethods(type) {
        if (type != "login" && type != "signup") throw new Error("Can't get methods for unknown auth type.");

        try {
            const methods = require("../../config/auth/methods.json");

            /** @type {AuthenticationMethod[]} */
            let available = [];

            Object.keys(methods).forEach(x => {
                if (methods[x][type]?.enabled) available.push(x);
            });

            return available;
        } catch {
            return [];
        }
    }
}

module.exports = AuthManager;