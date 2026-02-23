#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTAINER_NAME="${STELLAR_CONTAINER_NAME:-the-resistance-local}"
NETWORK_NAME="${STELLAR_NETWORK_NAME:-local}"
RPC_URL="${STELLAR_RPC_URL:-http://localhost:8000/soroban/rpc}"
NETWORK_PASSPHRASE="${STELLAR_NETWORK_PASSPHRASE:-Standalone Network ; February 2017}"
P1_NAME="${STELLAR_PLAYER1_NAME:-tr_p1}"
P2_NAME="${STELLAR_PLAYER2_NAME:-tr_p2}"

GAME_HUB_CONTRACT_ID=""
RESISTANCE_CONTRACT_ID=""

fund_account() {
  local key_name="$1"
  local network_name="$2"
  local addr
  addr="$(stellar keys address "$key_name" | tail -n1 | tr -d '[:space:]')"

  # Try native CLI funding first.
  if stellar keys fund "$key_name" --network "$network_name" >/dev/null 2>&1; then
    return 0
  fi

  # Fallback: call local friendbot directly with retries.
  for attempt in $(seq 1 20); do
    if curl -sf "http://localhost:8000/friendbot?addr=${addr}" >/dev/null; then
      return 0
    fi
    sleep 1
  done

  echo "ERROR: failed to fund ${key_name} (${addr})"
  return 1
}

cleanup() {
  # Keep container running for demo unless STOP_LOCALNET_ON_EXIT=1.
  if [[ "${STOP_LOCALNET_ON_EXIT:-0}" == "1" ]]; then
    stellar container stop "$CONTAINER_NAME" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

echo "==> 1) Start local quickstart with unlimited Soroban limits"
START_OUTPUT="$(stellar container start -t future --name "$CONTAINER_NAME" --limits unlimited 2>&1 || true)"
if [[ "$START_OUTPUT" == *"already running"* ]]; then
  echo "    Local container already running"
elif [[ "$START_OUTPUT" == *"Started container"* ]]; then
  :
elif [[ -n "$START_OUTPUT" ]]; then
  echo "$START_OUTPUT"
  exit 1
fi

echo "==> 2) Configure local network profile"
stellar network remove "$NETWORK_NAME" >/dev/null 2>&1 || true
stellar network add "$NETWORK_NAME" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE" >/dev/null
stellar network use "$NETWORK_NAME" >/dev/null

echo "==> 3) Wait for network health"
for i in $(seq 1 60); do
  if stellar network health --network "$NETWORK_NAME" --output json 2>/dev/null | grep -q '"status":"healthy"'; then
    break
  fi
  sleep 2
done

echo "==> 4) Prepare local accounts"
stellar keys generate --global "$P1_NAME" >/dev/null 2>&1 || true
stellar keys generate --global "$P2_NAME" >/dev/null 2>&1 || true
fund_account "$P1_NAME" "$NETWORK_NAME"
fund_account "$P2_NAME" "$NETWORK_NAME"

P1_ADDRESS="$(stellar keys address "$P1_NAME" | tail -n1 | tr -d '[:space:]')"
P2_ADDRESS="$(stellar keys address "$P2_NAME" | tail -n1 | tr -d '[:space:]')"
P1_SECRET="$(stellar keys secret "$P1_NAME" | tail -n1 | tr -d '[:space:]')"
P2_SECRET="$(stellar keys secret "$P2_NAME" | tail -n1 | tr -d '[:space:]')"

echo "    Player1: $P1_ADDRESS"
echo "    Player2: $P2_ADDRESS"

echo "==> 5) Verify pinned toolchain (required by verifier format)"
NARGO_VERSION="$(nargo --version | head -n1)"
BB_VERSION="$(bb --version | head -n1)"
echo "    $NARGO_VERSION"
echo "    $BB_VERSION"
if [[ "$NARGO_VERSION" != *"1.0.0-beta.9"* ]]; then
  echo "ERROR: nargo must be 1.0.0-beta.9 for this flow."
  exit 1
fi
if [[ "$BB_VERSION" != "v0.87.0" ]]; then
  echo "ERROR: bb must be v0.87.0 for this flow."
  exit 1
fi

echo "==> 6) Rebuild circuit artifacts (proof/vk/public_inputs)"
cd "$ROOT_DIR/circuits"
rm -rf target
nargo compile
nargo execute
bb prove \
  -b target/circuits.json \
  -w target/circuits.gz \
  -o target \
  --scheme ultra_honk \
  --oracle_hash keccak \
  --output_format bytes_and_fields
bb write_vk \
  -b target/circuits.json \
  -o target \
  --scheme ultra_honk \
  --oracle_hash keccak \
  --output_format bytes_and_fields
echo "    proof bytes: $(wc -c < target/proof)"
echo "    vk bytes:    $(wc -c < target/vk)"

echo "==> 7) Sync frontend circuit artifact"
cp "$ROOT_DIR/circuits/target/circuits.json" "$ROOT_DIR/the-resistance-frontend/public/circuits.json"

echo "==> 8) Build contracts"
cd "$ROOT_DIR"
bun run build mock-game-hub the-resistance >/dev/null

echo "==> 9) Deploy local mock game hub"
GAME_HUB_CONTRACT_ID="$(
  stellar contract deploy \
    --wasm "$ROOT_DIR/target/wasm32v1-none/release/mock_game_hub.wasm" \
    --source "$P1_NAME" \
    --network "$NETWORK_NAME" \
    | tail -n1 | tr -d '[:space:]'
)"
echo "    GameHub: $GAME_HUB_CONTRACT_ID"

