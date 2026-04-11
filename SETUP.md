# Chaincode Demo Workflow (README Flow, WSL)

This runbook follows the same deployment sequence as README.md:
1) network up
2) create channel
3) deploy chaincode

## 1) Precheck (WSL Node/NPM)

Make sure WSL is using Linux node/npm, not Windows node/npm mounted at /mnt/c.

```bash
which node
which npm
node -v
npm -v
```

If either path starts with `/mnt/c/`, install Node inside WSL first (for example with nvm), then reopen the shell.

## 2) Build + Deploy Chaincode (README Sequence)

```bash
CC_PATH=/home/dylan/repos/CSE540_Team7_Project
FABRIC_TESTNET=/home/dylan/fabric-samples/test-network
CC_NAME=assetTransfer
CHANNEL_NAME=mychannel

cd "$FABRIC_TESTNET"
# Optional clean restart for a deterministic demo
./network.sh down

./network.sh up
./network.sh createChannel -c "$CHANNEL_NAME"

./network.sh deployCC \
  -ccn "$CC_NAME" \
  -ccl typescript \
  -ccp "$CC_PATH" \
  -c "$CHANNEL_NAME"
```

## 3) Set CLI Environment (Org1)

Run this from `test-network` before invoke/query commands:

```bash
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=${PWD}/../config/

export CHANNEL_NAME=mychannel
export CC_NAME=assetTransfer

export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID=Org1MSP
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

export ORDERER_CA=${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
export PEER0_ORG1_CA=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export PEER0_ORG2_CA=${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
```

## 4) Demo Validation Path

Use `--waitForEvent` on invoke so query checks are deterministic.

```bash
peer chaincode invoke \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls --cafile "$ORDERER_CA" \
  --waitForEvent \
  -C "$CHANNEL_NAME" \
  -n "$CC_NAME" \
  --peerAddresses localhost:7051 --tlsRootCertFiles "$PEER0_ORG1_CA" \
  --peerAddresses localhost:9051 --tlsRootCertFiles "$PEER0_ORG2_CA" \
  -c '{"function":"CreateAsset","Args":["asset2"]}'

peer chaincode query \
  -C "$CHANNEL_NAME" \
  -n "$CC_NAME" \
  -c '{"function":"AssetExists","Args":["asset2"]}'

peer chaincode query \
  -C "$CHANNEL_NAME" \
  -n "$CC_NAME" \
  -c '{"function":"ReadAsset","Args":["asset2"]}'
```

Expected:
- `CreateAsset` invoke returns `status:200`.
- `AssetExists` returns `true`.
- `ReadAsset` returns JSON that includes `"assetId":"asset2"`.

## 4) Quick Check

```bash
peer lifecycle chaincode querycommitted -C "$CHANNEL_NAME" -n "$CC_NAME"
```

## 5) Troubleshooting (Chaincode Container Exited)

- Symptom: invoke/query returns `status:500` and chaincode container exits immediately.
- Check chaincode container logs:

```bash
docker ps -a --format '{{.Names}}' | grep -i dev-peer | grep assettransfer
docker logs --tail 200 <dev-peer-container-name>
```

- If you see schema/metadata errors like `MissingRefError ... missingRef Array`:
  - Ensure `asset.ts` model metadata decorators are not forcing unsupported schema references.
  - Redeploy after `./network.sh down`, then `up`, `createChannel`, and `deployCC`.

- If deploy output shows `npm`/`tsc` Windows UNC errors during `deployCC` compile step:
  - Your WSL is still using Windows npm/node.
  - Fix WSL node/npm first, then rerun Step 2.