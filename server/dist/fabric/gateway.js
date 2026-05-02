"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContract = getContract;
exports.disconnectGateway = disconnectGateway;
exports.gatewayPaths = gatewayPaths;
exports.gatewayStatus = gatewayStatus;
exports.fabricTestnetPath = fabricTestnetPath;
exports.defaultAdminMspPath = defaultAdminMspPath;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const fabric_network_1 = require("fabric-network");
const config_1 = require("../config");
let cached = null;
let connecting = null;
async function loadWallet() {
    fs_1.default.mkdirSync(config_1.config.walletPath, { recursive: true });
    return fabric_network_1.Wallets.newFileSystemWallet(config_1.config.walletPath);
}
function loadConnectionProfile() {
    if (!config_1.config.fabricConnectionProfile) {
        throw new Error('FABRIC_CONNECTION_PROFILE is not set. Configure server/.env (see .env.example).');
    }
    if (!fs_1.default.existsSync(config_1.config.fabricConnectionProfile)) {
        throw new Error(`Fabric connection profile not found at ${config_1.config.fabricConnectionProfile}. ` +
            `Ensure the test-network is up and FABRIC_CONNECTION_PROFILE points at the right file.`);
    }
    const raw = fs_1.default.readFileSync(config_1.config.fabricConnectionProfile, 'utf8');
    return JSON.parse(raw);
}
async function connect() {
    const wallet = await loadWallet();
    const identity = await wallet.get(config_1.config.fabricIdentity);
    if (!identity) {
        throw new Error(`Identity "${config_1.config.fabricIdentity}" not found in wallet at ${config_1.config.walletPath}. ` +
            `Run: npm --prefix server run enroll-admin`);
    }
    const profile = loadConnectionProfile();
    const gateway = new fabric_network_1.Gateway();
    await gateway.connect(profile, {
        wallet,
        identity: config_1.config.fabricIdentity,
        discovery: { enabled: true, asLocalhost: true },
    });
    const network = await gateway.getNetwork(config_1.config.fabricChannel);
    const contract = network.getContract(config_1.config.fabricChaincode);
    return { gateway, contract };
}
async function getContract() {
    if (cached)
        return cached.contract;
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
async function disconnectGateway() {
    if (cached) {
        cached.gateway.disconnect();
        cached = null;
    }
    connecting = null;
}
function gatewayPaths() {
    return { wallet: config_1.config.walletPath, profile: config_1.config.fabricConnectionProfile };
}
/**
 * Lazily resolves the gateway and reports whether the chaincode contract can
 * be reached. Used by `/healthz` so an unhealthy Fabric link surfaces as a
 * 503 rather than a per-request 500.
 */
async function gatewayStatus() {
    const base = {
        channel: config_1.config.fabricChannel,
        chaincode: config_1.config.fabricChaincode,
        identity: config_1.config.fabricIdentity,
    };
    try {
        await getContract();
        return { connected: true, ...base };
    }
    catch (err) {
        return {
            connected: false,
            ...base,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}
function fabricTestnetPath() {
    return config_1.config.fabricTestnet;
}
function defaultAdminMspPath() {
    return path_1.default.join(config_1.config.fabricTestnet, 'organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp');
}
//# sourceMappingURL=gateway.js.map