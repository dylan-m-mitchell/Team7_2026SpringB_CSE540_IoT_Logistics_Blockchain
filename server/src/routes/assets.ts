import { Router } from 'express';
import { z } from 'zod';
import {
    addShippingLeg,
    assessDamage,
    assetExists,
    createAsset,
    readAsset,
    setTolerances,
    transferAsset,
} from '../fabric/contract';
import { getAssetCache } from '../db/cache';

const router: Router = Router();

const createBody = z.object({ id: z.string().min(1) });

const tolerancesBody = z.object({
    humidityMin: z.number().optional(),
    humidityMax: z.number().optional(),
    tempMin: z.number().optional(),
    tempMax: z.number().optional(),
    shockMin: z.number().optional(),
    shockMax: z.number().optional(),
});

const legBody = z.object({
    shippingHandler: z.unknown(),
    shippingReceiver: z.unknown(),
    isComplete: z.boolean().optional(),
    isSuccess: z.boolean().optional(),
    transitTimeStartMs: z.number(),
    maxTransitTimeMs: z.number(),
});

router.post('/', async (req, res, next) => {
    try {
        const { id } = createBody.parse(req.body);
        const { txId, result } = await createAsset(id);
        res.status(201).json({ ok: true, txId, asset: result });
    } catch (err) {
        next(err);
    }
});

router.get('/:id', async (req, res, next) => {
    try {
        const id = req.params.id;
        const asset = await readAsset(id);
        const cached = getAssetCache(id);
        res.json({ ok: true, asset, cache: cached });
    } catch (err) {
        next(err);
    }
});

router.get('/:id/exists', async (req, res, next) => {
    try {
        const exists = await assetExists(req.params.id);
        res.json({ ok: true, exists });
    } catch (err) {
        next(err);
    }
});

router.put('/:id/tolerances', async (req, res, next) => {
    try {
        const tolerances = tolerancesBody.parse(req.body);
        const { txId, result } = await setTolerances(req.params.id, tolerances);
        res.json({ ok: true, txId, asset: result });
    } catch (err) {
        next(err);
    }
});

router.post('/:id/legs', async (req, res, next) => {
    try {
        const leg = legBody.parse(req.body);
        const { txId, result } = await addShippingLeg(req.params.id, leg);
        res.json({ ok: true, txId, asset: result });
    } catch (err) {
        next(err);
    }
});

router.post('/:id/transfer', async (req, res, next) => {
    try {
        const { txId, result } = await transferAsset(req.params.id);
        res.json({ ok: true, txId, asset: result });
    } catch (err) {
        next(err);
    }
});

router.get('/:id/damage', async (req, res, next) => {
    try {
        const { txId, result } = await assessDamage(req.params.id);
        res.json({ ok: true, txId, isDamaged: result.isDamaged });
    } catch (err) {
        next(err);
    }
});

export default router;
