'use strict';

const { param, validationResult, body } = require("express-validator");
const snowflakePattern = require("../../../../util/snowflakePattern");
const { MalformedRequest, ResourceNotFound, UserUnauthorised, ActionSuccessful } = require("../../../../util/standardResponses");
const ContentManager = require("../../../../managers/data/content/ContentManager");
const isAuthenticated = require("../../../../uses/isAuthenticated");
const { checkUser, permissions } = require("../../../../managers/data/GlobalPermissionsManager");
const defaultValidationResult = require("../../../../uses/defaultValidationResult");
const ContentFolderManager = require("../../../../managers/data/content/ContentFolderManager");

module.exports = {
    path: "/:id",
    priority: 0,
    methods: {
        /** @type {import("express").Handler[]} */
        get: [
            param("id")
                .notEmpty()
                .withMessage("Provided ID was empty.")
                .matches(snowflakePattern)
                .withMessage("Provided ID was not a Snowflake.")
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
                );
            }
        ],
        /** @type {import("express").Handler[]} */
        patch: [
            isAuthenticated,
            (req, res, next) => {
                if (checkUser(req.user.id, permissions.EditContent)) next();
                else UserUnauthorised(res);
            },
            param("id")
                .notEmpty()
                .withMessage("Provided ID was empty.")
                .isString()
                .withMessage("Provided ID was not a string.")
                .matches(snowflakePattern)
                .withMessage("Provided ID was not a Snowflake.")
            ,
            body("name")
                .optional()
                .isString()
                .withMessage("Provided name must be a string.")
                .trim()
                .matches(ContentManager.namePattern)
                .withMessage("Name must be between 1 and 48 characters long.")
            ,
            body("type")
                .optional()
                .isString()
                .withMessage("Provided type must be a string.")
                .default(ContentManager.ContentType.string)
                .isIn(Object.values(ContentManager.ContentType))
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
            body("data")
                .optional()
                .matches(ContentManager.stringContentPattern)
                .withMessage("Provided content must be 8192 characters or shorter.")
            ,
            body("removeParent")
                .optional()
                .isBoolean()
                .withMessage("Provided removeContent value was not a Boolean.")
                .toBoolean()
            ,
            defaultValidationResult,
            (req, res, next) => {
                let toEdit = ContentManager.get(req.params.id);
                if (!toEdit) {
                    return ResourceNotFound(res);
                }

                if (req.body.name) {
                    toEdit.name = req.body.name;
                }

                if (req.body.type) {
                    toEdit.type = req.body.type;
                }

                if (req.body.parentID) {
                    toEdit.folder = toEdit.parentID;
                }

                if (req.body.removeParent) {
                    toEdit.folder = undefined;
                }

                if (req.body.data) {
                    toEdit.data = toEdit.type == ContentManager.ContentType.number ? parseFloat(req.body.data) : req.body.data;
                }

                toEdit.save();
                toEdit = ContentManager.get(req.params.id);

                return res.json({
                    id: toEdit.id,
                    name: toEdit.name,
                    type: toEdit.type,
                    parentID: toEdit.folder?.id,
                    data: toEdit.data
                });
            }
        ],
        /** @type {import("express").Handler[]} */
        delete: [
            isAuthenticated,
            (req, res, next) => {
                if (checkUser(req.user.id, permissions.DeleteContent)) next();
                else UserUnauthorised(res);
            },
            param("id")
                .notEmpty()
                .withMessage("Provided ID was empty.")
                .isString()
                .withMessage("Provided ID was not a string.")
                .matches(snowflakePattern)
                .withMessage("Provided ID was not a Snowflake.")
            ,
            defaultValidationResult,
            (req, res, next) => {
                let toDelete = ContentManager.get(req.params.id);
                if (!toDelete) {
                    return ResourceNotFound(res);
                }

                toDelete.delete();
                
                return ActionSuccessful(res);
            }
        ]
    }
}