/**
 * One-time script: import the Org1 Admin identity from the Fabric test-network
 * MSP folder into the local server wallet so the gateway can authenticate.
 *
 * Reads paths from server/.env (see .env.example):
 *   FABRIC_TESTNET, FABRIC_IDENTITY, FABRIC_MSP_ID, WALLET_PATH
 */

import fs from 'fs';
import path from 'path';
import { Wallets, X509Identity } from 'fabric-network';
import { config } from '../src/config';
import { defaultAdminMspPath } from '../src/fabric/gateway';

function readSinglePemFile(dir: string, label: string): string {
    if (!fs.existsSync(dir)) {
        throw new Error(`Expected ${label} directory at ${dir}, not found`);
    }
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.pem') || f.endsWith('_sk'));
    if (files.length === 0) {
        throw new Error(`No PEM/key files found in ${label} dir ${dir}`);
    }
    return fs.readFileSync(path.join(dir, files[0]), 'utf8');
}

async function main(): Promise<void> {
    if (!config.fabricTestnet) {
        console.error('FABRIC_TESTNET is not set. Configure server/.env first.');
        process.exit(1);
    }

    const mspDir = defaultAdminMspPath();
    const certDir = path.join(mspDir, 'signcerts');
    const keyDir = path.join(mspDir, 'keystore');

    console.log(`Reading admin certificate from ${certDir}`);
    const certificate = readSinglePemFile(certDir, 'signcerts');

    console.log(`Reading admin private key from ${keyDir}`);
    const privateKey = readSinglePemFile(keyDir, 'keystore');

    fs.mkdirSync(config.walletPath, { recursive: true });
    const wallet = await Wallets.newFileSystemWallet(config.walletPath);

    const existing = await wallet.get(config.fabricIdentity);
    if (existing) {
        console.log(
            `Identity "${config.fabricIdentity}" already exists in wallet ${config.walletPath}. Overwriting.`,
        );
    }

    const identity: X509Identity = {
        credentials: { certificate, privateKey },
        mspId: config.fabricMspId,
        type: 'X.509',
    };

    await wallet.put(config.fabricIdentity, identity);
    console.log(
        `Imported identity "${config.fabricIdentity}" (mspId=${config.fabricMspId}) into wallet at ${config.walletPath}`,
    );
}

main().catch((err) => {
    console.error('enroll-admin failed:', err);
    process.exit(1);
});
