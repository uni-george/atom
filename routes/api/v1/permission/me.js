'use strict';

const GlobalPermissionsManager = require("../../../../managers/data/GlobalPermissionsManager");
const isAuthenticated = require("../../../../uses/isAuthenticated");

module.exports = {
    path: "/me",
    priority: 0,
    methods: {
        /** @type {import("express").Handler[]} */
        get: [
            isAuthenticated,
            (req, res, next) => {
                let all = Object.values(GlobalPermissionsManager.permissions);
                let out = {};

                all.forEach(x => {
                    out[x] = GlobalPermissionsManager.checkUser(req.user.id, x);
                });

                res.json(out);
            }
        ]
    }
}