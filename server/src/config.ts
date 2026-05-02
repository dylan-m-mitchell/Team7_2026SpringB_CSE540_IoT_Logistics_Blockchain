import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

function resolveFromServerRoot(p: string): string {
    return path.isAbsolute(p) ? p : path.resolve(__dirname, '..', p);
}

function expandEnv(value: string): string {
    return value.replace(/\$\{([A-Z0-9_]+)\}/g, (_, name: string) => process.env[name] ?? '');
}

const fabricTestnet = process.env.FABRIC_TESTNET ?? '';

const defaultConnectionProfile = fabricTestnet
    ? path.join(
          fabricTestnet,
          'organizations/peerOrganizations/org1.example.com/connection-org1.json',
      )
    : '';

export const config = {
    port: Number(process.env.PORT ?? 3000),

    dbPath: resolveFromServerRoot(process.env.DB_PATH ?? './data/tracker.db'),
    walletPath: resolveFromServerRoot(process.env.WALLET_PATH ?? './wallet'),

    fabricIdentity: process.env.FABRIC_IDENTITY ?? 'admin',
    fabricMspId: process.env.FABRIC_MSP_ID ?? 'Org1MSP',
    fabricTestnet,
    fabricConnectionProfile: expandEnv(
        process.env.FABRIC_CONNECTION_PROFILE ?? defaultConnectionProfile,
    ),
    fabricChannel: process.env.FABRIC_CHANNEL ?? 'mychannel',
    fabricChaincode: process.env.FABRIC_CHAINCODE ?? 'assetTransfer',

    apiUrl: process.env.API_URL ?? 'http://localhost:3000',
} as const;

export type Config = typeof config;
