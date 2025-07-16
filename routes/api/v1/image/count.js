'use strict';

const { query, validationResult } = require("express-validator");
const isAuthenticated = require("../../../../uses/isAuthenticated");
const FileManager = require("../../../../managers/data/FileManager");
const ImageManager = require("../../../../managers/data/ImageManager");
const snowflakePattern = require("../../../../util/snowflakePattern");
const { MalformedRequest } = require("../../../../util/standardResponses");

module.exports = {
    path: "/count",
    priority: 0,
    methods: {
        /** @type {import("express").Handler[]} */
        get: [
            isAuthenticated,
            (req, res, next) => {
                Object.defineProperty(req, 'query', { ...Object.getOwnPropertyDescriptor(req, 'query'), value: req.query, writable: true });
                next();
            },
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
                    count: ImageManager.search({
                        name: req.query.name,
                        type: req.query.type,
                        internal: req.query.internal,
                        uploadedBy: req.query.uploadedBy
                    })?.length || 0
                })
            }
        ]
    }
}