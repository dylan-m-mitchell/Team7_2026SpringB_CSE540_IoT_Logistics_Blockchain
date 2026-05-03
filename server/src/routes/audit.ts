import { Router } from 'express';
import { listAudit } from '../db/audit';

const router: Router = Router();

function asString(v: unknown): string | undefined {
    return typeof v === 'string' && v.length > 0 ? v : undefined;
}

router.get('/', (req, res, next) => {
    try {
        const limit = req.query.limit ? Math.max(1, Number(req.query.limit)) : 50;
        const entries = listAudit({
            limit,
            asset: asString(req.query.asset),
            command: asString(req.query.command),
        });
        res.json({ ok: true, entries });
    } catch (err) {
        next(err);
    }
});

export default router;
