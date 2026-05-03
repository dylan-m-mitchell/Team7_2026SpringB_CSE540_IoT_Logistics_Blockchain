import { getDb } from './client';

export interface AssetCacheRow {
    asset_id: string;
    latest_json: string;
    updated_at: number;
}

export interface AssetCacheEntry {
    assetId: string;
    asset: unknown;
    updatedAt: number;
}

export function upsertAssetCache(assetId: string, assetJson: string): void {
    const stmt = getDb().prepare(
        `INSERT INTO asset_cache (asset_id, latest_json, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(asset_id) DO UPDATE SET
             latest_json = excluded.latest_json,
             updated_at = excluded.updated_at`,
    );
    stmt.run(assetId, assetJson, Date.now());
}

export function getAssetCache(assetId: string): AssetCacheEntry | null {
    const row = getDb()
        .prepare(`SELECT asset_id, latest_json, updated_at FROM asset_cache WHERE asset_id = ?`)
        .get(assetId) as AssetCacheRow | undefined;

    if (!row) return null;

    let parsed: unknown;
    try {
        parsed = JSON.parse(row.latest_json);
    } catch {
        parsed = row.latest_json;
    }

    return {
        assetId: row.asset_id,
        asset: parsed,
        updatedAt: row.updated_at,
    };
}

export function listAssetCache(limit = 100): AssetCacheEntry[] {
    const rows = getDb()
        .prepare(
            `SELECT asset_id, latest_json, updated_at FROM asset_cache
             ORDER BY updated_at DESC LIMIT ?`,
        )
        .all(limit) as AssetCacheRow[];

    return rows.map((row) => {
        let parsed: unknown;
        try {
            parsed = JSON.parse(row.latest_json);
        } catch {
            parsed = row.latest_json;
        }
        return {
            assetId: row.asset_id,
            asset: parsed,
            updatedAt: row.updated_at,
        };
    });
}
