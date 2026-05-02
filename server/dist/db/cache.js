"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertAssetCache = upsertAssetCache;
exports.getAssetCache = getAssetCache;
exports.listAssetCache = listAssetCache;
const client_1 = require("./client");
function upsertAssetCache(assetId, assetJson) {
    const stmt = (0, client_1.getDb)().prepare(`INSERT INTO asset_cache (asset_id, latest_json, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(asset_id) DO UPDATE SET
             latest_json = excluded.latest_json,
             updated_at = excluded.updated_at`);
    stmt.run(assetId, assetJson, Date.now());
}
function getAssetCache(assetId) {
    const row = (0, client_1.getDb)()
        .prepare(`SELECT asset_id, latest_json, updated_at FROM asset_cache WHERE asset_id = ?`)
        .get(assetId);
    if (!row)
        return null;
    let parsed;
    try {
        parsed = JSON.parse(row.latest_json);
    }
    catch {
        parsed = row.latest_json;
    }
    return {
        assetId: row.asset_id,
        asset: parsed,
        updatedAt: row.updated_at,
    };
}
function listAssetCache(limit = 100) {
    const rows = (0, client_1.getDb)()
        .prepare(`SELECT asset_id, latest_json, updated_at FROM asset_cache
             ORDER BY updated_at DESC LIMIT ?`)
        .all(limit);
    return rows.map((row) => {
        let parsed;
        try {
            parsed = JSON.parse(row.latest_json);
        }
        catch {
            parsed = row.latest_json;
        }
        return {
            assetId: row.asset_id,
            asset: parsed,
            updatedAt: row.updated_at,
        };
    });
}
//# sourceMappingURL=cache.js.map