'use strict';

const { body, validationResult } = require("express-validator");
const ContentFolderManager = require("../../../../managers/data/content/ContentFolderManager");
const snowflakePattern = require("../../../../util/snowflakePattern");
const { MalformedRequest, UserUnauthorised } = require("../../../../util/standardResponses");
const isAuthenticated = require("../../../../uses/isAuthenticated");
const { checkUser, permissions } = require("../../../../managers/data/GlobalPermissionsManager");

module.exports = {
    path: "/folder",
    priority: 0,
    methods: {
        /** @type {import("express").Handler[]} */
        post: [
            isAuthenticated,
            (req, res, next) => {
                if (checkUser(req.user.id, permissions.CreateContentFolders)) next();
                else UserUnauthorised(res);
            },
            body("name")
                .trim()
                .notEmpty()
                .withMessage("A name must be provided.")
                .isString()
                .withMessage("Provided name must be a string.")
                .matches(ContentFolderManager.folderNamePattern)
                .withMessage("Name must be within 1 and 32 characters long.")
            ,
            body("parentID")
                .optional()
                .isString()
                .withMessage("Provided parent folder ID must be a string.")
                .matches(snowflakePattern)
                .withMessage("Provided parent folder ID was not a Snowflake.")
                .custom(val => ContentFolderManager.get(val))
                .withMessage("Provided parent folder ID points to a non-existent folder.")
            ,
            body("removeParent")
                .optional()
                .isBoolean()
                .withMessage("Provided removeContent value was not a Boolean.")
                .toBoolean()
            ,
            (req, res, next) => {
                let issues = validationResult(req);
                if (!issues.isEmpty()) {
                    return MalformedRequest(res, issues);
                }

                next();
            },
            (req, res, next) => {
                let created = ContentFolderManager.create();
                created.checkID();

                created.name = req.body.name;

                if (req.body.parentID) {
                    created.parent = req.body.parentID;
                }

                created.save();
                created = ContentFolderManager.get(created.id);

                return res.json({
                    id: created.id,
                    name: created.name,
                    parentID: created.parent?.id,
                    path: created.getPath() || []
                });
            }
        ]
    }
}