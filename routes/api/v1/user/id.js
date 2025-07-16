'use strict';

const { param, validationResult, body } = require("express-validator");
const snowflakePattern = require("../../../../util/snowflakePattern");
const { MalformedRequest, ResourceNotFound, UserUnauthorised, ActionSuccessful } = require("../../../../util/standardResponses");
const UserManager = require("../../../../managers/data/UserManager");
const isAuthenticated = require("../../../../uses/isAuthenticated");
const { checkUser, permissions } = require("../../../../managers/data/GlobalPermissionsManager");
const ImageManager = require("../../../../managers/data/ImageManager");

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
        ],
        /** @type {import("express").Handler[]} */
        patch: [
            isAuthenticated,
            (req, res, next) => {
                if ((req.params.id == req.user.id && checkUser(req.user.id, permissions.EditProfile)) || checkUser(req.user.id, permissions.ManageUsers)) next();
                else UserUnauthorised(res);
            },
            (req, res, next) => {
                Object.defineProperty(req, 'query', { ...Object.getOwnPropertyDescriptor(req, 'query'), value: req.query, writable: true });
                next();
            },
            param("id")
                .notEmpty()
                .withMessage("Provided ID was empty.")
                .matches(snowflakePattern)
                .withMessage("Provided ID was not a Snowflake."),
            body("name")
                .optional()
                .isString()
                .withMessage("Provided name must be a string.")
                .trim()
                .matches(UserManager.namePattern)
                .withMessage("Name must be between 1 and 48 characters long."),
            body("avatarID")
                .optional()
                .isString()
                .withMessage("Provided avatar ID must be a string.")
                .matches(snowflakePattern)
                .withMessage("Provided avatar ID must be a Snowflake ID.")
                .custom(val => ImageManager.get(val))
                .withMessage("Requested image for avatar ID does not exist."),
            (req, res, next) => {
                let issues = validationResult(req);
                if (!issues.isEmpty()) {
                    return MalformedRequest(res, issues);
                }

                let toEdit = UserManager.get(req.params.id);
                if (!toEdit) {
                    return ResourceNotFound(res);
                }

                if (req.body.name) {
                    toEdit.name = req.body.name;
                }

                if (req.body.avatarID) {
                    toEdit.avatarID = req.body.avatarID;
                }

                toEdit.save();
                toEdit = UserManager.get(toEdit.id);

                return res.json({
                    id: toEdit.id,
                    name: toEdit.name,
                    avatarID: toEdit.avatarID
                })
            }
        ],
        delete: [
            isAuthenticated,
            (req, res, next) => {
                if ((req.params.id == req.user.id && checkUser(req.user.id, permissions.EditProfile)) || checkUser(req.user.id, permissions.ManageUsers)) next();
                else UserUnauthorised(res);
            },
            param("id")
                .notEmpty()
                .withMessage("Provided ID was empty.")
                .matches(snowflakePattern)
                .withMessage("Provided ID was not a Snowflake.")
                .custom((val, meta) => val != meta.req.user.id)
                .withMessage("[TEMPORARY] Cannot delete own account."),
            (req, res, next) => {
                let issues = validationResult(req);
                if (!issues.isEmpty) {
                    return MalformedRequest(res, issues);
                }

                let user = UserManager.get(req.params.id);
                if (!user) {
                    return ResourceNotFound(res);
                }

                if (user.id == req.user.id) {
                    return UserUnauthorised(res);
                }

                user.delete();
                return ActionSuccessful(res);
            }
        ]
    }
}