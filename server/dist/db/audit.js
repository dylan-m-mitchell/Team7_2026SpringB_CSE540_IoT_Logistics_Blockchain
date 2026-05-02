"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordAudit = recordAudit;
exports.listAudit = listAudit;
const client_1 = require("./client");
function safeParse(raw) {
    if (raw == null)
        return null;
    try {
        return JSON.parse(raw);
    }
    catch {
        return raw;
    }
}
function toRow(r) {
    return {
        id: r.id,
        ts: r.ts,
        command: r.command,
        args: safeParse(r.args_json),
        txId: r.tx_id,
        status: r.status ?? 'ok',
        response: safeParse(r.response_json),
    };
}
function recordAudit(entry) {
    const stmt = (0, client_1.getDb)().prepare(`INSERT INTO audit_log (ts, command, args_json, tx_id, status, response_json)
         VALUES (?, ?, ?, ?, ?, ?)`);
    stmt.run(Date.now(), entry.command, entry.args === undefined ? null : JSON.stringify(entry.args), entry.txId ?? null, entry.status, entry.response === undefined ? null : JSON.stringify(entry.response));
}
/**
 * Lists audit rows newest-first. The `asset` filter does a substring match
 * against `args_json` (good enough for a PoC since asset ids appear verbatim
 * in either route params or chaincode arg arrays); `command` does a LIKE
 * match against the command column so callers can target either HTTP entries
 * (e.g. "POST /assets") or chaincode entries (e.g. "chaincode:CreateAsset").
 */
function listAudit(opts = {}) {
    const limit = opts.limit ?? 50;
    const where = [];
    const params = [];
    if (opts.command) {
        where.push('command LIKE ?');
        params.push(`%${opts.command}%`);
    }
    if (opts.asset) {
        where.push('args_json LIKE ?');
        params.push(`%${opts.asset}%`);
    }
    const sql = `SELECT id, ts, command, args_json, tx_id, status, response_json
         FROM audit_log
         ${where.length > 0 ? 'WHERE ' + where.join(' AND ') : ''}
         ORDER BY ts DESC LIMIT ?`;
    params.push(limit);
    const rows = (0, client_1.getDb)().prepare(sql).all(...params);
    return rows.map(toRow);
}
//# sourceMappingURL=audit.js.map