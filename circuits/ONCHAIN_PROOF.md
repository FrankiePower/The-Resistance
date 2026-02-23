# THE RESISTANCE - On-Chain ZK Proof System

## Verified On-Chain Transaction

**Transaction Hash:** `0fc44223b3ad00489fb44e7dcec5ed43edfc4ca30f3d08a6331d477c5f7f4793`

**Status:** ✅ SUCCESS

**View on Stellar Expert:**
https://stellar.expert/explorer/testnet/tx/0fc44223b3ad00489fb44e7dcec5ed43edfc4ca30f3d08a6331d477c5f7f4793

---

## Contract Details

| Field | Value |
|-------|-------|
| Contract ID | `CALYJGFGE3PX47SUP4J7WLZZKJJKEAOYNVWNEEBDLQCG6GZQOSJG4BSJ` |
| Network | Stellar Testnet |
| Admin | `GBL4FMN3MPLPA2IS7T2K5VAGGVT4WJWJ24YXYFAHIFOGGCVEM6WVVAQA` |
| GameHub | `CB4VZAT2U3UC6XFK3N23SKRF2NDCMP3QHJYMCHHFMZO7MRQO6DQ2EMYG` |

---

## ZK System Verification

### 1. Circuit Compilation ✅
- **Circuit:** Noir (UltraHonk)
- **Compiled with:** nargo 1.0.0-beta.18

### 2. Poseidon2 Commitments ✅
- **Hash Function:** Poseidon2 (via Barretenberg)
- **Commitment Size:** 32 bytes
- **Example:** `0x24e1141d650cfd6d9ff5a089bb59a99e...`

### 3. ZK Proof Generation ✅
- **Backend:** UltraHonk (bb.js 2.1.11)
- **Proof Size:** 16,256 bytes (matches PROOF_BYTES constant)
- **Public Inputs:** 25 fields

### 4. Actions Supported

| Action | Description | Proof Output |
|--------|-------------|--------------|
| Solar Scan | Precision strike on single star | 0 (MISS) or 1 (HIT) |
| Deep Radar | Count bases in radius | 0-10 signatures |
| Arm Strike | Destroy entire spiral arm (20 stars) | 0-10 bases destroyed |

### 5. On-Chain Verification ✅
- **Verifier:** ultrahonk_soroban_verifier
- **VK Size:** 3,680 bytes (embedded at deployment)
- **Verification:** via `execute_action()` function

---

## Test Results

```
═══════════════════════════════════════════════════════════════════
 Solar Scan: Target Star #50 → HIT (16,256 byte proof)
 Deep Radar: Target Star #68 → 1 signature detected (16,256 byte proof)
 Arm Strike: Target Arm #2  → 1 base destroyed (16,256 byte proof)
═══════════════════════════════════════════════════════════════════
```

---

## How to Run Tests

```bash
# Verify ZK flow (proof generation + contract connection)
cd circuits && node verify_zk_flow.mjs

# Query contract state
stellar contract invoke --id CALYJGFGE3PX47SUP4J7WLZZKJJKEAOYNVWNEEBDLQCG6GZQOSJG4BSJ \
  --source-account <your-secret> --network testnet -- get_admin
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        THE RESISTANCE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│   │   Player    │    │  Noir/ZK    │    │  Soroban    │        │
│   │   Client    │───▶│  Circuits   │───▶│  Contract   │        │
│   └─────────────┘    └─────────────┘    └─────────────┘        │
│         │                   │                   │               │
│         │                   │                   │               │
│   ┌─────▼─────┐    ┌───────▼──────┐    ┌───────▼──────┐        │
│   │ Poseidon2 │    │  UltraHonk   │    │   On-Chain   │        │
│   │   Hash    │    │    Prover    │    │   Verifier   │        │
│   │ (bb.js)   │    │   (bb.js)    │    │ (ultrahonk)  │        │
│   └───────────┘    └──────────────┘    └──────────────┘        │
│                                                                 │
│   200 Stars • 10 Arms • 10 Bases per Player • First to 10 Wins │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Links

- **Contract on Stellar Expert:** https://stellar.expert/explorer/testnet/contract/CALYJGFGE3PX47SUP4J7WLZZKJJKEAOYNVWNEEBDLQCG6GZQOSJG4BSJ
- **Transaction Proof:** https://stellar.expert/explorer/testnet/tx/0fc44223b3ad00489fb44e7dcec5ed43edfc4ca30f3d08a6331d477c5f7f4793
