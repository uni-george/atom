'use strict';

const passport = require("passport");
const AuthManager = require("../../../managers/auth/AuthManager");
const isNotAuthenticated = require("../../../uses/isNotAuthenticated");

module.exports = {
    path: "/google",
    priority: 1,
    methods: {
        get: [
            isNotAuthenticated,
            (req, res, next) => {
                if (!AuthManager.getEnabledSignupMethods().includes("google")) return next();

                const attemptType = "register";
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
