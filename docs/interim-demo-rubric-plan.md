# Interim Demo Rubric Plan

## Scope and Positioning
This plan is for a 5-minute interim demo of the Team 7 Hyperledger Fabric chaincode prototype in this repository. It is aligned to the four rubric criteria and is written to be presented directly.

---

## 1) Project Status Explanation (Rubric Criterion 1)

### Current Objective
Deliver a proof-of-concept blockchain asset tracking contract for custody handoffs and shipment-condition governance using Hyperledger Fabric chaincode in TypeScript.

### Implemented Features (Backed by Current Code)
- Chaincode contract export and registration are wired through `index.ts` with `AssetTransferContract`.
- Asset lifecycle foundation is implemented in `assetTransfer.ts`:
  - `CreateAsset(ctx, id)` creates a ledger record.
  - `AssetExists(ctx, id)` checks presence in state.
  - `ReadAsset(ctx, id)` returns persisted JSON.
  - `updateAsset(ctx, newAssetJson)` supports partial updates via merge logic.
- Route and tolerance configuration are implemented in `assetTransfer.ts`:
  - `setTolerances(ctx, id, tolerancesJson)` sets shipment limits before shipment starts.
  - `addShippingLeg(ctx, assetId, shippingLegJson)` appends a planned shipping leg before shipment.
- Asset model and helper behavior are implemented in `asset.ts`:
  - Data model for `Asset`, `ShippingLeg`, and `ShippingTolerances`.
  - Helper methods `getCurrentLocation()`, `getCurrentState()`, `getCurrentShippingLeg()`.
- Deterministic state serialization is implemented in `assetTransfer.ts` via `toStateBytes(...)` using `json-stringify-deterministic` and `sort-keys-recursive`.
- Build/deploy workflow is documented in `README.md` and `SETUP.md` (Fabric test network, channel creation, chaincode deployment, invoke/query examples).

### Work In Progress
- Damage/state evaluation is partially implemented:
  - `assessDamage(ctx, id)` contains tolerance and elapsed-time evaluation logic.
  - It currently relies on `asset.getCurrentState()` in `asset.ts`, which is still a stub.
- Transfer orchestration is partially implemented:
  - `transferAsset(ctx, id)` enforces damage checks and calls `assessDamage(...)`.
  - Final location/receiver validation and shipping-leg completion state transitions are TODO.

### Remaining Milestones (Specific)
- Implement sensor/state ingestion path so `getCurrentState()` returns real telemetry (temperature, humidity, shock).
- Complete transfer completion logic in `transferAsset(...)`:
  - Receiver/location verification.
  - Mark current leg complete.
  - Mark `isDelivered` at final leg.
- Add role/identity authorization checks for route edits and transfer operations (currently noted as TODO).
- Add test coverage for create/read/update/tolerance/leg/transfer error paths.
- Add repeatable demo scripts for invoke + query sequences and expected outputs.

---

## 2) Working Demonstration (Rubric Criterion 2)

### Demo Goal
Show that the deployed chaincode can create and query assets on-ledger and can be configured for shipment constraints in a realistic workflow.

### Stakeholder Workflow Scenario (Clear User Interaction)
Stakeholders in this flow:
- Manufacturer Admin (Org1): creates asset and sets tolerances.
- Logistics Coordinator (Org1/Org2 coordination): adds shipping legs.
- Receiver Ops (Org2): queries latest asset state before acceptance.

Workflow shown live:
1. Start Fabric test network and deploy chaincode using steps from `SETUP.md`.
2. Manufacturer Admin invokes `CreateAsset` for `asset_demo_01`.
3. Manufacturer Admin queries `AssetExists` and `ReadAsset` to confirm initial on-ledger state.
4. Logistics Coordinator invokes `setTolerances` with JSON thresholds (temp/humidity/shock).
5. Logistics Coordinator invokes `addShippingLeg` with leg JSON.
6. Receiver Ops queries `ReadAsset` to verify configuration committed to ledger.

### What We Intentionally Do and Do Not Claim
- We demonstrate successful ledger CRUD/configuration behavior that is implemented now.
- We do not claim fully completed custody handoff execution because transfer completion/location verification remains in-progress in `transferAsset(...)`.

