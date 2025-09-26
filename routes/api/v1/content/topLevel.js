'use strict';

const { body } = require("express-validator");
const ContentFolderManager = require("../../../../managers/data/content/ContentFolderManager");
const ContentManager = require("../../../../managers/data/content/ContentManager");
const isAuthenticated = require("../../../../uses/isAuthenticated");
const defaultValidationResult = require("../../../../uses/defaultValidationResult");
const snowflakePattern = require("../../../../util/snowflakePattern");

module.exports = {
    path: "/",
    priority: 0,
    methods: {
        /** @type {import("express").Handler[]} */
        get: [
            (req, res, next) => {
                return res.json(
                    {
                        folders: ContentFolderManager.getTopLevel().map(x => (
                            {
                                id: x.id,
                                name: x.name
                            }
                        )),
                        content: ContentManager.getTopLevel().map(x => (
                            {
                                id: x.id,
                                name: x.name,
                                type: x.type || "string"
                            }
                        ))
                    }
                );
            }
        ],
        /** @type {import("express").Handler[]} */
        post: [
            isAuthenticated,
            body("name")
                .notEmpty()
                .withMessage("A name must be provided.")
                .isString()
                .withMessage("Provided name was not a string.")
                .matches(ContentManager.namePattern)
                .withMessage("Name must be between 1 and 48 characters long."),
            body("type")
                .optional()
                .isString()
                .withMessage("Provided type must be a string.")
                .default(ContentManager.ContentType.string)
                .isIn(Object.values(ContentManager.ContentType))
                .withMessage(`Type must be one of: ${Object.values(ContentManager.ContentType).join(", ")}`),
            body("parentID")
                .optional()
                .isString()
                .withMessage("Provided parent folder ID must be a string.")
                .matches(snowflakePattern)
                .withMessage("Provided parent folder ID was not a Snowflake.")
                .custom(val => ContentFolderManager.get(val))
                .withMessage("Provided parent folder ID points to a non-existent folder."),
            body("data")
                .optional()
                .matches(ContentManager.stringContentPattern)
                .withMessage("Provided content must be 8192 characters or shorter.")
            ,
            defaultValidationResult,
            (req, res, next) => {
                let created = ContentManager.create();
                created.checkID();
                
                created.name = req.body.name;

                if (req.body.parentID) {
                    created.folder = req.body.parentID;
                }

                created.type = ContentManager.ContentType[req.body.type || "string"] || ContentManager.ContentType.string;

                if (req.body.data) {
                    created.data = req.body.data;
                }

                created.save();

                created = ContentManager.get(created.id);

                return res.json({
                    id: created.id,
                    name: created.name,
                    type: created.type,
                    parentID: created.folder?.id,
                    data: created.data
                });
            }
        ]
    }
}