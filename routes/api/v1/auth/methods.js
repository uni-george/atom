'use strict';

module.exports = {
    path: "/methods",
    priority: 0,
    methods: {
        get: (req, res, next) => {
            return res.json([
                "google",
                "local"
            ]);
        }
    }
}