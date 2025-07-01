'use strict';

const { join } = require("path");

// serve react page
module.exports = {
    path: "*all",
    priority: -1,
    methods: {
        get: (req, res, next) => {
            if (req.accepts("text/html")) {
                return res.sendFile(join(__dirname, "../", "index.html"))
            } else return next();
        }
    }
}