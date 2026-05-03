# Team 7 backend server and CLI

This folder is a **separate Node project** from the Hyperledger Fabric chaincode at the repo root. Keeping it here avoids pulling Express/SQLite into the chaincode deployment image (see the main project plan).

## Prerequisites

- Node.js 20+ (same guidance as [SETUP.md](../SETUP.md) for WSL)
- Fabric test network running with chaincode deployed (same channel and chaincode name as in `.env`)
- `fabric-samples` checkout with `test-network` (path used by enrollment and the connection profile)

## Install

```bash
cd server
npm install
npm run build
```

## Configure

Copy the example env and edit paths to match your machine:

```bash
cp .env.example .env
```

Important variables:

| Variable | Purpose |
|----------|---------|
| `FABRIC_TESTNET` | Absolute path to `fabric-samples/test-network` |
| `FABRIC_CONNECTION_PROFILE` | Usually `.../org1.example.com/connection-org1.json` |
| `WALLET_PATH` | Local directory for the gateway wallet (default `./wallet`) |
| `FABRIC_IDENTITY` | Label for the imported identity (default `admin`) |
| `DB_PATH` | SQLite file path (default `./data/tracker.db`) |
| `PORT` | HTTP port (default `3000`) |

## One-time wallet import (Org1 admin)

This copies the **existing** Org1 admin cert/key from the test-network MSP tree into the local file wallet (no CA enrollment call):

```bash
cd server
npm run enroll-admin
```

Requires `FABRIC_TESTNET` to point at a network that has been brought up at least once so the MSP folders exist.

## Run the HTTP API

```bash
cd server
npm start
```

Health check: `GET /healthz`

## Run the CLI (`tt`)

**Always invoke the CLI through npm** so the correct `dist/` is used (do not run `node dist/cli/bin.js` from the **repo root** — that path is chaincode output, not this server).

From the **repository root**:

```bash
npm run cli -- --help
npm run cli -- health
npm run cli -- asset create asset_demo_01
```

From **`server/`** after `npm run build`:

```bash
npx tt --help
node dist/cli/bin.js health --api-url http://localhost:3000
```

Global options:

- `--api-url <url>` — backend base URL (default `http://localhost:3000` or `API_URL` from `.env`)
- `--json` — print raw JSON

## Example flow (mirrors SETUP.md demo)

With the Fabric network up, chaincode deployed as `assetTransfer` on `mychannel`, and the server running:

```bash
# from repo root
npm run cli -- asset create asset2
npm run cli -- asset exists asset2
npm run cli -- asset get asset2
npm run cli -- asset tolerances asset2 --temp-min 20 --temp-max 80 --humidity-min 13 --humidity-max 65 --shock-max 10
npm run cli -- telemetry record asset2 --temp 25 --humidity 40 --shock 0.5
npm run cli -- telemetry list asset2 --limit 10
npm run cli -- audit --limit 20
```

Contract calls that need two peers (invoke) go through the Fabric gateway; if the network is down, the API returns `500` and the CLI shows the error body.

## Troubleshooting

### `Cannot find module '.../dist/cli/bin.js'`

You ran Node from the wrong directory. Use `npm run cli -- …` from the repo root, or `cd server && node dist/cli/bin.js …`.

### `fetch failed` / connection refused from the CLI

Start the server first (`cd server && npm start`). Confirm `--api-url` matches the listening port.

### `Identity "admin" not found in wallet`

Run `npm run enroll-admin` from `server/` after setting `FABRIC_TESTNET` in `.env`.

### `Fabric connection profile not found`

Ensure `./network.sh up` was run in the test network and that `FABRIC_CONNECTION_PROFILE` points at `connection-org1.json`.
