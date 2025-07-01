'use strict';

const express = require("express");
const { join, isAbsolute, basename } = require("path");
const { readdirSync, readFileSync, statSync, existsSync } = require("fs");
const { debug, info, warn, error, critical } = require("./LoggingManager");

const https = require("https");
const http = require("http");

class ServerManager {
    /** @type {Number} */
    static #port;

    /**
     * Directory to find routes in.
     * @type {String}
     */
    static #routeDirectory;
    /**
     * Directories to provide public files from.
     * @type {String[]}
     */
    static #publicDirectories;

    /** @type {String} */
    static #settingsDir;

    static #server;

    /** @type {import("express").Express} */
    static app;

    static disableHTTPS = false;

    /**
     * Initialise the ServerManager.
     * @param {Number} port The port to use.
     */
    static init(port) {
        if (!port || typeof port != "number" || port <= 0) throw new Error(`${port} is not a valid port.`);
        ServerManager.#routeDirectory = undefined;
        ServerManager.#publicDirectories = [];
        ServerManager.#port = port;

        ServerManager.app = express();
    }

    /**
     * Setup public file serving.
     * @param {String} dir The directory to use as a public directory.
     * @param {express.Router=} router The router to load the public directory onto. Defaults to the main app.
     * @returns {ServerManager} A reference to the ServerManager class.
     */
    static #loadStatics(dir, router) {
        for (const search of dir?.length ? dir : dir ? [dir] : this.#publicDirectories) {
            (router ? router : this.app).use(express.static(search));
        }

