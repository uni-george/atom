'use strict';

const passport = require("passport");

module.exports = {
    path: "/local",
    priority: 0,
    methods: {
        post: [
            passport.authenticate("local", {
                failureRedirect: "/login"
            }),
            (req, res, next) => {
                res.send(200);
            }
        ]
    }
}