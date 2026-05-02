"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateConfig = validateConfig;
exports.printChecks = printChecks;
const fs_1 = __importDefault(require("fs"));
const fabric_network_1 = require("fabric-network");
const config_1 = require("./config");
/**
 * Validates the runtime configuration before the HTTP server accepts traffic.
 *
 * Returns one row per check so the boot log clearly tells the operator what
 * is missing. Any `ok: false` row should be treated as fatal by the caller -
 * the chaincode wrappers will fail on the first request anyway, so we'd
 * rather refuse to start than serve broken responses.
 */
async function validateConfig() {
    const checks = [];
    if (!config_1.config.fabricTestnet) {
        checks.push({
            name: 'FABRIC_TESTNET',
            ok: false,
            detail: 'unset; required to derive default Fabric paths (see server/.env.example)',
        });
    }
    else if (!fs_1.default.existsSync(config_1.config.fabricTestnet)) {
        checks.push({
            name: 'FABRIC_TESTNET',
            ok: false,
            detail: `path does not exist: ${config_1.config.fabricTestnet}`,
        });
    }
    else {
        checks.push({ name: 'FABRIC_TESTNET', ok: true, detail: config_1.config.fabricTestnet });
    }
    if (!config_1.config.fabricConnectionProfile) {
        checks.push({
            name: 'FABRIC_CONNECTION_PROFILE',
            ok: false,
            detail: 'unset; expected absolute path to connection-orgN.json',
        });
    }
    else if (!fs_1.default.existsSync(config_1.config.fabricConnectionProfile)) {
        checks.push({
            name: 'FABRIC_CONNECTION_PROFILE',
            ok: false,
            detail: `file not found: ${config_1.config.fabricConnectionProfile}`,
        });
    }
    else {
        checks.push({
            name: 'FABRIC_CONNECTION_PROFILE',
            ok: true,
            detail: config_1.config.fabricConnectionProfile,
        });
    }
    try {
        fs_1.default.mkdirSync(config_1.config.walletPath, { recursive: true });
        const wallet = await fabric_network_1.Wallets.newFileSystemWallet(config_1.config.walletPath);
        const identity = await wallet.get(config_1.config.fabricIdentity);
        if (!identity) {
            checks.push({
                name: 'WALLET_IDENTITY',
                ok: false,
                detail: `identity "${config_1.config.fabricIdentity}" missing in ${config_1.config.walletPath}; run: npm run enroll-admin`,
            });
        }
        else {
            checks.push({
                name: 'WALLET_IDENTITY',
                ok: true,
                detail: `${config_1.config.fabricIdentity} @ ${config_1.config.walletPath}`,
            });
        }
    }
    catch (err) {
        checks.push({
            name: 'WALLET_IDENTITY',
            ok: false,
            detail: `could not read wallet at ${config_1.config.walletPath}: ${err instanceof Error ? err.message : String(err)}`,
        });
    }
    return checks;
}
function printChecks(checks) {
    for (const c of checks) {
        const tag = c.ok ? '[ok]' : '[FAIL]';
        console.log(`${tag} ${c.name}: ${c.detail}`);
    }
}
//# sourceMappingURL=bootCheck.js.map