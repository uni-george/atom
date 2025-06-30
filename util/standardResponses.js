'use strict';

module.exports = {
    /** @param {Response} res */
    MalformedRequest: (res) => res.status(400).json({ code: 400, message: "Invalid parameters/request body." }),
    /** @param {Response} res */
    UserUnauthenticated: (res) => res.status(401).json({ code: 401, message: "User is not logged in/using a valid API key." }),
    /** @param {Response} res */
    UserUnauthorised: (res) => res.status(403).json({ code: 403, message: "You are not authorised to carry out this action." }),
    /** @param {Response} res */
    ResourceNotFound: (res) => res.status(404).json({ code: 404, message: "The requested resource cannot be found." }),
    /** @param {Response} res */
    ServerError: (res) => res.status(500).json({ code: 500, message: "Internal server error." })
}