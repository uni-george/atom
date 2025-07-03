'use strict';

const AuthManager = require("../../../managers/auth/AuthManager");

module.exports = {
    path: "/local",
    priority: 0,
    methods: {
        get: [
            /** @type {import("express").Handler} */
            (req, res, next) => {
                if (!AuthManager.getEnabledSignupMethods().includes("local")) return next();
                
            }
        ]
    }
}