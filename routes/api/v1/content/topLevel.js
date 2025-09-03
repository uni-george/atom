'use strict';

const ContentFolderManager = require("../../../../managers/data/content/ContentFolderManager");
const ContentManager = require("../../../../managers/data/content/ContentManager");

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
        ]
    }
}