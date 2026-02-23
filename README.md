# The Resistance

A two‑player, ZK‑powered, 3D galactic strategy game on Stellar. Players secretly place bases, then use verifiable scans to hunt the opponent without revealing hidden positions. Zero‑knowledge proofs guarantee fairness while preserving strategic secrecy.

This repo also contains the **Stellar Game Studio** tooling used to scaffold and deploy Soroban game contracts and frontends.

## Why This Exists
- Prove that **privacy‑preserving multiplayer** can feel like a real game, not a crypto demo.
- Show how **ZK + Soroban** can power competitive gameplay without trusting a server.
- Provide a repeatable path to ship future games using the same patterns.

## What You Get
- A Soroban contract enforcing game rules + ZK verification
- Circuits and tooling for proof generation
- A 3D frontend built with React Three Fiber
- Deployment + bindings automation

## Quick Start (Dev)
```bash
bun install
bun run setup
bun run dev:game the-resistance
```

## Project Structure
```
├── contracts/               # Soroban contracts for games + mock Game Hub
├── circuits/                # Noir/ZK circuits and artifacts
├── the-resistance-frontend/ # Standalone game frontend
├── sgs_frontend/            # Studio catalog frontend and docs source
├── scripts/                 # Build & deployment automation
└── bindings/                # Generated TypeScript bindings
```

## Key Constraints
- Every game must call `start_game` and `end_game` on Game Hub.
- Keep randomness deterministic between simulation and submission.
- Prefer temporary storage with a 30‑day TTL for game state.

## Commands
```bash
bun run setup                         # Build + deploy testnet contracts, generate bindings
bun run build [game-name]             # Build all or selected contracts
bun run deploy [game-name]            # Deploy all or selected contracts to testnet
bun run bindings [game-name]          # Generate bindings for all or selected contracts
bun run dev:game the-resistance       # Run the standalone frontend with dev wallet switching
bun run publish the-resistance --build # Export + build production frontend
```

## License
MIT License. See `LICENSE`.
