'use strict';

const { param, validationResult } = require("express-validator");
const snowflakePattern = require("../../../../util/snowflakePattern");
const { MalformedRequest, ResourceNotFound } = require("../../../../util/standardResponses");
const ContentManager = require("../../../../managers/data/content/ContentManager");

module.exports = {
    path: "/:id",
    priority: 0,
    methods: {
        /** @type {import("express").Handler[]} */
        get: [
            param("id")
                .notEmpty()
                .withMessage("Provided ID was empty.")
                // .matches(snowflakePattern)
                // .withMessage("Provided ID was not a Snowflake.")
            ,
            (req, res, next) => {
                let issues = validationResult(req);
                if (!issues.isEmpty()) {
                    return MalformedRequest(res, issues);
                }

                next();
            },
            (req, res, next) => {
                let content = ContentManager.get(req.params.id);
                if (!content) return ResourceNotFound(res);

                return res.json(
                    {
                        id: content.id,
                        name: content.name,
                        type: content.type,
                        parentID: content.folder?.id,
                        data: content.data
                    }
                )
            }
        ]
    }
}