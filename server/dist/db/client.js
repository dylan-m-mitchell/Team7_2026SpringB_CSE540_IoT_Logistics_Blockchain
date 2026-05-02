"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
exports.closeDb = closeDb;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const config_1 = require("../config");
const schema_1 = require("./schema");
let db = null;
function getDb() {
    if (db)
        return db;
    const dbDir = path_1.default.dirname(config_1.config.dbPath);
    fs_1.default.mkdirSync(dbDir, { recursive: true });
    db = new better_sqlite3_1.default(config_1.config.dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.exec(schema_1.SCHEMA_SQL);
    return db;
}
function closeDb() {
    if (db) {
        db.close();
        db = null;
    }
}
//# sourceMappingURL=client.js.map