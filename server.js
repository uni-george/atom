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
    "googleLogins (userID TEXT, googleID TEXT, accountEmail TEXT, PRIMARY KEY(googleID))",

    // user groups
    "groups (id TEXT, name TEXT, parentID TEXT, colour TEXT, PRIMARY KEY(id))",

    "groupMember (groupID TEXT, userID TEXT, PRIMARY KEY(groupID, userID))",

    // permissions
    "userGlobalPermissions (userID TEXT, permission TEXT, PRIMARY KEY(userID, permission))",
    "groupGlobalPermissions (groupID TEXT, permission TEXT, PRIMARY KEY(groupID, permission))",

    // images
    "images (id TEXT, isExternal INTEGER DEFAULT 1, source TEXT, PRIMARY KEY(id))"
]).init(join(__dirname, "databases", "data.sqlite"));

DatabaseManagers.FileDBManager.setDefinitions([
    "files (id TEXT, name TEXT, mime TEXT, size INTEGER, added INTEGER, addedBy TEXT, data BLOB, PRIMARY KEY(id))"
]).init(join(__dirname, "databases", "files.sqlite"));

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
const { MalformedRequest, UserUnauthenticated, UserUnauthorised } = require("./util/standardResponses");
ServerManager.app.use(express.json());
ServerManager.app.use("/api", (err, req, res, next) => {
    if (err instanceof SyntaxError) return MalformedRequest(res);
    else return next();
});

// api docs
if (require("./config/api/docs.json")) {
    const config = require("./config/api/docs.json");
    const swaggerUI = require("swagger-ui-express");
    [
        "v1"
    ].forEach(x => {
        try {
            const document = require(`./routes/api/${x}/specification.json`);
            
            ServerManager.app.use(`/api/${x}/docs`, (req, res, next) => {
                // permission lock
                if (!config.requiresAuthentication) return next();
                else if (!req.user) return UserUnauthenticated(res);
                else if (!GlobalPermissionsManager.checkUser(req.user.id, GlobalPermissionsManager.permissions.ViewAPIDocs)) return UserUnauthorised(res);
                else return next();
            }, swaggerUI.serve, swaggerUI.setup(document));
        } catch (e) {
            warn(`Couldn't load API specification for version ${x}:\n${e}`)
        }
    })
}

ServerManager.setupFromState();

// ----- errors -----
// 500
const AtomError = require("./util/AtomError");
ServerManager.app.use((err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    require("./util/standardResponses").ServerError(res, err instanceof AtomError ? err.message : undefined);
    (err instanceof AtomError ? warn : critical)(err);
});


// expose to console interface
const UserManager = require("./managers/data/UserManager");
const AuthManager = require("./managers/auth/AuthManager");
const { warn } = require("console");
const GlobalPermissionsManager = require("./managers/data/GlobalPermissionsManager");
// const LocalAuthManager = require("./managers/auth/LocalAuthManager");

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