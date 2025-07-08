'use strict';

const { query, validationResult } = require("express-validator");
const GlobalPermissionsManager = require("../../../../managers/data/GlobalPermissionsManager");
const UserManager = require("../../../../managers/data/UserManager");
const isAuthenticated = require("../../../../uses/isAuthenticated");
const snowflakePattern = require("../../../../util/snowflakePattern");
const { UserUnauthorised, MalformedRequest } = require("../../../../util/standardResponses");

module.exports = {
    path: "/count",
    priority: 0,
    methods: {
        /** @type {import("express").Handler[]} */
        get: [
            isAuthenticated,
            (req, res, next) => {
                if (GlobalPermissionsManager.checkUser(req.user.id, GlobalPermissionsManager.permissions.ManageUsers)) return next();
                else return UserUnauthorised(res);
            },

            // same as search.js
            query("group")
                .optional()
                .isString()
                .withMessage("Provided group must be a group ID.")
                .matches(snowflakePattern)
                .withMessage("Group is not a Snowflake ID."),
            query("name")
                .optional()
                .isString()
                .withMessage("Provided name must be a string.")
                .matches(UserManager.namePattern)
                .withMessage("Please provide a name between 1 and 48 characters that does not include newlines."),

            (req, res, next) => {
                let issues = validationResult(req);
                if (!issues.isEmpty()) {
                    return MalformedRequest(res, issues);
                }

                return res.json({
                    count: UserManager.count({
                        group: req.query.group,
                        name: req.query.name
                    }) || 0
                })
            }
        ]
    }
}