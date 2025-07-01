'use strict';

// env
require("dotenv").config();

// logger setup
const { join } = require("path");
require("./managers/LoggingManager").createLogger(join(__dirname, "config", "logs", "settings.json"));
const { critical } = require("./managers/LoggingManager");

//#region DB setup
// db setup
const DatabaseManagers = require("./managers/data/DatabaseManagers");
// users
DatabaseManagers.DataDBManager.setDefinitions([
    "users (id TEXT, name TEXT, avatarID TEXT, PRIMARY KEY(id))",
    "sessions (id TEXT, userID TEXT, created INTEGER, expires INTEGER, originIP TEXT, device TEXT, browser TEXT, PRIMARY KEY(id))",

    // scheme specific
    "localLogins (userID TEXT UNIQUE, username TEXT, passwordHash TEXT, PRIMARY KEY(username))",
    "googleLogins (userID TEXT, googleID TEXT, PRIMARY KEY(googleID))",

    // user groups
    "groups (id TEXT, name TEXT, colour TEXT, PRIMARY KEY(id))",

    // permissions
    "userPermissions (userID TEXT, permission TEXT, PRIMARY KEY(userID, permission))",
    "groupPermissions (groupID TEXT, permission TEXT, PRIMARY KEY(groupID, permission))"
]).init(join(__dirname, "databases", "data.sqlite"));

//#endregion

// server setup
const ServerManager = require("./managers/ServerManager");

ServerManager.init(3000);
ServerManager.disableHTTPS = true;
ServerManager.setSettingsDir(join(__dirname, "config", "server"));

ServerManager.setRouteDirectory(join(__dirname, "routes"));
ServerManager.addStaticDirectory(join(__dirname, "public"));

// cors
const cors = require("cors");
ServerManager.app.use(cors(require("./config/server/meta.json").cors));

//#region passport
// setup passport
const passport = require("passport");
require("./config/passport");

// session cookies
ServerManager.app.use(require("cookie-parser")());
ServerManager.app.use(require("cookie-session")({
    keys: [
        require("./config/server/keys.json").session.cookie
    ],
    domain: `${require("./config/server/meta.json").basehostname.split(":")[0]}`,
    maxAge: 7 * 24 * 60 * 60 * 1000
}));
// https://stackoverflow.com/a/75195471
ServerManager.app.use((req, res, next) => {
    if (req.session && !req.session.regenerate) {
        req.session.regenerate = (cb) => {
            cb();
        }
    }
    if (req.session && !req.session.save) {
        req.session.save = (cb) => {
            cb();
        }
    }
    next();
})

ServerManager.app.use(passport.initialize());
ServerManager.app.use(passport.session());

//#endregion

// api json parsing
const express = require("express");
const { MalformedRequest } = require("./util/standardResponses");
ServerManager.app.use(express.json());
ServerManager.app.use("/api", (err, req, res, next) => {
    if (err instanceof SyntaxError) return MalformedRequest(res);
    else return next();
});

ServerManager.setupFromState();

// ----- errors -----
// 500
ServerManager.app.use((err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    require("./util/standardResponses").ServerError(res);
    critical(err);
});


// expose to console interface
const UserManager = require("./managers/data/UserManager");
const LocalAuthManager = require("./managers/auth/LocalAuthManager");

// console interface for debugging if debug mode is on
// disabled when debug is off
if (require("./config/server/meta.json").debugMode) {
    const readline = require("readline");
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
    });

    rl.on("line", async line => {
        try {
            let eresult = eval(line);
            console.log(eresult);
        } catch (err) {
            console.error(err);
        }
    })
}

// yay
ServerManager.start();