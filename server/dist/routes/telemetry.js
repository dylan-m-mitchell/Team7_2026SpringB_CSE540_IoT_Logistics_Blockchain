"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const telemetry_1 = require("../db/telemetry");
const router = (0, express_1.Router)();
const telemetryBody = zod_1.z.object({
    ts: zod_1.z.number().optional(),
    temp: zod_1.z.number().optional(),
    humidity: zod_1.z.number().optional(),
    shock: zod_1.z.number().optional(),
    lat: zod_1.z.number().optional(),
    long: zod_1.z.number().optional(),
});
router.post('/:id/telemetry', (req, res, next) => {
    try {
        const parsed = telemetryBody.parse(req.body);
        const reading = (0, telemetry_1.recordTelemetry)({
            assetId: req.params.id,
            ts: parsed.ts ?? Date.now(),
            temp: parsed.temp,
            humidity: parsed.humidity,
            shock: parsed.shock,
            lat: parsed.lat,
            long: parsed.long,
        });
        res.status(201).json({ ok: true, reading });
    }
    catch (err) {
        next(err);
    }
});
router.get('/:id/telemetry', (req, res, next) => {
    try {
        const limit = req.query.limit ? Math.max(1, Number(req.query.limit)) : 50;
        const readings = (0, telemetry_1.listTelemetry)(req.params.id, limit);
        res.json({ ok: true, readings });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=telemetry.js.map