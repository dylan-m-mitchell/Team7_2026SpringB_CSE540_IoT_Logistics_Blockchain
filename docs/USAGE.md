# How to use this project

**Order matters:** Hyperledger Fabric must already be **up** with this repo’s chaincode **deployed** before you start the backend or run the CLI against it. If you have not done that yet, follow [FABRIC_SETUP.md](FABRIC_SETUP.md) first and keep the network running.

Two ways to talk to the chaincode:

1. **Backend + CLI (recommended)** — REST server talks to Fabric; you use `tt` or `curl`.
2. **Raw Fabric CLI** — `peer chaincode invoke/query` as in [SETUP.md](../SETUP.md).

This page covers (1). For install paths, env vars, and troubleshooting, see [server/README.md](../server/README.md).

---

## One-time setup

1. Fabric running + channel + chaincode deployed — see [FABRIC_SETUP.md](FABRIC_SETUP.md).
2. Configure and build the server:
  ```bash
   cd server
   cp .env.example .env
   # Edit .env: set FABRIC_TESTNET to your fabric-samples/test-network path
   npm install && npm run build
   npm run enroll-admin
  ```
3. Start the API (leave this terminal open):
  ```bash
   npm start
  ```

Boot prints `[ok]` / `[FAIL]` config lines. Fix any `[FAIL]` before using the CLI.

---

## Daily use

From the **repo root** (with the server running):


| Goal                           | Command                                                                                                               |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Check API + Fabric + DB        | `npm run cli -- health`                                                                                               |
| Create an asset                | `npm run cli -- asset create <id>`                                                                                    |
| Read ledger state              | `npm run cli -- asset get <id>`                                                                                       |
| Check existence                | `npm run cli -- asset exists <id>`                                                                                    |
| Set tolerances                 | `npm run cli -- asset tolerances <id> --temp-min 20 --temp-max 80 --humidity-min 13 --humidity-max 65 --shock-max 10` |
| Add a shipping leg             | `npm run cli -- asset add-leg <id> --handler H --receiver R --max-transit-ms 3600000`                                 |
| Record off-chain sensor data   | `npm run cli -- telemetry record <id> --temp 25 --humidity 40`                                                        |
| List telemetry                 | `npm run cli -- telemetry list <id>`                                                                                  |
| Audit trail (HTTP + chaincode) | `npm run cli -- audit --limit 20`                                                                                     |
| Audit for one asset            | `npm run cli -- audit --asset <id>`                                                                                   |
| Raw JSON                       | add `--json` right after `cli --`, e.g. `npm run cli -- --json asset get <id>`                                        |


Write responses include a `**txId`** (Fabric transaction id) for traceability.

---

## Scripted demo

With the server running:

```bash
npm run demo --prefix server
```

Uses `API_URL` (default `http://localhost:3000`). Override: `API_URL=http://127.0.0.1:3000 npm run demo --prefix server`.

---

## REST (optional)

Same operations as HTTP, e.g. `GET http://localhost:3000/healthz`, `POST http://localhost:3000/assets` with body `{"id":"myAsset"}`. See route handlers under `server/src/routes/`.