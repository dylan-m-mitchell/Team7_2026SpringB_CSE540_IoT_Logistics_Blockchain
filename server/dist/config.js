"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ quiet: true });
function resolveFromServerRoot(p) {
    return path_1.default.isAbsolute(p) ? p : path_1.default.resolve(__dirname, '..', p);
}
function expandEnv(value) {
    return value.replace(/\$\{([A-Z0-9_]+)\}/g, (_, name) => process.env[name] ?? '');
}
const fabricTestnet = process.env.FABRIC_TESTNET ?? '';
const defaultConnectionProfile = fabricTestnet
    ? path_1.default.join(fabricTestnet, 'organizations/peerOrganizations/org1.example.com/connection-org1.json')
    : '';
exports.config = {
    port: Number(process.env.PORT ?? 3000),
    dbPath: resolveFromServerRoot(process.env.DB_PATH ?? './data/tracker.db'),
    walletPath: resolveFromServerRoot(process.env.WALLET_PATH ?? './wallet'),
    fabricIdentity: process.env.FABRIC_IDENTITY ?? 'admin',
    fabricMspId: process.env.FABRIC_MSP_ID ?? 'Org1MSP',
    fabricTestnet,
    fabricConnectionProfile: expandEnv(process.env.FABRIC_CONNECTION_PROFILE ?? defaultConnectionProfile),
    fabricChannel: process.env.FABRIC_CHANNEL ?? 'mychannel',
    fabricChaincode: process.env.FABRIC_CHAINCODE ?? 'assetTransfer',
    apiUrl: process.env.API_URL ?? 'http://localhost:3000',
};
//# sourceMappingURL=config.js.map