"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordTelemetry = recordTelemetry;
exports.listTelemetry = listTelemetry;
exports.latestTelemetry = latestTelemetry;
const client_1 = require("./client");
function toRow(r) {
    return {
        id: r.id,
        assetId: r.asset_id,
        ts: r.ts,
        temp: r.temp,
        humidity: r.humidity,
        shock: r.shock,
        lat: r.lat,
        long: r.long,
    };
}
function recordTelemetry(reading) {
    const stmt = (0, client_1.getDb)().prepare(`INSERT INTO telemetry (asset_id, ts, temp, humidity, shock, lat, long)
         VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const result = stmt.run(reading.assetId, reading.ts ?? Date.now(), reading.temp ?? null, reading.humidity ?? null, reading.shock ?? null, reading.lat ?? null, reading.long ?? null);
    return {
        id: Number(result.lastInsertRowid),
        ...reading,
        ts: reading.ts ?? Date.now(),
    };
}
function listTelemetry(assetId, limit = 50) {
    const rows = (0, client_1.getDb)()
        .prepare(`SELECT id, asset_id, ts, temp, humidity, shock, lat, long
             FROM telemetry
             WHERE asset_id = ?
             ORDER BY ts DESC LIMIT ?`)
        .all(assetId, limit);
    return rows.map(toRow);
}
function latestTelemetry(assetId) {
    const row = (0, client_1.getDb)()
        .prepare(`SELECT id, asset_id, ts, temp, humidity, shock, lat, long
             FROM telemetry
             WHERE asset_id = ?
             ORDER BY ts DESC LIMIT 1`)
        .get(assetId);
    return row ? toRow(row) : null;
}
//# sourceMappingURL=telemetry.js.map