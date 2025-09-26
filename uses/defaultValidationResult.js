'use strict';

const { validationResult } = require("express-validator");
const { MalformedRequest } = require("../util/standardResponses");

/** @type {import("express").Handler} */
const defaultValidationResult = (req, res, next) => {
    let issues = validationResult(req);
    if (!issues.isEmpty()) {
        return MalformedRequest(res, issues);
    }

    next();
}

module.exports = defaultValidationResult;