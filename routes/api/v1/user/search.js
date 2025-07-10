'use strict';

const { query, validationResult } = require("express-validator");
const GlobalPermissionsManager = require("../../../../managers/data/GlobalPermissionsManager");
const isAuthenticated = require("../../../../uses/isAuthenticated");
const { UserUnauthorised, MalformedRequest } = require("../../../../util/standardResponses");
const snowflakePattern = require("../../../../util/snowflakePattern");
const UserManager = require("../../../../managers/data/UserManager");

module.exports = {
    path: "/search",
    priority: 0,
    methods: {
        /** @type {import("express").Handler[]} */
        get: [
            isAuthenticated,
            (req, res, next) => {
                if (GlobalPermissionsManager.checkUser(req.user.id, GlobalPermissionsManager.permissions.ManageUsers)) return next();
                else return UserUnauthorised(res);
            },
            query("limit")
                .optional()
                .isNumeric()
                .withMessage("Limit must be a number.")
                .isInt({
                    min: 1,
                    max: 50
                })
                .withMessage("Limit must be an integer within 1 and 50."),
            query("offset")
                .optional()
                .isNumeric()
                .withMessage("Offset must be a number.")
                .isInt({
                    min: 0
                })
                .withMessage("Offset must be an integer of 0 or above."),
            query("group")
                .optional()
                .isString()
                .withMessage("Provided group must be a group ID.")
                .matches(snowflakePattern)
                .withMessage("Group is not a Snowflake ID."),
            query("sortBy")
                .optional()
                .isString()
                .withMessage("Provided value to sort by must be a string.")
                .isIn(Object.keys(UserManager.sortByColumns))
                .withMessage(`Provided value to sort by must be one of: ${Object.keys(UserManager.sortByColumns).join(", ")}`),
            query("sortDirection")
                .optional()
                .isString()
                .withMessage("Provided sort direction must be a string.")
                .isIn([
                    "ascending",
                    "descending"
                ])
                .withMessage("Provided sort direction must be one of: ascending, descending"),
            query("name")
                .optional()
                .trim()
                .isString()
                .withMessage("Provided name must be a string.")
                .matches(UserManager.namePattern)
                .withMessage("Please provide a name between 1 and 48 characters that does not include newlines."),
            (req, res, next) => {
                let issues = validationResult(req);
                if (!issues.isEmpty()) {
                    return MalformedRequest(res, issues);
                }

                return res.json(UserManager.search({
                    limit: req.query.limit,
                    offset: req.query.offset,
                    group: req.query.group,
                    sortBy: req.query.sortBy,
                    sortDirection: req.query.sortDirection,
                    name: req.query.name
                }).map(x => ({
                    id: x.id,
                    name: x.name,
                    avatarID: x.avatarID
                })));
            }
        ]
    }
}