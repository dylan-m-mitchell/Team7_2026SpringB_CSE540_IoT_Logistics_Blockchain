#!/usr/bin/env bash
# Walks the README example flow against a running backend.
#
# Usage:
#   npm run demo                      # uses default API_URL from .env / http://localhost:3000
#   API_URL=http://host:3000 npm run demo
#
# Pre-reqs: server is running, Fabric test-network is up, chaincode is deployed.
# The script is intentionally simple: it shells out to `tt`, prints output,
# and verifies the final asset has the fields we set.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TT="node $SERVER_DIR/dist/cli/bin.js"

API_URL="${API_URL:-http://localhost:3000}"
ASSET_ID="demo_$(date +%s)"

step() {
    echo
    echo "=== $* ==="
}

run() {
    echo "\$ $*"
    eval "$@"
}

require_field() {
    local label="$1"
    local needle="$2"
    local haystack="$3"
    if ! grep -q "$needle" <<<"$haystack"; then
        echo "FAIL: expected $label ($needle) in last asset get output" >&2
        exit 1
    fi
    echo "ok: $label present"
}

if [[ ! -f "$SERVER_DIR/dist/cli/bin.js" ]]; then
    echo "Build first: (cd $SERVER_DIR && npm run build)" >&2
    exit 1
fi

step "health"
run "$TT --api-url $API_URL --json health"

step "create $ASSET_ID"
run "$TT --api-url $API_URL asset create $ASSET_ID"

step "exists"
run "$TT --api-url $API_URL asset exists $ASSET_ID"

step "set tolerances"
run "$TT --api-url $API_URL asset tolerances $ASSET_ID --temp-min 20 --temp-max 80 --humidity-min 13 --humidity-max 65 --shock-max 10"

step "record telemetry"
run "$TT --api-url $API_URL telemetry record $ASSET_ID --temp 25 --humidity 40 --shock 0.5"

step "telemetry list"
run "$TT --api-url $API_URL telemetry list $ASSET_ID --limit 5"

step "audit (filtered to this asset)"
run "$TT --api-url $API_URL audit --limit 20 --asset $ASSET_ID"

step "final asset get"
FINAL=$(node "$SERVER_DIR/dist/cli/bin.js" --api-url "$API_URL" --json asset get "$ASSET_ID")
echo "$FINAL"

require_field "assetId"          "\"assetId\":\"$ASSET_ID\""        "$FINAL"
require_field "tempMin tolerance" '"tempMin":20'                    "$FINAL"
require_field "humidityMax"       '"humidityMax":65'                "$FINAL"

echo
echo "demo flow OK for $ASSET_ID"
