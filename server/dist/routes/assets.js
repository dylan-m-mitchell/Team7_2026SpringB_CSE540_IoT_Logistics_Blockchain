"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const contract_1 = require("../fabric/contract");
const cache_1 = require("../db/cache");
const router = (0, express_1.Router)();
const createBody = zod_1.z.object({ id: zod_1.z.string().min(1) });
const tolerancesBody = zod_1.z.object({
    humidityMin: zod_1.z.number().optional(),
    humidityMax: zod_1.z.number().optional(),
    tempMin: zod_1.z.number().optional(),
    tempMax: zod_1.z.number().optional(),
    shockMin: zod_1.z.number().optional(),
    shockMax: zod_1.z.number().optional(),
});
const legBody = zod_1.z.object({
    shippingHandler: zod_1.z.unknown(),
    shippingReceiver: zod_1.z.unknown(),
    isComplete: zod_1.z.boolean().optional(),
    isSuccess: zod_1.z.boolean().optional(),
    transitTimeStartMs: zod_1.z.number(),
    maxTransitTimeMs: zod_1.z.number(),
});
router.post('/', async (req, res, next) => {
    try {
        const { id } = createBody.parse(req.body);
        const { txId, result } = await (0, contract_1.createAsset)(id);
        res.status(201).json({ ok: true, txId, asset: result });
    }
    catch (err) {
        next(err);
    }
});
router.get('/:id', async (req, res, next) => {
    try {
        const id = req.params.id;
        const asset = await (0, contract_1.readAsset)(id);
        const cached = (0, cache_1.getAssetCache)(id);
        res.json({ ok: true, asset, cache: cached });
    }
    catch (err) {
        next(err);
    }
});
router.get('/:id/exists', async (req, res, next) => {
    try {
        const exists = await (0, contract_1.assetExists)(req.params.id);
        res.json({ ok: true, exists });
    }
    catch (err) {
        next(err);
    }
});
router.put('/:id/tolerances', async (req, res, next) => {
    try {
        const tolerances = tolerancesBody.parse(req.body);
        const { txId, result } = await (0, contract_1.setTolerances)(req.params.id, tolerances);
        res.json({ ok: true, txId, asset: result });
    }
    catch (err) {
        next(err);
    }
});
router.post('/:id/legs', async (req, res, next) => {
    try {
        const leg = legBody.parse(req.body);
        const { txId, result } = await (0, contract_1.addShippingLeg)(req.params.id, leg);
        res.json({ ok: true, txId, asset: result });
    }
    catch (err) {
        next(err);
    }
});
router.post('/:id/transfer', async (req, res, next) => {
    try {
        const { txId, result } = await (0, contract_1.transferAsset)(req.params.id);
        res.json({ ok: true, txId, asset: result });
    }
    catch (err) {
        next(err);
    }
});
router.get('/:id/damage', async (req, res, next) => {
    try {
        const { txId, result } = await (0, contract_1.assessDamage)(req.params.id);
        res.json({ ok: true, txId, isDamaged: result.isDamaged });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=assets.js.map