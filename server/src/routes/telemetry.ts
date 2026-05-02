import { Router } from 'express';
import { z } from 'zod';
import { listTelemetry, recordTelemetry } from '../db/telemetry';

const router: Router = Router();

const telemetryBody = z.object({
    ts: z.number().optional(),
    temp: z.number().optional(),
    humidity: z.number().optional(),
    shock: z.number().optional(),
    lat: z.number().optional(),
    long: z.number().optional(),
});

router.post('/:id/telemetry', (req, res, next) => {
    try {
        const parsed = telemetryBody.parse(req.body);
        const reading = recordTelemetry({
            assetId: req.params.id,
            ts: parsed.ts ?? Date.now(),
            temp: parsed.temp,
            humidity: parsed.humidity,
            shock: parsed.shock,
            lat: parsed.lat,
            long: parsed.long,
        });
        res.status(201).json({ ok: true, reading });
    } catch (err) {
        next(err);
    }
});

router.get('/:id/telemetry', (req, res, next) => {
    try {
        const limit = req.query.limit ? Math.max(1, Number(req.query.limit)) : 50;
        const readings = listTelemetry(req.params.id, limit);
        res.json({ ok: true, readings });
    } catch (err) {
        next(err);
    }
});

export default router;
