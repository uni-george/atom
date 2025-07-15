'use strict';

const { param, validationResult } = require("express-validator");
const snowflakePattern = require("../../../../util/snowflakePattern");
const { MalformedRequest, ResourceNotFound } = require("../../../../util/standardResponses");
const ImageManager = require("../../../../managers/data/ImageManager");

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
                .withMessage("Provided ID was not a Snowflake."),
            (req, res, next) => {
                let issues = validationResult(req);
                if (!issues.isEmpty()) {
                    return MalformedRequest(res, issues);
                }

                let image = ImageManager.get(req.params.id);
                if (!image) return ResourceNotFound(res);

                if (image.isExternal) {
                    if (!image.source) return ResourceNotFound(res);
                    else return res.redirect(image.getURL());
                } else {
                    let file = image.getFile();
                    if (!file) {
                        // file no longer exists - clean up
                        image.delete();
                        return ResourceNotFound(res);
                    }

                    return res.redirect(image.getURL());
                }
            }
        ]
    }
}