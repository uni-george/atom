'use strict';

const { UserUnauthenticated } = require("../util/standardResponses");

/** @type {import("express").Handler} */
const isAuthenticated = (req, res, next) => {
    if (!req.user) return UserUnauthenticated(res);
    else next();
}

module.exports = isAuthenticated;