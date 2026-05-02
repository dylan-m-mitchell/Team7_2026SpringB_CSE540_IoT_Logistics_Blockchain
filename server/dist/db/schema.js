"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCHEMA_SQL = void 0;
exports.SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS asset_cache (
    asset_id TEXT PRIMARY KEY,
    latest_json TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS telemetry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id TEXT NOT NULL,
    ts INTEGER NOT NULL,
    temp REAL,
    humidity REAL,
    shock REAL,
    lat REAL,
    long REAL
);

CREATE INDEX IF NOT EXISTS idx_telemetry_asset_ts ON telemetry(asset_id, ts);

CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts INTEGER NOT NULL,
    command TEXT NOT NULL,
    args_json TEXT,
    tx_id TEXT,
    status TEXT NOT NULL,
    response_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log(ts);
`;
//# sourceMappingURL=schema.js.map