'use strict';

const { ResourceNotFound, ActionSuccessful, MalformedRequest, ServerError } = require("../../util/standardResponses");

module.exports = {
    path: "/logout",
    priority: 0,
    methods: {
        get: [
            /** @type {import("express").Handler} */
            (req, res, next) => {
                if (!req.user) {
                    return ResourceNotFound(res);
                }

                if (!req.user.currentSessionID) {
                    return MalformedRequest(res);
                }

                let sessions = req.user.getSessions();
                sessions.forEach(x => {
                    // clear up expired sessions
                    if (x.expires > new Date().getTime()) x.delete();
                    else if (x.id == req.user.currentSessionID) x.delete();
                });

                req.logout(err => {
                    if (err) ServerError(res);
                    return ActionSuccessful(res);
                });
            }
        ]
    }
}