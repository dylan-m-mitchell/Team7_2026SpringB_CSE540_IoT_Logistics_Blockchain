"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditMiddleware = auditMiddleware;
const audit_1 = require("../db/audit");
/**
 * Express middleware that records every API call into the audit_log table.
 * Captures method+path, request body/query, response status code, and response body.
 */
function auditMiddleware(req, res, next) {
    const command = `${req.method} ${req.originalUrl.split('?')[0]}`;
    const args = {};
    if (req.params && Object.keys(req.params).length > 0)
        args.params = req.params;
    if (req.query && Object.keys(req.query).length > 0)
        args.query = req.query;
    if (req.body && Object.keys(req.body).length > 0)
        args.body = req.body;
    const originalJson = res.json.bind(res);
    let captured = null;
    res.json = (body) => {
        captured = body;
        return originalJson(body);
    };
    res.on('finish', () => {
        try {
            (0, audit_1.recordAudit)({
                command,
                args,
                status: res.statusCode >= 400 ? 'error' : 'ok',
                response: captured,
            });
        }
        catch (err) {
            console.error('Failed to record audit entry:', err);
        }
    });
    next();
}
//# sourceMappingURL=auditLogger.js.map