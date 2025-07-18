'use strict';

const passport = require("passport");
const AtomError = require("../../../util/AtomError");
const addSessionDeviceInfo = require("../../../uses/addSessionDeviceInfo");

module.exports = {
    path: "/redirect",
    priority: 0,
    methods: {
        get: [
            /** @type {import("express").Handler} */
            (req, res, next) => {
                passport.authenticate("google", {
                    failWithError: true
                })(req, res, next);
            },
            addSessionDeviceInfo,
            /** @type {import("express").Handler} */
            (req, res, next) => {
                res.redirect("/dashboard");
            },
            /** @type {import("express").ErrorRequestHandler} */
            (err, req, res, next) => {
                const state = JSON.parse(Buffer.from(req.query.state, "base64").toString());

                let failRedirect = "/login";

                if (state) {
                    switch (state.attemptType) {
                        case "register":
                            failRedirect = "/signup"
                            break;
                        case "login":
                        default:
                            failRedirect = "/login";
                    }
                }

                if (!(err instanceof AtomError)) return res.redirect(`${failRedirect}?error=google`);

                res.redirect(`${failRedirect}?${[
                    "error=google",
                    `errorCode=${encodeURIComponent(err.code)}`,
                    `errorMessage=${encodeURIComponent(err.message)}`
                ].join("&")}`);
            }
        ]
    }
}