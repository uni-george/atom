'use strict';

const isAuthenticated = require("../../../../uses/isAuthenticated");

module.exports = {
    path: "/me",
    priority: 0,
    methods: {
        get: [
            isAuthenticated,
            /** @type {import("express").Handler} */
            (req, res, next) => {
                res.json({
                    id: req.user.id,
                    name: req.user.name,
                    avatarID: req.user.avatarID
                });
            }
        ]
    }
}