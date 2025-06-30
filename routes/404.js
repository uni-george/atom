'use strict';

module.exports = {
    path: "/",
    priority: 10,
    methods: {
        get: (req, res, next) => {
            res.send("hi thereeee");
        }
    }
}