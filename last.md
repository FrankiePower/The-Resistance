# Final Run Log (The Resistance)

This file tracks successful recovery/build steps so we can move fast and keep one source of truth.

## 2026-02-23 - Success #1: Fresh Noir + Circuit Regeneration

- Goal: Upgrade to latest Noir toolchain and regenerate circuit artifacts from scratch.
- Status: `SUCCESS`

### Toolchain
- `nargo`: `1.0.0-beta.18`
- `noirc`: `1.0.0-beta.18+99bb8b5cf33d7669adbdef096b12d80f30b4c0c9`
- `bb`: `3.0.0-nightly.20260102`

### Steps executed
1. `noirup` (latest stable install)
2. `cd circuits && rm -rf target && mkdir -p target`
3. `cd circuits && nargo compile && nargo execute`
4. `cd circuits && bb write_vk -b target/circuits.json -o target --scheme ultra_honk --oracle_hash keccak`
5. `cd circuits && bb prove -b target/circuits.json -w target/circuits.gz -o target -k target/vk --scheme ultra_honk --oracle_hash keccak`
6. `cd circuits && nargo test`
7. `cp circuits/target/circuits.json the-resistance-frontend/public/circuits.json`

### Fresh artifacts
- `circuits/target/circuits.json`: `53642` bytes
- `circuits/target/circuits.gz`: `4050` bytes
- `circuits/target/vk`: `1888` bytes
- `circuits/target/proof`: `7872` bytes
- `circuits/target/public_inputs`: `800` bytes

### Validation
- Circuit tests: `8 tests passed`
- Frontend circuit sync: complete (`the-resistance-frontend/public/circuits.json` hash matched)

## 2026-02-23 - Success #2: Barretenberg Prove + Verify Flow

- Goal: Run the exact Barretenberg quickstart flow (`prove --write_vk`, then `verify`).
- Status: `SUCCESS`

### Commands executed
1. `cd circuits && bb prove -b ./target/circuits.json -w ./target/circuits.gz --write_vk -o target`
2. `cd circuits && bb verify -p ./target/proof -k ./target/vk`

### Result
- `bb prove`: completed, wrote `proof`, `public_inputs`, `vk`, `vk_hash`
- `bb verify`: `Proof verified successfully`

---

## Beginner Notes: What We Actually Built and What Each Command Does

Yes, you wrote your own circuit: `circuits/src/main.nr`.

That circuit defines your game rule proof:
- private input: player's secret bases
- public inputs: commitment hash + action params
- public output: result count

### Core flow (simple mental model)
1. **Compile circuit** (`nargo compile`)
   - Turns Noir source into machine-readable circuit constraints.
   - Output: `circuits/target/circuits.json`

2. **Execute circuit** (`nargo execute`)
   - Runs the circuit with your sample inputs from `Prover.toml`.
   - Produces a solved witness (all internal values).
   - Output: `circuits/target/circuits.gz`

3. **Generate verification key** (`bb write_vk ...`)
   - Produces verifier metadata for this exact circuit.
   - Output: `circuits/target/vk` (+ `vk_hash`)
   - This is what your contract stores (or uses) to verify proofs.

4. **Generate proof** (`bb prove ...`)
   - Uses compiled circuit + witness (+ vk) to create ZK proof.
   - Output: `circuits/target/proof` and `circuits/target/public_inputs`

5. **Verify proof locally** (`bb verify ...`)
   - Checks proof correctness against the vk.
   - If this passes, proof/vk pair is cryptographically valid locally.

### Why we copied `circuits.json` to frontend
- `the-resistance-frontend/public/circuits.json` is loaded by your UI prover code.
- If frontend circuit and backend artifacts drift, proofs can fail unexpectedly.
- Keeping this file synced means frontend proof generation matches the latest circuit.

### In one sentence
- `nargo` builds/runs your circuit, and `bb` proves/verifies it using that circuit.
