"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const audit_1 = require("../db/audit");
const router = (0, express_1.Router)();
function asString(v) {
    return typeof v === 'string' && v.length > 0 ? v : undefined;
}
router.get('/', (req, res, next) => {
    try {
        const limit = req.query.limit ? Math.max(1, Number(req.query.limit)) : 50;
        const entries = (0, audit_1.listAudit)({
            limit,
            asset: asString(req.query.asset),
            command: asString(req.query.command),
        });
        res.json({ ok: true, entries });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=audit.js.map