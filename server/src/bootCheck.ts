import fs from 'fs';
import { Wallets } from 'fabric-network';
import { config } from './config';

export interface ConfigCheck {
    name: string;
    ok: boolean;
    detail: string;
}

/**
 * Validates the runtime configuration before the HTTP server accepts traffic.
 *
 * Returns one row per check so the boot log clearly tells the operator what
 * is missing. Any `ok: false` row should be treated as fatal by the caller -
 * the chaincode wrappers will fail on the first request anyway, so we'd
 * rather refuse to start than serve broken responses.
 */
export async function validateConfig(): Promise<ConfigCheck[]> {
    const checks: ConfigCheck[] = [];

    if (!config.fabricTestnet) {
        checks.push({
            name: 'FABRIC_TESTNET',
            ok: false,
            detail: 'unset; required to derive default Fabric paths (see server/.env.example)',
        });
    } else if (!fs.existsSync(config.fabricTestnet)) {
        checks.push({
            name: 'FABRIC_TESTNET',
            ok: false,
            detail: `path does not exist: ${config.fabricTestnet}`,
        });
    } else {
        checks.push({ name: 'FABRIC_TESTNET', ok: true, detail: config.fabricTestnet });
    }

    if (!config.fabricConnectionProfile) {
        checks.push({
            name: 'FABRIC_CONNECTION_PROFILE',
            ok: false,
            detail: 'unset; expected absolute path to connection-orgN.json',
        });
    } else if (!fs.existsSync(config.fabricConnectionProfile)) {
        checks.push({
            name: 'FABRIC_CONNECTION_PROFILE',
            ok: false,
            detail: `file not found: ${config.fabricConnectionProfile}`,
        });
    } else {
        checks.push({
            name: 'FABRIC_CONNECTION_PROFILE',
            ok: true,
            detail: config.fabricConnectionProfile,
        });
    }

    try {
        fs.mkdirSync(config.walletPath, { recursive: true });
        const wallet = await Wallets.newFileSystemWallet(config.walletPath);
        const identity = await wallet.get(config.fabricIdentity);
        if (!identity) {
            checks.push({
                name: 'WALLET_IDENTITY',
                ok: false,
                detail: `identity "${config.fabricIdentity}" missing in ${config.walletPath}; run: npm run enroll-admin`,
            });
        } else {
            checks.push({
                name: 'WALLET_IDENTITY',
                ok: true,
                detail: `${config.fabricIdentity} @ ${config.walletPath}`,
            });
        }
    } catch (err) {
        checks.push({
            name: 'WALLET_IDENTITY',
            ok: false,
            detail: `could not read wallet at ${config.walletPath}: ${err instanceof Error ? err.message : String(err)}`,
        });
    }

    return checks;
}

export function printChecks(checks: ConfigCheck[]): void {
    for (const c of checks) {
        const tag = c.ok ? '[ok]' : '[FAIL]';
        console.log(`${tag} ${c.name}: ${c.detail}`);
    }
}
