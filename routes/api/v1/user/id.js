'use strict';

const { param, validationResult } = require("express-validator");
const snowflakePattern = require("../../../../util/snowflakePattern");
const { MalformedRequest, ResourceNotFound } = require("../../../../util/standardResponses");
const UserManager = require("../../../../managers/data/UserManager");
const isAuthenticated = require("../../../../uses/isAuthenticated");

module.exports = {
    path: "/:id",
    priority: -1,
    methods: {
        /** @type {import("express").Handler[]} */
        get: [
            isAuthenticated,
            param("id")
                .notEmpty()
                .withMessage("Provided ID was empty.")
                .matches(snowflakePattern)
                .withMessage("Provided ID was not a Snowflake."),
            (req, res, next) => {
                let issues = validationResult(req);
                if (!issues.isEmpty()) {
                    return MalformedRequest(res, issues);
                }

                let user = UserManager.get(req.params.id);
                if (!user) return ResourceNotFound(res);

                return res.json(
                    {
                        id: user.id,
                        name: user.name,
                        avatarID: user.avatarID
                    }
                );
            }
        ]
    }
}