echo "==> 10) Deploy The Resistance with current VK"
RESISTANCE_CONTRACT_ID="$(
  stellar contract deploy \
    --wasm "$ROOT_DIR/target/wasm32v1-none/release/the_resistance.wasm" \
    --source "$P1_NAME" \
    --network "$NETWORK_NAME" \
    -- \
    --admin "$P1_ADDRESS" \
    --game_hub "$GAME_HUB_CONTRACT_ID" \
    --vk_bytes-file-path "$ROOT_DIR/circuits/target/vk" \
    | tail -n1 | tr -d '[:space:]'
)"
echo "    TheResistance: $RESISTANCE_CONTRACT_ID"

echo "==> 11) Run full E2E proof action locally"
cd "$ROOT_DIR/the-resistance-frontend"
E2E_CONTRACT_ID="$RESISTANCE_CONTRACT_ID" \
E2E_PLAYER1_SECRET="$P1_SECRET" \
E2E_PLAYER2_SECRET="$P2_SECRET" \
E2E_RPC_URL="$RPC_URL" \
E2E_NETWORK_PASSPHRASE="$NETWORK_PASSPHRASE" \
bun run scripts/e2e-onchain-proof-check.ts

echo "==> 12) Write frontend local env file"
cat > "$ROOT_DIR/the-resistance-frontend/.env.local" <<EOF
VITE_SOROBAN_RPC_URL=$RPC_URL
VITE_NETWORK_PASSPHRASE=$NETWORK_PASSPHRASE
VITE_THE_RESISTANCE_CONTRACT_ID=$RESISTANCE_CONTRACT_ID
VITE_MOCK_GAME_HUB_CONTRACT_ID=$GAME_HUB_CONTRACT_ID
VITE_DEV_PLAYER1_SECRET=$P1_SECRET
VITE_DEV_PLAYER2_SECRET=$P2_SECRET
VITE_DEV_PLAYER1_ADDRESS=$P1_ADDRESS
VITE_DEV_PLAYER2_ADDRESS=$P2_ADDRESS
EOF
echo "    wrote the-resistance-frontend/.env.local"

echo "==> 13) Write frontend runtime config override"
cat > "$ROOT_DIR/the-resistance-frontend/public/game-studio-config.js" <<EOF
window.__STELLAR_GAME_STUDIO_CONFIG__ = {
  rpcUrl: "$RPC_URL",
  networkPassphrase: "$NETWORK_PASSPHRASE",
  contractIds: {
    "the-resistance": "$RESISTANCE_CONTRACT_ID",
    "mock-game-hub": "$GAME_HUB_CONTRACT_ID"
  }
};
EOF
echo "    wrote the-resistance-frontend/public/game-studio-config.js"

echo "====================================================="
echo "PASS: local unlimited E2E completed"
echo "Contract: $RESISTANCE_CONTRACT_ID"
echo "GameHub:  $GAME_HUB_CONTRACT_ID"
echo "====================================================="
