# Team 7 Smart Contract - IoT Asset Tracker

# High Level Overview
This project aims to implement a PoC Blockchain Supply Chain Asset Tracker.
We aim to provide an auditable record of asset custody handoffs, along with
an asset damage tracker, so that all parties in the supply chain have a clean
and verifiable mechanism of checking on the delivery and condition of their
goods. 

We aim to implement a basic asset tracking and shipment handling interface,
where the assets being shipped around the world are trackable items on the
blockchain, where any party involved in their shipment or procurement may look
up and assess the current state of tracked assets and be assured that only the
proper parties have access to the delivery and status records of all materials.


# Backend + CLI

A small REST backend and a `tt` CLI live under [`server/`](server/) and replace
the verbose `peer chaincode invoke` commands with one-liners. The backend owns
the Fabric gateway and an off-chain SQLite database (asset cache, telemetry,
audit log). See [`server/README.md`](server/README.md) for install, wallet
enrollment, and the example end-to-end flow (`npm run demo`).


# Basic Background / Reading

- Hyperledger Fabric:
    * Installation: https://hyperledger-fabric.readthedocs.io/en/release-2.2/install.html
    * Getting started and vocab: https://hyperledger-fabric.readthedocs.io/en/release-2.2/test_network.html


# Dependencies
- Docker Desktop: https://docs.docker.com/get-started/get-docker/
- WSL2 (if working on a Windows machine): https://learn.microsoft.com/en-us/windows/wsl/install
    * If on Windows will also need to install `jq` in your WSL environment
        via `$ sudo apt install jq`.
- Hyperledger Fabric Binaries
- Node.js (contract language may change in future)


# Basic Usage / Deployment
- Currently only a dev solution

1. Download and install dependencies from the above section
2. Clone the fabric-samples repository [here](https://github.com/hyperledger/fabric-samples).  This contains the test network we will use to deploy our
contract and simulate peers.
3. Stand up the basic network (2 peers, 2 organisations, and 1 ordering service)
    by navigating to the `test-network` directory and running `./network.sh up`.
    Do not forget that you should have added the fabric binaries to your path
    as of step 1.
4. Create a channel for the two organizations via `$./network.sh createChannel`.
    This will create a channel with the default name
5. Deploy the chaincode via `$ ./network.sh deployCC -ccn assetTransfer -ccl typescript -ccp /home/dylan/repos/Team7_2026SpringB_CSE540_IoT_Logistics_Blockchain`
6. Interact with the network and specific peers and organizations by setting
    environment variables in your terminal and running the fabric `peer` command.
    ```
    # Environment variables for Org1

    export CORE_PEER_TLS_ENABLED=true
    export CORE_PEER_LOCALMSPID="Org1MSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
    export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
    export CORE_PEER_ADDRESS=localhost:7051
    ```
7. Invoke some functions from the deployed chaincode via the `peer` command.
    * These commands are all very bulky so I will alias the common setup with
        the following:

        ```
        $ alias assetTransfer="peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile \"${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem\" -C mychannel -n assetTransfer --peerAddresses localhost:7051 --tlsRootCertFiles \"${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt\" --peerAddresses localhost:9051 --tlsRootCertFiles \"${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt\""
        ```

    * `$ assetTransfer -c '{"function":"CreateAsset","Args":["asset_id_1"]}'`
    * `$ assetTransfer -c '{"function":"AssetExists","Args":["asset_id_1"]}'`
    * `$ assetTransfer -c '{"function":"ReadAsset","Args":["asset_id_1"]}'`
    * Code block
        ```
        $ assetTransfer -c '{
            "function": "setTolerances",
            "Args": [
                "asset_id_1", "{
                    \"humidityMin\": 13,
                    \"humidityMax\": 65,
                    \"tempMin\": 20,
                    \"tempMax\": 80,
                    \"shockMax\": 10
                }"
            ]
        }'
        ```
    * `$ assetTransfer -c '{"function":"ReadAsset","Args":["asset_id_1"]}'`

