'use strict';

const { UserUnauthorised } = require("../util/standardResponses");

/** @type {import("express").Handler} */
const isNotAuthenticated = (req, res, next) => {
    if (req.user) return UserUnauthorised(res);
    else return next();
}

module.exports = isNotAuthenticated;