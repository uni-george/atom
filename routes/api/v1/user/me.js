'use strict';

module.exports = {
    path: "/me",
    priority: 0,
    methods: {
        get: (req, res, next) => {
            return res.json({
                name: "a user"
            });
        }
    }
}