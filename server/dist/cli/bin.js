#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const config_1 = require("../config");
const client_1 = require("./client");
function getClient(cmd) {
    const opts = cmd.optsWithGlobals();
    return new client_1.ApiClient({ baseUrl: opts.apiUrl });
}
function isJsonOutput(cmd) {
    return cmd.optsWithGlobals().json === true;
}
function print(value, cmd) {
    if (isJsonOutput(cmd)) {
        console.log(JSON.stringify(value, null, 2));
        return;
    }
    if (typeof value === 'string') {
        console.log(value);
        return;
    }
    console.log(JSON.stringify(value, null, 2));
}
function asNumber(value) {
    if (value === undefined)
        return undefined;
    const n = Number(value);
    if (Number.isNaN(n))
        throw new Error(`expected number, got "${value}"`);
    return n;
}
function buildProgram() {
    const program = new commander_1.Command();
    program
        .name('tt')
        .description('Team 7 asset tracker CLI - drives the chaincode REST backend')
        .version('0.1.0')
        .option('--api-url <url>', 'backend base URL', config_1.config.apiUrl)
        .addOption(new commander_1.Option('--json', 'emit raw JSON responses').default(false));
    const asset = program.command('asset').description('Asset management commands');
    asset
        .command('create <id>')
        .description('Create a new asset on-chain')
        .action(async (id, _opts, cmd) => {
        const client = getClient(cmd.parent);
        const result = await client.post(`/assets`, { id });
        print(result, cmd.parent);
    });
    asset
        .command('get <id>')
        .description('Read an asset (on-chain + cached)')
        .action(async (id, _opts, cmd) => {
        const client = getClient(cmd.parent);
        const result = await client.get(`/assets/${encodeURIComponent(id)}`);
        print(result, cmd.parent);
    });
    asset
        .command('exists <id>')
        .description('Check if an asset exists on-chain')
        .action(async (id, _opts, cmd) => {
        const client = getClient(cmd.parent);
        const result = await client.get(`/assets/${encodeURIComponent(id)}/exists`);
        print(result, cmd.parent);
    });
    asset
        .command('tolerances <id>')
        .description('Set shipping tolerances for an asset')
        .option('--temp-min <n>', 'minimum temperature')
        .option('--temp-max <n>', 'maximum temperature')
        .option('--humidity-min <n>', 'minimum humidity')
        .option('--humidity-max <n>', 'maximum humidity')
        .option('--shock-min <n>', 'minimum shock')
        .option('--shock-max <n>', 'maximum shock')
        .action(async (id, opts, cmd) => {
        const client = getClient(cmd.parent);
        const body = {
            tempMin: asNumber(opts.tempMin),
            tempMax: asNumber(opts.tempMax),
            humidityMin: asNumber(opts.humidityMin),
            humidityMax: asNumber(opts.humidityMax),
            shockMin: asNumber(opts.shockMin),
            shockMax: asNumber(opts.shockMax),
        };
        const result = await client.put(`/assets/${encodeURIComponent(id)}/tolerances`, body);
        print(result, cmd.parent);
    });
    asset
        .command('add-leg <id>')
        .description('Append a shipping leg to an asset (handler/receiver are free-form strings)')
        .requiredOption('--handler <id>', 'shipping handler identifier')
        .requiredOption('--receiver <id>', 'shipping receiver identifier')
        .option('--start-ms <n>', 'transit start (epoch ms)', String(Date.now()))
        .requiredOption('--max-transit-ms <n>', 'maximum allowed transit duration (ms)')
        .action(async (id, opts, cmd) => {
        const client = getClient(cmd.parent);
        const body = {
            shippingHandler: opts.handler,
            shippingReceiver: opts.receiver,
            isComplete: false,
            isSuccess: false,
            transitTimeStartMs: asNumber(opts.startMs) ?? Date.now(),
            maxTransitTimeMs: asNumber(opts.maxTransitMs) ?? 0,
        };
        const result = await client.post(`/assets/${encodeURIComponent(id)}/legs`, body);
        print(result, cmd.parent);
    });
    asset
        .command('transfer <id>')
        .description('Run the transferAsset handoff transaction')
        .action(async (id, _opts, cmd) => {
        const client = getClient(cmd.parent);
        const result = await client.post(`/assets/${encodeURIComponent(id)}/transfer`);
        print(result, cmd.parent);
    });
    asset
        .command('damage <id>')
        .description('Run assessDamage for an asset')
        .action(async (id, _opts, cmd) => {
        const client = getClient(cmd.parent);
        const result = await client.get(`/assets/${encodeURIComponent(id)}/damage`);
        print(result, cmd.parent);
    });
    const telemetry = program.command('telemetry').description('Off-chain sensor telemetry');
    telemetry
        .command('record <id>')
        .description('Record a sensor reading for an asset (off-chain only)')
        .option('--temp <n>', 'temperature reading')
        .option('--humidity <n>', 'humidity reading')
        .option('--shock <n>', 'shock reading')
        .option('--lat <n>', 'latitude')
        .option('--long <n>', 'longitude')
        .option('--ts <n>', 'override timestamp (epoch ms)')
        .action(async (id, opts, cmd) => {
        const client = getClient(cmd.parent);
        const body = {
            ts: asNumber(opts.ts),
            temp: asNumber(opts.temp),
            humidity: asNumber(opts.humidity),
            shock: asNumber(opts.shock),
            lat: asNumber(opts.lat),
            long: asNumber(opts.long),
        };
        const result = await client.post(`/assets/${encodeURIComponent(id)}/telemetry`, body);
        print(result, cmd.parent);
    });
    telemetry
        .command('list <id>')
        .description('List recent telemetry readings for an asset')
        .option('--limit <n>', 'max rows', '50')
        .action(async (id, opts, cmd) => {
        const client = getClient(cmd.parent);
        const limit = asNumber(opts.limit) ?? 50;
        const result = await client.get(`/assets/${encodeURIComponent(id)}/telemetry?limit=${limit}`);
        print(result, cmd.parent);
    });
    program
        .command('audit')
        .description('Show recent audit log entries')
        .option('--limit <n>', 'max rows', '50')
        .option('--asset <id>', 'filter rows that mention this asset id')
        .option('--command <substr>', 'filter rows whose command contains this substring')
        .action(async (opts, cmd) => {
        const client = getClient(cmd.parent);
        const params = new URLSearchParams();
        params.set('limit', String(asNumber(opts.limit) ?? 50));
        if (opts.asset)
            params.set('asset', opts.asset);
        if (opts.command)
            params.set('command', opts.command);
        const result = await client.get(`/audit?${params.toString()}`);
        print(result, cmd.parent);
    });
    program
        .command('health')
        .description('Ping the backend healthz endpoint')
        .action(async (_opts, cmd) => {
        const client = getClient(cmd.parent);
        const result = await client.get('/healthz');
        print(result, cmd.parent);
    });
    return program;
}
async function main() {
    const program = buildProgram();
    try {
        await program.parseAsync(process.argv);
    }
    catch (err) {
        if (err instanceof client_1.ApiError) {
            console.error(`error (${err.status}): ${err.message}`);
            if (err.body) {
                console.error(JSON.stringify(err.body, null, 2));
            }
        }
        else {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`error: ${msg}`);
        }
        process.exitCode = 1;
    }
}
void main();
//# sourceMappingURL=bin.js.map