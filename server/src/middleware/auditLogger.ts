import type { NextFunction, Request, Response } from 'express';
import { recordAudit } from '../db/audit';

/**
 * Express middleware that records every API call into the audit_log table.
 * Captures method+path, request body/query, response status code, and response body.
 */
export function auditMiddleware(req: Request, res: Response, next: NextFunction): void {
    const command = `${req.method} ${req.originalUrl.split('?')[0]}`;
    const args: Record<string, unknown> = {};
    if (req.params && Object.keys(req.params).length > 0) args.params = req.params;
    if (req.query && Object.keys(req.query).length > 0) args.query = req.query;
    if (req.body && Object.keys(req.body).length > 0) args.body = req.body;

    const originalJson = res.json.bind(res);
    let captured: unknown = null;
    res.json = (body: unknown) => {
        captured = body;
        return originalJson(body);
    };

    res.on('finish', () => {
        try {
            recordAudit({
                command,
                args,
                status: res.statusCode >= 400 ? 'error' : 'ok',
                response: captured,
            });
        } catch (err) {
            console.error('Failed to record audit entry:', err);
        }
    });

    next();
}
