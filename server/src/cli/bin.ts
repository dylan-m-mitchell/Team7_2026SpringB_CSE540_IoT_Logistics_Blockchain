#!/usr/bin/env node
import { Command, Option } from 'commander';
import { config } from '../config';
import { ApiClient, ApiError } from './client';

interface GlobalOpts {
    apiUrl: string;
    json?: boolean;
}

function getClient(cmd: Command): ApiClient {
    const opts = cmd.optsWithGlobals<GlobalOpts>();
    return new ApiClient({ baseUrl: opts.apiUrl });
}

function isJsonOutput(cmd: Command): boolean {
    return cmd.optsWithGlobals<GlobalOpts>().json === true;
}

function print(value: unknown, cmd: Command): void {
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

function asNumber(value: string | undefined): number | undefined {
    if (value === undefined) return undefined;
    const n = Number(value);
    if (Number.isNaN(n)) throw new Error(`expected number, got "${value}"`);
    return n;
}

function buildProgram(): Command {
    const program = new Command();
    program
        .name('tt')
        .description('Team 7 asset tracker CLI - drives the chaincode REST backend')
        .version('0.1.0')
        .option('--api-url <url>', 'backend base URL', config.apiUrl)
        .addOption(new Option('--json', 'emit raw JSON responses').default(false));

    const asset = program.command('asset').description('Asset management commands');

    asset
        .command('create <id>')
        .description('Create a new asset on-chain')
        .action(async (id: string, _opts, cmd: Command) => {
            const client = getClient(cmd.parent as Command);
            const result = await client.post(`/assets`, { id });
            print(result, cmd.parent as Command);
        });

    asset
        .command('get <id>')
        .description('Read an asset (on-chain + cached)')
        .action(async (id: string, _opts, cmd: Command) => {
            const client = getClient(cmd.parent as Command);
            const result = await client.get(`/assets/${encodeURIComponent(id)}`);
            print(result, cmd.parent as Command);
        });

    asset
        .command('exists <id>')
        .description('Check if an asset exists on-chain')
        .action(async (id: string, _opts, cmd: Command) => {
            const client = getClient(cmd.parent as Command);
            const result = await client.get(`/assets/${encodeURIComponent(id)}/exists`);
            print(result, cmd.parent as Command);
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
        .action(async (id: string, opts: Record<string, string>, cmd: Command) => {
            const client = getClient(cmd.parent as Command);
            const body = {
                tempMin: asNumber(opts.tempMin),
                tempMax: asNumber(opts.tempMax),
                humidityMin: asNumber(opts.humidityMin),
                humidityMax: asNumber(opts.humidityMax),
                shockMin: asNumber(opts.shockMin),
                shockMax: asNumber(opts.shockMax),
            };
            const result = await client.put(`/assets/${encodeURIComponent(id)}/tolerances`, body);
            print(result, cmd.parent as Command);
        });

    asset
        .command('add-leg <id>')
        .description('Append a shipping leg to an asset (handler/receiver are free-form strings)')
        .requiredOption('--handler <id>', 'shipping handler identifier')
        .requiredOption('--receiver <id>', 'shipping receiver identifier')
        .option('--start-ms <n>', 'transit start (epoch ms)', String(Date.now()))
        .requiredOption('--max-transit-ms <n>', 'maximum allowed transit duration (ms)')
        .action(async (id: string, opts: Record<string, string>, cmd: Command) => {
            const client = getClient(cmd.parent as Command);
            const body = {
                shippingHandler: opts.handler,
                shippingReceiver: opts.receiver,
                isComplete: false,
                isSuccess: false,
                transitTimeStartMs: asNumber(opts.startMs) ?? Date.now(),
                maxTransitTimeMs: asNumber(opts.maxTransitMs) ?? 0,
            };
            const result = await client.post(`/assets/${encodeURIComponent(id)}/legs`, body);
            print(result, cmd.parent as Command);
        });

    asset
        .command('transfer <id>')
        .description('Run the transferAsset handoff transaction')
        .action(async (id: string, _opts, cmd: Command) => {
            const client = getClient(cmd.parent as Command);
            const result = await client.post(`/assets/${encodeURIComponent(id)}/transfer`);
            print(result, cmd.parent as Command);
        });

    asset
        .command('damage <id>')
        .description('Run assessDamage for an asset')
        .action(async (id: string, _opts, cmd: Command) => {
            const client = getClient(cmd.parent as Command);
            const result = await client.get(`/assets/${encodeURIComponent(id)}/damage`);
            print(result, cmd.parent as Command);
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
        .action(async (id: string, opts: Record<string, string>, cmd: Command) => {
            const client = getClient(cmd.parent as Command);
            const body = {
                ts: asNumber(opts.ts),
                temp: asNumber(opts.temp),
                humidity: asNumber(opts.humidity),
                shock: asNumber(opts.shock),
                lat: asNumber(opts.lat),
                long: asNumber(opts.long),
            };
            const result = await client.post(`/assets/${encodeURIComponent(id)}/telemetry`, body);
            print(result, cmd.parent as Command);
        });

    telemetry
        .command('list <id>')
        .description('List recent telemetry readings for an asset')
        .option('--limit <n>', 'max rows', '50')
        .action(async (id: string, opts: Record<string, string>, cmd: Command) => {
            const client = getClient(cmd.parent as Command);
            const limit = asNumber(opts.limit) ?? 50;
            const result = await client.get(
                `/assets/${encodeURIComponent(id)}/telemetry?limit=${limit}`,
            );
            print(result, cmd.parent as Command);
        });

    program
        .command('audit')
        .description('Show recent audit log entries')
        .option('--limit <n>', 'max rows', '50')
        .option('--asset <id>', 'filter rows that mention this asset id')
        .option('--command <substr>', 'filter rows whose command contains this substring')
        .action(async (opts: Record<string, string>, cmd: Command) => {
            const client = getClient(cmd.parent as Command);
            const params = new URLSearchParams();
            params.set('limit', String(asNumber(opts.limit) ?? 50));
            if (opts.asset) params.set('asset', opts.asset);
            if (opts.command) params.set('command', opts.command);
            const result = await client.get(`/audit?${params.toString()}`);
            print(result, cmd.parent as Command);
        });

    program
        .command('health')
        .description('Ping the backend healthz endpoint')
        .action(async (_opts, cmd: Command) => {
            const client = getClient(cmd.parent as Command);
            const result = await client.get('/healthz');
            print(result, cmd.parent as Command);
        });

    return program;
}

async function main(): Promise<void> {
    const program = buildProgram();
    try {
        await program.parseAsync(process.argv);
    } catch (err) {
        if (err instanceof ApiError) {
            console.error(`error (${err.status}): ${err.message}`);
            if (err.body) {
                console.error(JSON.stringify(err.body, null, 2));
            }
        } else {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`error: ${msg}`);
        }
        process.exitCode = 1;
    }
}

void main();
