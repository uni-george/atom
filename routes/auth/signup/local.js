'use strict';

const passport = require("passport");
const AuthManager = require("../../../managers/auth/AuthManager");
const isNotAuthenticated = require("../../../uses/isNotAuthenticated");
const { ResourceNotFound, ActionSuccessful, MalformedRequest } = require("../../../util/standardResponses");
const AtomError = require("../../../util/AtomError");
const { body, validationResult } = require("express-validator");
const LocalAuthManager = require("../../../managers/auth/LocalAuthManager");
const addSessionDeviceInfo = require("../../../uses/addSessionDeviceInfo");

module.exports = {
    path: "/local",
    priority: 1,
    methods: {
        post: [
            /** @type {import("express").Handler} */
            (req, res, next) => {
                if (!AuthManager.getEnabledSignupMethods().includes("local")) return ResourceNotFound(res);
                return next();
            },
            isNotAuthenticated,
            body("username")
                .trim()
                .notEmpty()
                .withMessage("Username cannot be empty.")
                .matches(LocalAuthManager.usernamePattern)
                .withMessage(`Username must match RegEx: ${LocalAuthManager.usernamePattern}`),
            body("password")
                .notEmpty()
                .withMessage("Password cannot be empty.")
                .matches(LocalAuthManager.passwordPattern)
                .withMessage(`Password must match RegEx: ${LocalAuthManager.passwordPattern}`),
            /** @type {import("express").Handler} */
            (req, res, next) => {
                // check params
                const paramResult = validationResult(req);
                if (!paramResult.isEmpty()) {
                    return MalformedRequest(res, paramResult.array());
                }

                req.authAttemptType = "register";

                passport.authenticate("local", {
                    failWithError: true
                })(req, res, next);
            },
            addSessionDeviceInfo,
            /** @type {import("express").Handler} */
            (req, res, next) => {
                return ActionSuccessful(res);
            },
            /** @type {import("express").ErrorRequestHandler} */
            (err, req, res, next) => {
                if (err instanceof AtomError) {
                    res.status(400);
                    return res.json(
                        {
                            code: 400,
                            message: err.message || "Incorrect username or password.",
                            errorCode: err.code || "ERR_UNKNOWN"
                        }
                    )
                }

                return next(err);
            }
        ]
    }
}