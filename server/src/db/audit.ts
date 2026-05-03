import { getDb } from './client';

export type AuditStatus = 'ok' | 'error';

export interface AuditEntry {
    command: string;
    args?: unknown;
    txId?: string | null;
    status: AuditStatus;
    response?: unknown;
}

export interface AuditRow {
    id: number;
    ts: number;
    command: string;
    args: unknown;
    txId: string | null;
    status: AuditStatus;
    response: unknown;
}

interface AuditDbRow {
    id: number;
    ts: number;
    command: string;
    args_json: string | null;
    tx_id: string | null;
    status: string;
    response_json: string | null;
}

function safeParse(raw: string | null): unknown {
    if (raw == null) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return raw;
    }
}

function toRow(r: AuditDbRow): AuditRow {
    return {
        id: r.id,
        ts: r.ts,
        command: r.command,
        args: safeParse(r.args_json),
        txId: r.tx_id,
        status: (r.status as AuditStatus) ?? 'ok',
        response: safeParse(r.response_json),
    };
}

export function recordAudit(entry: AuditEntry): void {
    const stmt = getDb().prepare(
        `INSERT INTO audit_log (ts, command, args_json, tx_id, status, response_json)
         VALUES (?, ?, ?, ?, ?, ?)`,
    );
    stmt.run(
        Date.now(),
        entry.command,
        entry.args === undefined ? null : JSON.stringify(entry.args),
        entry.txId ?? null,
        entry.status,
        entry.response === undefined ? null : JSON.stringify(entry.response),
    );
}

export interface ListAuditOptions {
    limit?: number;
    asset?: string;
    command?: string;
}

/**
 * Lists audit rows newest-first. The `asset` filter does a substring match
 * against `args_json` (good enough for a PoC since asset ids appear verbatim
 * in either route params or chaincode arg arrays); `command` does a LIKE
 * match against the command column so callers can target either HTTP entries
 * (e.g. "POST /assets") or chaincode entries (e.g. "chaincode:CreateAsset").
 */
export function listAudit(opts: ListAuditOptions = {}): AuditRow[] {
    const limit = opts.limit ?? 50;
    const where: string[] = [];
    const params: (string | number)[] = [];

    if (opts.command) {
        where.push('command LIKE ?');
        params.push(`%${opts.command}%`);
    }
    if (opts.asset) {
        where.push('args_json LIKE ?');
        params.push(`%${opts.asset}%`);
    }

    const sql =
        `SELECT id, ts, command, args_json, tx_id, status, response_json
         FROM audit_log
         ${where.length > 0 ? 'WHERE ' + where.join(' AND ') : ''}
         ORDER BY ts DESC LIMIT ?`;
    params.push(limit);

    const rows = getDb().prepare(sql).all(...params) as AuditDbRow[];
    return rows.map(toRow);
}
