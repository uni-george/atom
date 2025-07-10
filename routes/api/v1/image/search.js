'use strict';

const { query, validationResult } = require("express-validator");
const isAuthenticated = require("../../../../uses/isAuthenticated");
const FileManager = require("../../../../managers/data/FileManager");
const ImageManager = require("../../../../managers/data/ImageManager");
const { MalformedRequest } = require("../../../../util/standardResponses");
const snowflakePattern = require("../../../../util/snowflakePattern");

module.exports = {
    path: "/search",
    priority: 1,
    methods: {
        /** @type {import("express").Handler[]} */
        get: [
            isAuthenticated,
            query("name")
                .optional()
                .trim()
                .isString()
                .withMessage("Provided name must be a string.")
                .matches(FileManager.fileNamePattern)
                .withMessage("File name must be between 1-32 alphanumic characters."),
            query("type")
                .optional()
                .trim()
                .isString()
                .withMessage("Type must be a string.")
                .isIn(ImageManager.acceptedTypes)
                .withMessage(`Image type must be one of the following: ${ImageManager.acceptedTypes.join(", ")}`)
                .custom((_val, { req }) => req.query.internal === "true")
                .withMessage("Type can only be set for internal images."),
            query("internal")
                .optional()
                .isBoolean()
                .withMessage("Internal must be a boolean value.")
                .customSanitizer(val => val === "true"),
            query("limit")
                .optional()
                .isNumeric()
                .withMessage("Limit must be a numeric value.")
                .isInt({
                    min: 1,
                    max: 50
                })
                .withMessage("Limit must be an integer between 1 and 50.")
                .customSanitizer(value => Number(value)),
            query("offset")
                .optional()
                .isNumeric()
                .withMessage("Offset must be a numeric value.")
                .isInt({
                    min: 0
                })
                .withMessage("Offset must be an integer of 0 or above.")
                .customSanitizer(value => Number(value)),
            query("uploadedBy")
                .optional()
                .isString()
                .withMessage("Uploaded by must be a string.")
                .matches(snowflakePattern)
                .withMessage("Provided ID is not a Snowflake.")
                .custom((_val, { req }) => req.query.internal === "true")
                .withMessage("Uploaded by can only be set for internal images."),
            (req, res, next) => {
                let issues = validationResult(req);
                if (!issues.isEmpty()) {
                    return MalformedRequest(res, issues);
                }

                return res.json({
                    woo: `${ImageManager.typeRegex}`
                });
            }
        ]
    }
}