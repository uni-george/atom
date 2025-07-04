'use strict';

const passport = require("passport");
const AuthManager = require("../../../managers/auth/AuthManager");
const { ResourceNotFound } = require("../../../util/standardResponses");
const isNotAuthenticated = require("../../../uses/isNotAuthenticated");

module.exports = {
    path: "/google",
    priority: 1,
    methods: {
        get: [
            isNotAuthenticated,
            (req, res, next) => {
                // check enabled
                if (!AuthManager.getEnabledLoginMethods().includes("local")) return next();

                const attemptType = "login";
                const state = Buffer.from(JSON.stringify({ 
                    attemptType,
                    ip: req.get("CF-Connecting-IP") || req.get("X-Forwarded-For") || req.ip,
                    userAgent: req.get("User-Agent")
                })).toString("base64");
                passport.authenticate("google", {
                    state
                })(req, res, next);
            }
        ]
    }
}