'use strict';

module.exports = {
    path: "/requestsopen",
    priority: 0,
    methods: {
        get: (req, res, next) => {
            return res.json(true)
        }
    }
}