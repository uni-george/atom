'use strict';

const AuthManager = require("../../../../../managers/auth/AuthManager");

module.exports = {
    path: "/login",
    priority: 0,
    methods: {
        get: [
            /** @type {import("express").Handler} */
            (req, res, next) => {
                return res.json(
                    AuthManager.getEnabledLoginMethods()
                );
            }
        ]
    }
}