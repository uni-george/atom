'use strict';

const { ResourceNotFound } = require("../util/standardResponses");

module.exports = {
    path: "*all",
    priority: -100,
    methods: {
        all: (req, res, next) => {
            return ResourceNotFound(res);
        }
    }
}