        return this;
    }

    /**
     * Set the ServerManager up from its current state.
     */
    static setupFromState() {
        let headers = require(join(ServerManager.#settingsDir, "headers.json"));
        if (headers.disable?.length) {
            for (const header of headers.disable) {
                ServerManager.app.disable(header);
            }
        }

        ServerManager.#loadStatics();
        ServerManager.#loadRoutes();
    }

    static #loadRoutes(routeDir, router) {
        let routeScanDirectory = routeDir || this.#routeDirectory;

        let existingRouteThings = readdirSync(routeScanDirectory).map(x => join(routeScanDirectory, x));

        /** @type {RouteObject[]} */
        let routePriorityAbove0 = []
        let priority0Folders = existingRouteThings.filter(x => statSync(x).isDirectory());
        /** @type {RouteObject[]} */
        let routePriority0 = [];
        /** @type {RouteObject[]} */
        let routePriorityBelow0 = [];

        // iterate through route files in directory
        let existingRouteFiles = existingRouteThings.filter(x => !statSync(x).isDirectory() && x.split(".").pop() == "js");
        for (const file of existingRouteFiles) {
            /** @type {RouteObject} */
            let route;

            try {
                route = require(file);
            } catch (e) {
                error(`Error while loading ${file}:\n${e}\n${e.stack}`);
                continue;
            }

            // check for path
            if (!route.path) {
                warn(`${file} does not have a path and so will be ignored.`);
                continue;
            }

            // check for priority
            if (!route.priority) route.priority = 0;

            // check for handlers
            let validMethods = Object.keys(route.methods).filter(x => {
                return [
                    "checkout",
                    "copy",
                    "delete",
                    "get",
                    "head",
                    "lock",
                    "merge",
                    "mkactivity",
                    "mkcol",
                    "move",
                    "m-search",
                    "notify",
                    "options",
                    "patch",
                    "post",
                    "purge",
                    "put",
                    "report",
                    "search",
                    "subscribe",
                    "trace",
                    "unlock",
                    "unsubscribe",
                    "all"
                ].includes(x);
            });
            if (!validMethods.length) {
                warn(`${filepath} does not have any method functions and so will be ignored.`);
                continue;
            }

            route.validMethods = validMethods;
            route.filename = file;

            (route.priority > 0 ? routePriorityAbove0 : route.priority == 0 ? routePriority0 : routePriorityBelow0).push(route);
        }

        // time to sort stuff
        routePriorityAbove0.sort((a, b) => b.priority - a.priority);
        routePriorityBelow0.sort((a, b) => b.priority - a.priority);

        // load all above 0
        ServerManager.#loadOrderedRouteSet(routePriorityAbove0, router || ServerManager.app);
        // load all at 0
        ServerManager.#loadOrderedRouteSet(routePriority0, router || ServerManager.app);
        for (const folder of priority0Folders) {
            let zeroRouter = express.Router();
            (router || ServerManager.app).use(`/${basename(folder)}`, zeroRouter);
            ServerManager.#loadRoutes(folder, zeroRouter);
        }
        // load all below zero
        ServerManager.#loadOrderedRouteSet(routePriorityBelow0, router || ServerManager.app);

        return ServerManager;
    }

    /**
     * Load an ordered set of routes onto a router.
     * @param {RouteObject[]} routes The routes.
     * @param {import("express").Application|import("express").Router} router The router to load the routes on.
     */
    static #loadOrderedRouteSet(routes, router) {
        while (routes.length != 0) {
        let nextRoute = routes.shift();
        for (const method of nextRoute.validMethods) {
            debug(`Loading method ${method} for ${nextRoute.filename}`);
            if (typeof nextRoute.methods[method] != "function" && typeof nextRoute.methods[method] != "object") {
                debug(`Skipping method ${method} as it is not a function.`);
                continue;
            }

            router[method](nextRoute.path, nextRoute.methods[method]);
            debug(`Loaded method ${method} for ${nextRoute.filename} at ${nextRoute.path}`);
        }
    }
    }

    /**
     * Add a directory to the ServerManager's list of directories to search for static files.
     * @param {String} dir The (absolute) path of the directory to add to the scanning list.
     * @returns {ServerManager} A reference to the ServerManager class.
     */
    static addStaticDirectory(dir) {
        if (!isAbsolute(dir)) throw new Error("Provided path was not absolute.");
        if (!ServerManager.#publicDirectories.includes(dir)) ServerManager.#publicDirectories.push(dir);
        debug(`Adding ${dir} to the list of directories to scan for static files`);
        return ServerManager;
    }

    /**
     * Set the settings directory.
     * @param {String} dir The directory to set.
     * @returns {ServerManager} A reference to the ServerManager class.
     */
    static setSettingsDir(dir) {
        ServerManager.#settingsDir = dir;
        info(`Set server settings directory to ${dir}`);
        return ServerManager;
    }

    /**
     * Set the route directory.
     * @param {String} dir The directory to set.
     * @returns {ServerManager} A reference to the ServerManager class.
     */
    static setRouteDirectory(dir) {
        ServerManager.#routeDirectory = dir;
        info(`Set route directory to ${dir}`);
        return ServerManager;
    }

    static start() {
        if (!ServerManager.disableHTTPS) {
            ServerManager.#server = https.createServer({
                key: readFileSync(join(this.#settingsDir, "sslcert", "server.key"), "utf-8"),
                cert: readFileSync(join(this.#settingsDir, "sslcert", "server.crt"), "utf-8")
            }, ServerManager.app);
        } else {
            ServerManager.#server = http.createServer(this.app);
        }

        ServerManager.#server.listen(ServerManager.#port, require(join(this.#settingsDir, "meta.json")).listen || "0.0.0.0");

        ServerManager.#server.on("listening", () => info(`Listening on port ${ServerManager.#port}.`));
        ServerManager.#server.on("error", e => critical(e));

        return ServerManager;
    }
}

module.exports = ServerManager;

/**
 * @typedef {Object} RouteObject
 * @property {String} path
 * @property {Number=} priority
 * @property {RouteMethodsObject} methods
 */

/**
 * @typedef {import("express").Handler|import("express").Handler[]|undefined} RouteHandler
 */

/**
 * @typedef {Object} RouteMethodsObject
 * @property {RouteHandler} checkout
 * @property {RouteHandler} copy
 * @property {RouteHandler} delete
 * @property {RouteHandler} get
 * @property {RouteHandler} head
 * @property {RouteHandler} lock
 * @property {RouteHandler} merge
 * @property {RouteHandler} mkactivity
 * @property {RouteHandler} mkcol
 * @property {RouteHandler} move
 * @property {RouteHandler} m-search
 * @property {RouteHandler} notify
 * @property {RouteHandler} options
 * @property {RouteHandler} patch
 * @property {RouteHandler} post
 * @property {RouteHandler} purge
 * @property {RouteHandler} put
 * @property {RouteHandler} report
 * @property {RouteHandler} search
 * @property {RouteHandler} subscribe
 * @property {RouteHandler} trace
 * @property {RouteHandler} unlock
 * @property {RouteHandler} unsubscribe
 * @property {RouteHandler} all
 */