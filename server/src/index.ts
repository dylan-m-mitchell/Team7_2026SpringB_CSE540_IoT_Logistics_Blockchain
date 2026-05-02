import express, { type ErrorRequestHandler, type Request, type Response } from 'express';
import { ZodError } from 'zod';
import { config } from './config';
import { getDb } from './db/client';
import { auditMiddleware } from './middleware/auditLogger';
import assetsRouter from './routes/assets';
import telemetryRouter from './routes/telemetry';
import auditRouter from './routes/audit';
import { disconnectGateway, gatewayStatus } from './fabric/gateway';
import { printChecks, validateConfig } from './bootCheck';

/**
 * Probes the local SQLite handle. We use a trivial `SELECT 1` so the check
 * exercises the connection without hitting any real table.
 */
function dbStatus(): { ok: boolean; path: string; error?: string } {
    try {
        getDb().prepare('SELECT 1').get();
        return { ok: true, path: config.dbPath };
    } catch (err) {
        return {
            ok: false,
            path: config.dbPath,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}

export function buildApp() {
    const app = express();

    app.use(express.json({ limit: '1mb' }));
    app.use(auditMiddleware);

    app.get('/healthz', async (_req: Request, res: Response) => {
        const db = dbStatus();
        const fabric = await gatewayStatus();
        const ok = db.ok && fabric.connected;
        res.status(ok ? 200 : 503).json({ ok, ts: Date.now(), db, fabric });
    });

    app.use('/assets', assetsRouter);
    app.use('/assets', telemetryRouter);
    app.use('/audit', auditRouter);

    const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
        if (err instanceof ZodError) {
            res.status(400).json({ ok: false, error: 'validation_error', details: err.issues });
            return;
        }
        const message = err instanceof Error ? err.message : String(err);
        console.error('API error:', err);
        res.status(500).json({ ok: false, error: message });
    };
    app.use(errorHandler);

    return app;
}

async function shutdown(signal: string): Promise<void> {
    console.log(`\nReceived ${signal}, shutting down...`);
    try {
        await disconnectGateway();
    } catch (err) {
        console.error('Error disconnecting Fabric gateway:', err);
    }
    process.exit(0);
}

async function main(): Promise<void> {
    getDb();

    const checks = await validateConfig();
    printChecks(checks);
    const failed = checks.filter((c) => !c.ok);
    if (failed.length > 0) {
        console.error(
            `\nRefusing to start: ${failed.length} configuration check(s) failed. ` +
                `Fix the [FAIL] rows above (typically: edit server/.env or run 'npm run enroll-admin').`,
        );
        process.exit(1);
    }

    const app = buildApp();
    const server = app.listen(config.port, () => {
        console.log(`\nserver listening on http://localhost:${config.port}`);
        console.log(
            `fabric: channel=${config.fabricChannel} chaincode=${config.fabricChaincode} identity=${config.fabricIdentity}`,
        );
    });

    process.on('SIGINT', () => {
        server.close();
        void shutdown('SIGINT');
    });
    process.on('SIGTERM', () => {
        server.close();
        void shutdown('SIGTERM');
    });
}

if (require.main === module) {
    void main();
}
