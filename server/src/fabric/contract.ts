import { Transaction } from 'fabric-network';
import { getContract } from './gateway';
import { upsertAssetCache } from '../db/cache';
import { recordAudit } from '../db/audit';

export interface ShippingTolerancesInput {
    humidityMin?: number;
    humidityMax?: number;
    tempMin?: number;
    tempMax?: number;
    shockMin?: number;
    shockMax?: number;
}

export interface ShippingLegInput {
    shippingHandler: unknown;
    shippingReceiver: unknown;
    isComplete?: boolean;
    isSuccess?: boolean;
    transitTimeStartMs: number;
    maxTransitTimeMs: number;
}

/**
 * Result of a write call. `txId` is the Fabric transaction id assigned at
 * proposal time; surfaced so callers (HTTP responses, CLI output, audit log)
 * can attribute the on-chain effect.
 */
export interface ContractWriteResult<T = unknown> {
    txId: string;
    result: T;
}

function decode(buf: Buffer): string {
    return buf.toString('utf8');
}

function parseJsonOrText(text: string): unknown {
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

/**
 * Run a write transaction and capture its txId. We use `createTransaction`
 * (instead of the simpler `submitTransaction`) so we can read the
 * proposal-time id; that id is stored in the audit log and returned to the
 * caller for traceability.
 */
async function submitWithTxId(
    name: string,
    args: string[],
): Promise<{ txId: string; payload: Buffer }> {
    const contract = await getContract();
    const tx: Transaction = contract.createTransaction(name);
    const txId = tx.getTransactionId();
    let payload: Buffer;
    try {
        payload = await tx.submit(...args);
    } catch (err) {
        recordAudit({
            command: `chaincode:${name}`,
            args,
            txId,
            status: 'error',
            response: err instanceof Error ? err.message : String(err),
        });
        throw err;
    }
    recordAudit({
        command: `chaincode:${name}`,
        args,
        txId,
        status: 'ok',
        response: payload.length > 0 ? parseJsonOrText(decode(payload)) : null,
    });
    return { txId, payload };
}

async function evaluate(name: string, args: string[]): Promise<Buffer> {
    const contract = await getContract();
    return contract.evaluateTransaction(name, ...args);
}

export async function createAsset(assetId: string): Promise<ContractWriteResult<unknown>> {
    const { txId } = await submitWithTxId('CreateAsset', [assetId]);
    const asset = await readAsset(assetId);
    return { txId, result: asset };
}

/**
 * Read an asset and refresh the off-chain cache. Cache write happens here
 * (and not in a route) so every code path that reads from chain stays in
 * sync without duplicating logic.
 */
export async function readAsset(assetId: string): Promise<unknown> {
    const result = await evaluate('ReadAsset', [assetId]);
    const text = decode(result);
    upsertAssetCache(assetId, text);
    return parseJsonOrText(text);
}

export async function assetExists(assetId: string): Promise<boolean> {
    const result = await evaluate('AssetExists', [assetId]);
    return decode(result).trim() === 'true';
}

export async function setTolerances(
    assetId: string,
    tolerances: ShippingTolerancesInput,
): Promise<ContractWriteResult<unknown>> {
    const { txId } = await submitWithTxId('setTolerances', [assetId, JSON.stringify(tolerances)]);
    const asset = await readAsset(assetId);
    return { txId, result: asset };
}

export async function addShippingLeg(
    assetId: string,
    leg: ShippingLegInput,
): Promise<ContractWriteResult<unknown>> {
    const { txId } = await submitWithTxId('addShippingLeg', [assetId, JSON.stringify(leg)]);
    const asset = await readAsset(assetId);
    return { txId, result: asset };
}

export async function transferAsset(assetId: string): Promise<ContractWriteResult<unknown>> {
    const { txId } = await submitWithTxId('transferAsset', [assetId]);
    const asset = await readAsset(assetId);
    return { txId, result: asset };
}

/**
 * Note: chaincode marks `assessDamage` as a write transaction (it can flip
 * `isDamaged`), so we submit instead of evaluate and capture a txId.
 */
export async function assessDamage(
    assetId: string,
): Promise<ContractWriteResult<{ isDamaged: boolean }>> {
    const { txId, payload } = await submitWithTxId('assessDamage', [assetId]);
    await readAsset(assetId);
    return { txId, result: { isDamaged: decode(payload).trim() === 'true' } };
}
