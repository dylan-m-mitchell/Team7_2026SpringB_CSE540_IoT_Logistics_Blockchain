"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAsset = createAsset;
exports.readAsset = readAsset;
exports.assetExists = assetExists;
exports.setTolerances = setTolerances;
exports.addShippingLeg = addShippingLeg;
exports.transferAsset = transferAsset;
exports.assessDamage = assessDamage;
const gateway_1 = require("./gateway");
const cache_1 = require("../db/cache");
const audit_1 = require("../db/audit");
function decode(buf) {
    return buf.toString('utf8');
}
function parseJsonOrText(text) {
    try {
        return JSON.parse(text);
    }
    catch {
        return text;
    }
}
/**
 * Run a write transaction and capture its txId. We use `createTransaction`
 * (instead of the simpler `submitTransaction`) so we can read the
 * proposal-time id; that id is stored in the audit log and returned to the
 * caller for traceability.
 */
async function submitWithTxId(name, args) {
    const contract = await (0, gateway_1.getContract)();
    const tx = contract.createTransaction(name);
    const txId = tx.getTransactionId();
    let payload;
    try {
        payload = await tx.submit(...args);
    }
    catch (err) {
        (0, audit_1.recordAudit)({
            command: `chaincode:${name}`,
            args,
            txId,
            status: 'error',
            response: err instanceof Error ? err.message : String(err),
        });
        throw err;
    }
    (0, audit_1.recordAudit)({
        command: `chaincode:${name}`,
        args,
        txId,
        status: 'ok',
        response: payload.length > 0 ? parseJsonOrText(decode(payload)) : null,
    });
    return { txId, payload };
}
async function evaluate(name, args) {
    const contract = await (0, gateway_1.getContract)();
    return contract.evaluateTransaction(name, ...args);
}
async function createAsset(assetId) {
    const { txId } = await submitWithTxId('CreateAsset', [assetId]);
    const asset = await readAsset(assetId);
    return { txId, result: asset };
}
/**
 * Read an asset and refresh the off-chain cache. Cache write happens here
 * (and not in a route) so every code path that reads from chain stays in
 * sync without duplicating logic.
 */
async function readAsset(assetId) {
    const result = await evaluate('ReadAsset', [assetId]);
    const text = decode(result);
    (0, cache_1.upsertAssetCache)(assetId, text);
    return parseJsonOrText(text);
}
async function assetExists(assetId) {
    const result = await evaluate('AssetExists', [assetId]);
    return decode(result).trim() === 'true';
}
async function setTolerances(assetId, tolerances) {
    const { txId } = await submitWithTxId('setTolerances', [assetId, JSON.stringify(tolerances)]);
    const asset = await readAsset(assetId);
    return { txId, result: asset };
}
async function addShippingLeg(assetId, leg) {
    const { txId } = await submitWithTxId('addShippingLeg', [assetId, JSON.stringify(leg)]);
    const asset = await readAsset(assetId);
    return { txId, result: asset };
}
async function transferAsset(assetId) {
    const { txId } = await submitWithTxId('transferAsset', [assetId]);
    const asset = await readAsset(assetId);
    return { txId, result: asset };
}
/**
 * Note: chaincode marks `assessDamage` as a write transaction (it can flip
 * `isDamaged`), so we submit instead of evaluate and capture a txId.
 */
async function assessDamage(assetId) {
    const { txId, payload } = await submitWithTxId('assessDamage', [assetId]);
    await readAsset(assetId);
    return { txId, result: { isDamaged: decode(payload).trim() === 'true' } };
}
//# sourceMappingURL=contract.js.map