'use strict';

// env
require("dotenv").config();

// logger setup
const { join } = require("path");
require("./managers/LoggingManager").createLogger(join(__dirname, "config", "logs", "settings.json"));

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