### Evidence Anchors During Demo
- Invoke/query command style follows `README.md` and `SETUP.md`.
- On successful calls, ledger state changes are visible through `ReadAsset` output before/after updates.

---

## 3) Code Walkthrough (High-Level) (Rubric Criterion 3)

### Architecture at a Glance
- `index.ts`: chaincode entrypoint that exports the contract list used by Fabric runtime.
- `assetTransfer.ts`: primary smart-contract transaction logic and ledger state mutation.
- `asset.ts`: shared asset domain model and helper methods used by contract logic.

### High-Level Call/State Flow
1. Fabric runtime loads `AssetTransferContract` from `index.ts`.
2. Transaction function is invoked (for example `CreateAsset`, `setTolerances`, `addShippingLeg`).
3. Contract reads current ledger state through `ctx.stub.getState(...)` as needed.
4. Domain object is parsed/merged (`parseAsset`, `parseJson`, `updateAssetInternal`).
5. Updated object is deterministically serialized (`toStateBytes`) and persisted with `ctx.stub.putState(...)`.
6. Query (`ReadAsset`) returns JSON string for verification.

### Smart-Contract Logic to Highlight Verbally
- `CreateAsset`: prevents duplicates by checking `AssetExists` before write.
- `setTolerances`: protects route integrity by blocking edits after shipment starts.
- `addShippingLeg`: blocks route edits once shipped/delivered.
- `assessDamage`: compares measured values against configured min/max tolerances and transit-time limits.
- `transferAsset`: currently enforces damage gate and is structured for final receiver/location handoff checks.

### Why This Matters for the Demo
This walkthrough demonstrates that the ledger model, transaction boundaries, and update/query lifecycle are already functional, while clearly identifying where transfer finalization behavior is being completed next.

---

## 4) Clarity, Timing and Professionalism (5 min) (Rubric Criterion 4)

## Timed Speaking Plan (Target 5:00, acceptable 4:30-5:30)

- 0:00-0:35 (35s): Problem framing and project objective.
- 0:35-1:45 (70s): Project status: implemented vs in-progress vs remaining milestones.
- 1:45-3:25 (100s): Live working demonstration with stakeholder workflow.
- 3:25-4:30 (65s): High-level code walkthrough and component interaction.
- 4:30-5:00 (30s): Risks/gaps, mitigations, and next sprint commitments.

### Delivery Standards
- One presenter drives CLI commands; second presenter narrates expected vs observed outcomes.
- Use concise language: state function name, expected behavior, then observed result.
- Explicitly mark incomplete items as in-progress (avoid overclaiming).
- Keep transitions anchored to rubric labels so evaluators can map coverage quickly.

---

## Risks, Gaps, and Mitigation / Next Sprint Steps

### Current Risks or Gaps
- Telemetry state feed is not yet integrated, so damage evaluation currently depends on stubbed asset state retrieval.
- `transferAsset(...)` final handoff completion logic is partially scaffolded but not finalized.
- Authorization logic for who can modify shipment plans is noted but not yet implemented.
- No committed automated tests yet for regression protection.

### Mitigation and Next Sprint Steps
- Implement telemetry-backed `getCurrentState()` and validate `assessDamage(...)` end-to-end.
- Complete transfer-state transitions and delivery completion in `transferAsset(...)`.
- Add identity checks using Fabric client identity constraints for route edits and transfer actions.
- Add focused tests for success/failure transaction paths and include test evidence in next demo.
- Package repeatable demo command sequence and expected outputs into a single script/runbook.

---

## Rubric Coverage Quick Map
- Criterion 1 (Project Status Explanation): covered in Section 1 with concrete implemented, in-progress, and remaining work.
- Criterion 2 (Working Demonstration): covered in Section 2 with a live stakeholder workflow and bounded claims.
- Criterion 3 (Code Walkthrough, High-Level): covered in Section 3 with file/function interaction and ledger flow.
- Criterion 4 (Clarity, Timing, Professionalism): covered in Section 4 with a 5-minute speaking plan and delivery standards.