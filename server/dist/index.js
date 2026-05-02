"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildApp = buildApp;
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const config_1 = require("./config");
const client_1 = require("./db/client");
const auditLogger_1 = require("./middleware/auditLogger");
const assets_1 = __importDefault(require("./routes/assets"));
const telemetry_1 = __importDefault(require("./routes/telemetry"));
const audit_1 = __importDefault(require("./routes/audit"));
const gateway_1 = require("./fabric/gateway");
const bootCheck_1 = require("./bootCheck");
/**
 * Probes the local SQLite handle. We use a trivial `SELECT 1` so the check
 * exercises the connection without hitting any real table.
 */
function dbStatus() {
    try {
        (0, client_1.getDb)().prepare('SELECT 1').get();
        return { ok: true, path: config_1.config.dbPath };
    }
    catch (err) {
        return {
            ok: false,
            path: config_1.config.dbPath,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}
function buildApp() {
    const app = (0, express_1.default)();
    app.use(express_1.default.json({ limit: '1mb' }));
    app.use(auditLogger_1.auditMiddleware);
    app.get('/healthz', async (_req, res) => {
        const db = dbStatus();
        const fabric = await (0, gateway_1.gatewayStatus)();
        const ok = db.ok && fabric.connected;
        res.status(ok ? 200 : 503).json({ ok, ts: Date.now(), db, fabric });
    });
    app.use('/assets', assets_1.default);
    app.use('/assets', telemetry_1.default);
    app.use('/audit', audit_1.default);
    const errorHandler = (err, _req, res, _next) => {
        if (err instanceof zod_1.ZodError) {
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
async function shutdown(signal) {
    console.log(`\nReceived ${signal}, shutting down...`);
    try {
        await (0, gateway_1.disconnectGateway)();
    }
    catch (err) {
        console.error('Error disconnecting Fabric gateway:', err);
    }
    process.exit(0);
}
async function main() {
    (0, client_1.getDb)();
    const checks = await (0, bootCheck_1.validateConfig)();
    (0, bootCheck_1.printChecks)(checks);
    const failed = checks.filter((c) => !c.ok);
    if (failed.length > 0) {
        console.error(`\nRefusing to start: ${failed.length} configuration check(s) failed. ` +
            `Fix the [FAIL] rows above (typically: edit server/.env or run 'npm run enroll-admin').`);
        process.exit(1);
    }
    const app = buildApp();
    const server = app.listen(config_1.config.port, () => {
        console.log(`\nserver listening on http://localhost:${config_1.config.port}`);
        console.log(`fabric: channel=${config_1.config.fabricChannel} chaincode=${config_1.config.fabricChaincode} identity=${config_1.config.fabricIdentity}`);
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
//# sourceMappingURL=index.js.map