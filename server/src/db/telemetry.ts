import { getDb } from './client';

export interface TelemetryReading {
    assetId: string;
    ts: number;
    temp?: number | null;
    humidity?: number | null;
    shock?: number | null;
    lat?: number | null;
    long?: number | null;
}

export interface TelemetryRow extends TelemetryReading {
    id: number;
}

interface TelemetryDbRow {
    id: number;
    asset_id: string;
    ts: number;
    temp: number | null;
    humidity: number | null;
    shock: number | null;
    lat: number | null;
    long: number | null;
}

function toRow(r: TelemetryDbRow): TelemetryRow {
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

export function recordTelemetry(reading: TelemetryReading): TelemetryRow {
    const stmt = getDb().prepare(
        `INSERT INTO telemetry (asset_id, ts, temp, humidity, shock, lat, long)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    const result = stmt.run(
        reading.assetId,
        reading.ts ?? Date.now(),
        reading.temp ?? null,
        reading.humidity ?? null,
        reading.shock ?? null,
        reading.lat ?? null,
        reading.long ?? null,
    );
    return {
        id: Number(result.lastInsertRowid),
        ...reading,
        ts: reading.ts ?? Date.now(),
    };
}

export function listTelemetry(assetId: string, limit = 50): TelemetryRow[] {
    const rows = getDb()
        .prepare(
            `SELECT id, asset_id, ts, temp, humidity, shock, lat, long
             FROM telemetry
             WHERE asset_id = ?
             ORDER BY ts DESC LIMIT ?`,
        )
        .all(assetId, limit) as TelemetryDbRow[];
    return rows.map(toRow);
}

export function latestTelemetry(assetId: string): TelemetryRow | null {
    const row = getDb()
        .prepare(
            `SELECT id, asset_id, ts, temp, humidity, shock, lat, long
             FROM telemetry
             WHERE asset_id = ?
             ORDER BY ts DESC LIMIT 1`,
        )
        .get(assetId) as TelemetryDbRow | undefined;
    return row ? toRow(row) : null;
}
