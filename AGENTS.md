# AGENTS.md

This repo is **The Resistance**, built on Stellar Game Studio patterns. Use this guide to navigate the repo and follow the expected Soroban + frontend conventions.

**Repo Map**
- `contracts/` Soroban game contracts + `mock-game-hub`
- `contracts/number-guess/`, `contracts/twenty-one/`, `contracts/dice-duel/` reference implementations
- `bindings/` generated TypeScript bindings (do not hand-edit)
- `scripts/` Bun scripts for build/deploy/bindings/dev flows
- `the-resistance-frontend/` standalone game frontend
- `sgs_frontend/` studio catalog frontend and docs source
- `deployment.json` deployment metadata

**Golden Rules**
- Every game must call Game Hub `start_game` and `end_game`.
- Keep randomness deterministic between simulation and submission. Do not use ledger time or sequence.
- Prefer temporary storage with a 30-day TTL for game state and extend TTL on every state write.
- Game Hub is the single source of truth for lifecycle events. Avoid duplicate start/end events in games.
- Exactly two players per session. Reject self-play where appropriate.

**Contract Checklist (Soroban)**
1. Implement the required Game Hub client interface:
```rust
#[contractclient(name = "GameHubClient")]
pub trait GameHub {
    fn start_game(
        env: Env,
        game_id: Address,
        session_id: u32,
        player1: Address,
        player2: Address,
        player1_points: i128,
        player2_points: i128,
    );

    fn end_game(env: Env, session_id: u32, player1_won: bool);
}
```
2. Implement `__constructor(env, admin, game_hub)` and store `Admin` + `GameHubAddress` in instance storage.
3. In `start_game`, call `player1.require_auth_for_args(...)` and `player2.require_auth_for_args(...)` for points.
4. Call `game_hub.start_game(&env.current_contract_address(), ...)` before storing the game.
5. Store game state in temporary storage and `extend_ttl` to 30 days on every write.
6. In the game-end path, call `game_hub.end_game(...)` before finalizing the winner state.
7. Use `Error` enums for game errors and keep `get_game` available for UI state reads.

**Deterministic Randomness**
- Use `env.prng()` with a seed derived from inputs like `session_id`, player addresses, or committed data.
- Example pattern in `contracts/dice-duel/src/lib.rs` uses `env.crypto().keccak256` to derive seeds.
- Never use ledger time or sequence for randomness.

**Testing**
- Add unit tests in `contracts/<game-name>/src/test.rs`.
- Use the mock Game Hub pattern from `contracts/number-guess/src/test.rs` or `contracts/mock-game-hub`.
- Tests should cover start, play progression, and end-game reporting.

**Bindings**
- Build and generate bindings via scripts when interfaces change:
```bash
bun run build <game-name>
bun run bindings <game-name>
```
- Copy generated `bindings/<game_name>/src/index.ts` into the game frontend `bindings.ts`.
- Do not edit generated bindings by hand.

**Frontend Checklist (Standalone)**
1. Update UI + service files in `the-resistance-frontend/src/games/the-resistance/`.
2. Replace `the-resistance-frontend/src/games/the-resistance/bindings.ts` with generated bindings.
3. Set the contract ID in `the-resistance-frontend/public/game-studio-config.js`.
4. Run `bun run dev:game the-resistance` or `cd the-resistance-frontend && bun run dev`.

**Common Commands**
```bash
bun run setup                         # Build + deploy testnet contracts, generate bindings, write .env
bun run build [contract-name...]      # Build all or selected contracts
bun run deploy [contract-name...]     # Deploy all or selected contracts to testnet
bun run bindings [contract-name...]   # Generate bindings for all or selected contracts
bun run dev:game the-resistance       # Run the standalone frontend with dev wallet switching
bun run publish the-resistance --build # Export + build production frontend
```

**Final QA Checklist**
- Contract builds successfully.
- `start_game` and `end_game` are called in the correct order.
- Game state uses temporary storage with a 30-day TTL.
- Bindings regenerated after contract changes.
- Standalone frontend uses the correct contract ID.
- Both players can complete a full game flow.
