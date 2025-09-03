'use strict';

const { param, validationResult, query, body } = require("express-validator");
const snowflakePattern = require("../../../../util/snowflakePattern");
const { MalformedRequest, ResourceNotFound, UserUnauthorised } = require("../../../../util/standardResponses");
const ContentFolderManager = require("../../../../managers/data/content/ContentFolderManager");
const ContentManager = require("../../../../managers/data/content/ContentManager");
const isAuthenticated = require("../../../../uses/isAuthenticated");
const { checkUser, permissions } = require("../../../../managers/data/GlobalPermissionsManager");

module.exports = {
    path: "/folder/:id",
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
            query("includeContent")
                .optional()
                .isBoolean()
                .withMessage("Provided value was not a boolean value.")
            ,
            query("includePath")
                .optional()
                .isBoolean()
                .withMessage("Provided value was not a boolean value.")
            ,
            (req, res, next) => {
                let issues = validationResult(req);
                if (!issues.isEmpty()) {
                    return MalformedRequest(res, issues);
                }

                next();
            },
            (req, res, next) => {
                let folder = ContentFolderManager.get(req.params.id);
                if (!folder) return ResourceNotFound(res);

                let childContent;
                if (req.query.includeContent === "true") {
                    childContent = ContentManager.getFolderDirectContent(req.params.id).map(x => ({
                        id: x.id,
                        name: x.name,
                        type: x.type
                    }));
                }

                let path;
                if (req.query.includePath === "true") {
                    path = folder.getPath();
                }

                return res.json(
                    {
                        id: folder.id,
                        name: folder.name,
                        path,
                        childFolders: folder.getDirectChildFolderIDs() || [],
                        childContent
                    }
                );
            }
        ],
        /** @type {import("express").Handler[]} */
        patch: [
            isAuthenticated,
            (req, res, next) => {
                if (checkUser(req.user.id, permissions.EditContentFolders)) next();
                else UserUnauthorised(res);
            },
            param("id")
                .notEmpty()
                .withMessage("Provided ID was empty.")
                .matches(snowflakePattern)
                .withMessage("Provided ID was not a Snowflake.")
            ,
            body("name")
                .optional()
                .isString()
                .withMessage("Provided name must be a string.")
                .trim()
                .matches(ContentFolderManager.folderNamePattern)
                .withMessage("Name must be within 1 and 32 characters long."),
            body("parentID")
                .optional()
                .isString()
                .withMessage("Provided parent folder ID was not a string.")
                .custom(val => val ? snowflakePattern.test(val) : true)
                .withMessage("Provided parent folder ID was not a Snowflake.")
                .custom(val => val ? ContentFolderManager.get(val) : true)
                .withMessage("Provided parent folder ID points to a non-existent folder.")
                .custom((val, { req }) => val ? !ContentFolderManager.get(req.params.id)?.getChildFolderIDs?.()?.includes?.(val) : true)
                .withMessage("Provided parent folder ID points to a folder that is currently a child of the folder."),
            (req, res, next) => {
                let issues = validationResult(req);
                if (!issues.isEmpty()) {
                    return MalformedRequest(res, issues);
                }

                next();
            },
            (req, res, next) => {
                let toEdit = ContentFolderManager.get(req.params.id);
                if (!toEdit) {
                    return ResourceNotFound(res);
                }

                if (req.body.name) {
                    toEdit.name = req.body.name;
                }

                if (req.body.parentID) {
                    toEdit.parent = req.body.parentID;
                }

                toEdit.save();
                toEdit = ContentFolderManager.get(req.params.id);

                return res.json({
                    id: toEdit.id,
                    name: toEdit.name,
                    parentID: toEdit.parent?.id,
                    path: toEdit.getPath() || []
                });
            }
        ]
    }
}