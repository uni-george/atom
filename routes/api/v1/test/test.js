'use strict';

const relativeTime = require("../../../../util/relativeTime");
const splashes = require("../../../../config/api/splashes.json");

module.exports = {
    path: "/",
    priority: 0,
    methods: {
        get: [
            /** @type {import("express").Handler} */
            (req, res, next) => {
                let uptime = new Date(0).setUTCSeconds(process.uptime());

                res.json({
                    message: {
                        text: splashes[Math.floor(Math.random() * splashes.length)],
                        fixed: "this is some text"
                    },
                    uptime: uptime,
                    readableUptime: relativeTime(uptime) || "0 secs"
                })
            }
        ]
    }
}