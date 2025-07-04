'use strict';

const { param, validationResult } = require("express-validator");
const FileManager = require("../../managers/data/FileManager");
const GlobalPermissionsManager = require("../../managers/data/GlobalPermissionsManager");
const isAuthenticated = require("../../uses/isAuthenticated");
const { UserUnauthorised, MalformedRequest, ResourceNotFound } = require("../../util/standardResponses");
const snowflakePattern = require("../../util/snowflakePattern");

module.exports = {
    path: "/:fileID/:fileName",
    priority: 0,
    methods: {
        /** @type {import("express").Handler[]} */
        get: [
            (req, res, next) => {
                let requiresAuthentication = require("../../config/api/files.json").requiresAuthentication;
                if (requiresAuthentication) return isAuthenticated(req, res, next);
                else return next();
            },
            param("fileID")
                .notEmpty()
                .matches(snowflakePattern)
                .withMessage("Provided ID is not a Snowflake."),
            param("fileName")
                .notEmpty()
                .withMessage("A file name must be provided.")
                .matches(FileManager.fileNamePattern)
                .withMessage("Provided file name is invalid."),
            /** @type {import("express").Handler} */
            (req, res, next) => {
                let requiresAuthentication = require("../../config/api/files.json").requiresAuthentication;
                if (!requiresAuthentication || GlobalPermissionsManager.checkUser(req.user.id, GlobalPermissionsManager.Permissions.DownloadFiles)) {
                    // check validity
                    let issues = validationResult(req);
                    if (!issues.isEmpty()) {
                        return MalformedRequest(res, issues);
                    }

                    // find file
                    let file = FileManager.get(req.params.fileID);

                    if (!file) return ResourceNotFound(res);
                    if (file.name != req.params.fileName) return ResourceNotFound(res);
                    if (!file.data) return ResourceNotFound(res);

                    res.set("Content-Disposition", `attachment; filename=${encodeURIComponent(file.name)}`);
                    res.type(file.mime);
                    res.send(file.data);
                } else return UserUnauthorised(res);
            }
        ]
    }
}