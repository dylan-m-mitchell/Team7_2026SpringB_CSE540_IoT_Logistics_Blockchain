import fs from 'fs';
import path from 'path';
import { Contract, Gateway, Wallets, Wallet } from 'fabric-network';
import { config } from '../config';

interface GatewayHandle {
    gateway: Gateway;
    contract: Contract;
}

let cached: GatewayHandle | null = null;
let connecting: Promise<GatewayHandle> | null = null;

async function loadWallet(): Promise<Wallet> {
    fs.mkdirSync(config.walletPath, { recursive: true });
    return Wallets.newFileSystemWallet(config.walletPath);
}

function loadConnectionProfile(): Record<string, unknown> {
    if (!config.fabricConnectionProfile) {
        throw new Error(
            'FABRIC_CONNECTION_PROFILE is not set. Configure server/.env (see .env.example).',
        );
    }
    if (!fs.existsSync(config.fabricConnectionProfile)) {
        throw new Error(
            `Fabric connection profile not found at ${config.fabricConnectionProfile}. ` +
                `Ensure the test-network is up and FABRIC_CONNECTION_PROFILE points at the right file.`,
        );
    }
    const raw = fs.readFileSync(config.fabricConnectionProfile, 'utf8');
    return JSON.parse(raw) as Record<string, unknown>;
}

async function connect(): Promise<GatewayHandle> {
    const wallet = await loadWallet();
    const identity = await wallet.get(config.fabricIdentity);
    if (!identity) {
        throw new Error(
            `Identity "${config.fabricIdentity}" not found in wallet at ${config.walletPath}. ` +
                `Run: npm --prefix server run enroll-admin`,
        );
    }

    const profile = loadConnectionProfile();
    const gateway = new Gateway();
    await gateway.connect(profile, {
        wallet,
        identity: config.fabricIdentity,
        discovery: { enabled: true, asLocalhost: true },
    });

    const network = await gateway.getNetwork(config.fabricChannel);
    const contract = network.getContract(config.fabricChaincode);
    return { gateway, contract };
}

export async function getContract(): Promise<Contract> {
    if (cached) return cached.contract;
    if (!connecting) {
        connecting = connect()
            .then((handle) => {
                cached = handle;
                return handle;
            })
            .catch((err) => {
                connecting = null;
                throw err;
            });
    }
    const handle = await connecting;
    return handle.contract;
}

export async function disconnectGateway(): Promise<void> {
    if (cached) {
        cached.gateway.disconnect();
        cached = null;
    }
    connecting = null;
}

export function gatewayPaths(): { wallet: string; profile: string } {
    return { wallet: config.walletPath, profile: config.fabricConnectionProfile };
}

export interface GatewayStatus {
    connected: boolean;
    channel: string;
    chaincode: string;
    identity: string;
    error?: string;
}

/**
 * Lazily resolves the gateway and reports whether the chaincode contract can
 * be reached. Used by `/healthz` so an unhealthy Fabric link surfaces as a
 * 503 rather than a per-request 500.
 */
export async function gatewayStatus(): Promise<GatewayStatus> {
    const base = {
        channel: config.fabricChannel,
        chaincode: config.fabricChaincode,
        identity: config.fabricIdentity,
    };
    try {
        await getContract();
        return { connected: true, ...base };
    } catch (err) {
        return {
            connected: false,
            ...base,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}

export function fabricTestnetPath(): string {
    return config.fabricTestnet;
}

export function defaultAdminMspPath(): string {
    return path.join(
        config.fabricTestnet,
        'organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp',
    );
}
