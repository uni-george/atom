'use strict';

const winston = require("winston");
const { format } = winston;
const { format: prettyFormat } = require("pretty-format");

class LoggingManager {
    /**
     * Reference to a Winston logger
     * @type {import("winston").Logger}
     * @static
     * @private
     */
    static #logger;

    /**
     * Create, set up and return a Winston logger.
     * @param {String} loggerSettingsPath The path of the settings file to use.
     * @returns {import("winston").Logger} The created logger.
     */
    static createLogger(loggerSettingsPath) {
        console.log(`[${new Date().toDateString() + " " + new Date().toTimeString()}] Setting up logger...`);

        /** @type {LoggerSettings} */
        let settings;
        try {
            settings = require(loggerSettingsPath);
        } catch (e) {
            throw new Error(`Cannot create logger - invalid settings file: ${e}\n${e.stack}`);
        }

        const logger = winston.createLogger({
            // setup transports
            transports: [
                // console
                new winston.transports.Console({
                    format: format.combine(
                        format.colorize({
                            all: true
                        })
                    ),
                    // send messages down to level specified
                    level: settings.console.level
                }),
                // file
                new winston.transports.File({
                    // ensure all filenames are unique
                    filename: `logs/${require("../package.json").name}-${new Date().getUTCFullYear()}.${new Date().getUTCMonth() + 1}.${new Date().getUTCDate()}-${new Date().valueOf()}.log`,
                    // send messages down to level specified
                    level: settings.file.level
                })
            ],
            // setup logging levels
            levels: {
                critical: 0,
                error: 1,
                warn: 2,
                info: 3,
                debug: 4
            },
            // use timestamps
            timestamp: true,
            // setup format
            format: format.combine(
                format.splat(),
                format.timestamp({
                    format: "YYYY/MM/DD, HH:mm:ss"
                }),
                format.errors({
                    stack: true
                }),
                format.printf(msg => `[${msg.level.toUpperCase()}] ${msg.timestamp}\t» ${typeof msg.message == "string" ? msg.message.replace(new RegExp(require("os").userInfo().username, "g"), "X") : "\n" + prettyFormat(msg.message).replace(new RegExp(require("os").userInfo().username, "g"), "X")}${msg.stack ? `\n${msg.stack.replace(new RegExp(require("os").userInfo().username, "g"), "X")}` : ""}`)
            )
        });

        // setup colours
        winston.addColors({
            critical: "bold red",
            error: "bold red blackBG",
            warn: "bold yellow blackBG",
            info: "cyan blackBG",
            debug: "grey blackBG"
        });

        // add uncaught exception logger
        process.on("uncaughtException", e => {
            logger.critical(`Uncaught exception:\n${e.stack}`)
        });

        logger.info("Logging setup.");

        LoggingManager.#logger = logger;
        return logger;
    }

    /**
     * Log at debug level.
     * @param {String|Object} x The content to log.
     */
    static debug = x => LoggingManager.#logger.debug(x);
    /**
     * Log at info level.
     * @param {String|Object} x The content to log.
     */
    static info = x => LoggingManager.#logger.info(x);
    /**
     * Log at warn level.
     * @param {String|Object} x The content to log.
     */
    static warn = x => LoggingManager.#logger.warn(x);
    /**
     * Log at error level.
     * @param {String|Object} x The content to log.
     */
    static error = x => LoggingManager.#logger.error(x);
    /**
     * Log at critical level.
     * @param {String|Object} x The content to log.
     */
    static critical = x => LoggingManager.#logger.critical(x);
}

module.exports = LoggingManager;

/**
 * @typedef {Object} LoggerSettings
 * @property {LoggerConsoleSettings} console
 * @property {LoggerFileSettings} file
 */

/**
 * @typedef {Object} LoggerConsoleSettings
 * @property {String} level
 */

/**
 * @typedef {Object} LoggerFileSettings
 * @property {String} level
 */