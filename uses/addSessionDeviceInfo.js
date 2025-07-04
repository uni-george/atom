'use strict';

const DeviceDetector = require("node-device-detector");
const compareHash = require("../util/compareHash");

const detector = new DeviceDetector({
    clientIndexes: true,
    deviceIndexes: true,
    osIndexes: true,
    maxUserAgentSize: 500
});

/** @type {import("express").Handler} */
const addSessionDeviceInfo = (req, res, next) => {
    // log session device info
    try {
        let key = req.user.currentSessionKey.split("$");
        key.shift();
        key = key.join("$");

        let sessions = req.user.getSessions().filter(x => x.expires > new Date().getTime());
        let currentSession;
        for (let i = 0; i < sessions.length && !currentSession; i++) {
            if (compareHash(key, sessions[i].id)) {
                currentSession = sessions[i];
            }
        }

        if (currentSession) {
            currentSession.originIP = req.get("CF-Connecting-IP") || req.get("X-Forwarded-For") || req.ip;
            const device = detector.detect(req.get("User-Agent"));
            currentSession.device = device.device?.brand ? `${device.device.brand} ${device.device.model ? `${device.device.model} ` : ""}(${device.device.type})`.trim() : device.device?.type || "unknown";
            currentSession.browser = device.client.type ? `${device.client.name} ${device.client.version}${device.os?.name ? ` on ${device.os.name} ${device.os.version}` : ""}`.trim() : "unknown";
            currentSession.save();
        }
    } catch (e) { }
    next();
}

module.exports = addSessionDeviceInfo;