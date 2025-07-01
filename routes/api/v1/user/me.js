'use strict';

module.exports = {
    path: "/me",
    priority: 0,
    methods: {
        get: (req, res, next) => {
            res.status(404);
            return res.json({
                name: "a user"
            });
        }
    }
}