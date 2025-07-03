'use strict';

const passport = require("passport");
const AtomError = require("../../../util/AtomError");
const { ActionSuccessful, ResourceNotFound } = require("../../../util/standardResponses");
const AuthManager = require("../../../managers/auth/AuthManager");

module.exports = {
    path: "/local",
    priority: 0,
    methods: {
        post: [
            /** @type {import("express").Handler} */
            (req, res, next) => {
                if (!AuthManager.getEnabledLoginMethods().includes("local")) return ResourceNotFound(res);

                const attemptType = "login";
                const state = Buffer.from(JSON.stringify({ 
                    attemptType,
                    ip: req.get("CF-Connecting-IP") || req.get("X-Forwarded-For") || req.ip,
                    userAgent: req.get("User-Agent")
                })).toString("base64");

                let failRedirect = "/login?error=local";

                passport.authenticate("local", {
                    failureRedirect: failRedirect,
                    failWithError: true,
                    state: state
                })(req, res, next);
            },
            /** @type {import("express").Handler} */
            (req, res, next) => {
                ActionSuccessful(res);
            },
            /** @type {import("express").ErrorRequestHandler} */
            (err, req, res, next) => {
                if (err instanceof AtomError) {
                    res.status(400);
                    return res.json(
                        {
                            code: 400,
                            message: "Incorrect username or password."
                        }
                    )
                }

                return next(err);
            }
        ]
    }
}