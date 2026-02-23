# The Resistance - Legacy Architecture (Battleship-Style MVP)

This document describes an early Battleship-style concept. The current design is in `GAME_DESIGN.md`.

## 🎯 Game Overview

**Theme:** An intergalactic war where rebel fleets battle against an alien empire. Each player commands a secret fleet hidden in the void of space. Using advanced stealth technology (ZK proofs), your fleet positions remain completely hidden until the war ends.

**Core Mechanics:** Classic Battleship reimagined as space warfare
- Two players deploy secret fleets on a 10x10 sector grid
- Players take turns firing weapons at enemy sectors
- ZK proofs verify hits without revealing fleet positions
- Winner destroys all enemy vessels first

---

## 📚 Understanding Zero-Knowledge Proofs (For Learning)

### What is a Zero-Knowledge Proof?

A ZK proof lets you prove something is true **without revealing HOW you know it's true**.

**Real-world analogy:**
- Imagine a cave with two paths (A and B) that connect in the middle via a locked door
- You claim you have the key that opens the door
- Without showing me the key, you prove it by:
  1. I wait outside while you enter either path
  2. I shout "come out path A!" or "come out path B!"
  3. If you have the key, you can always exit the correct path
  4. After 20 tries, I'm 99.9999% certain you have the key
  5. But I never saw the key!

**In The Resistance:**
- You prove "yes, you hit my cruiser at sector C5"
- Without revealing where your OTHER ships are
- The proof is mathematically verifiable on-chain

### ZK on Stellar (Protocol 25 / X-Ray)

Stellar added native BN254 cryptographic pairings in Protocol 25. This enables:
- **Groth16 proofs** - A ZK proof system using elliptic curve pairings
- **~450,000 constraints** - Enough for complex game logic
- **On-chain verification** - The Soroban contract verifies proofs directly

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        ZK PROOF PIPELINE                                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   1. CIRCUIT (Circom)          2. TRUSTED SETUP         3. KEYS         │
│   ┌─────────────────┐         ┌──────────────┐        ┌────────────┐    │
│   │ hit_check.circom│ ──────> │ Powers of Tau│ ────>  │ Proving Key│    │
│   │                 │         │ + Phase 2    │        │ Verify Key │    │
│   │ - ship positions│         └──────────────┘        └────────────┘    │
│   │ - target coord  │                                        │          │
│   │ - is_hit output │                                        v          │
│   └─────────────────┘                                 ┌────────────┐    │
│                                                       │ Soroban    │    │
│   4. PROOF GENERATION (Browser or Server)             │ Contract   │    │
│   ┌─────────────────┐                                 │ (Verifier) │    │
│   │ snarkjs/circom  │ ────────────────────────────>   └────────────┘    │
│   │ + witness data  │        proof + public signals                     │
│   └─────────────────┘                                                   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Key ZK Concepts

| Concept | Explanation | In The Resistance |
|---------|-------------|-------------------|
| **Circuit** | A mathematical representation of your computation | "Does shot at (x,y) hit any ship?" |
| **Witness** | Private inputs to the circuit | Your ship positions |
| **Public Inputs** | Values everyone can see | Shot coordinates, hit/miss result |
| **Proof** | Cryptographic blob proving correct execution | ~256 bytes sent to contract |
| **Verification Key** | Contract-embedded parameters | Used to verify proofs on-chain |

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           THE RESISTANCE ARCHITECTURE                       │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐              ┌─────────────────────────────────────────┐  │
│  │   BROWSER   │              │              STELLAR NETWORK             │  │
│  │   (React)   │              │                                         │  │
│  │             │  Stellar TX  │  ┌─────────────────┐                    │  │
│  │ - Fleet UI  │ ──────────────> │  The Resistance │ <──────┐           │  │
│  │ - ZK Prover │              │  │    Contract     │        │           │  │
│  │ - Wallet    │              │  │                 │        │           │  │
│  └─────────────┘              │  │ - start_game    │  ┌─────────────┐   │  │
│        │                      │  │ - fire_weapon   │  │  Game Hub   │   │  │
│        │                      │  │ - claim_victory │  │  Contract   │   │  │
│        v                      │  └────────┬────────┘  └─────────────┘   │  │
│  ┌─────────────┐              │           │                             │  │
│  │ ZK Circuit  │              │           v                             │  │
│  │ (hit_check) │              │  ┌─────────────────┐                    │  │
│  │             │              │  │  BN254 Pairing  │ (Native Stellar)   │  │
│  │ Circom/Noir │              │  │  Groth16 Verify │                    │  │
│  └─────────────┘              │  └─────────────────┘                    │  │
│                               │                                         │  │
│                               └─────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. Frontend (Browser)

**Technologies:**
- React + TypeScript
- Stellar SDK for wallet integration
- snarkjs for ZK proof generation (or WASM prover)
- IndexedDB for private fleet storage

**Responsibilities:**
- Fleet placement interface (drag-and-drop ships)
- Combat interface (fire at enemy sectors)
- ZK proof generation for hit verification
- Wallet connection + transaction signing

#### 2. ZK Circuit (Circom)

**Purpose:** Mathematically prove hit detection without revealing ship positions

**Circuit Inputs:**
```circom
// Private (witness) - NEVER leaves browser
signal private input ships[5][4];  // 5 ships, each with [x, y, length, vertical]

// Public - visible to everyone
signal input target_x;             // Shot x coordinate
signal input target_y;             // Shot y coordinate
signal input fleet_hash;           // Hash commitment from game start

// Output
signal output is_hit;              // 1 = hit, 0 = miss
signal output ship_index;          // Which ship was hit (-1 if miss)
```

#### 3. Soroban Contract (Rust)

**Purpose:** Game state management + ZK proof verification

**Key Functions:**
```rust
// Player creates game, commits fleet hash
fn start_game(session_id: u32, player1: Address, player2: Address,
              fleet_hash_p1: BytesN<32>, fleet_hash_p2: BytesN<32>,
              player1_points: i128, player2_points: i128);

// Player fires weapon + provides ZK proof of previous shot result
fn fire_weapon(session_id: u32, target_x: u8, target_y: u8,
               prev_shot_result_proof: Option<Bytes>);

// End game when all ships destroyed
fn claim_victory(session_id: u32, proof: Bytes);
```

#### 4. Game Hub Integration

**Purpose:** Session lifecycle + points/rewards management

```rust
// Called at game start
game_hub.start_game(&self_address, &session_id,
                    &player1, &player2,
                    &player1_points, &player2_points);

// Called when game ends
game_hub.end_game(&session_id, &player1_won);
```

---

## 🎮 Game Flow (Step-by-Step)

### Phase 1: Matchmaking

```
┌─────────┐                    ┌─────────────┐                    ┌─────────┐
│ Player1 │                    │  Contract   │                    │ Player2 │
└────┬────┘                    └──────┬──────┘                    └────┬────┘
     │                                │                                 │
     │  1. create_lobby(session_id)   │                                 │
     │ ──────────────────────────────>│                                 │
     │                                │                                 │
     │                                │    2. get_open_lobbies()        │
     │                                │<─────────────────────────────── │
     │                                │                                 │
     │                                │    3. join_lobby(session_id)    │
     │                                │<─────────────────────────────── │
     │                                │                                 │
```

### Phase 2: Fleet Deployment

```
┌─────────┐                    ┌─────────────┐                    ┌─────────┐
│ Player1 │                    │  Contract   │                    │ Player2 │
└────┬────┘                    └──────┬──────┘                    └────┬────┘
     │                                │                                 │
     │  [LOCAL] Place ships on grid   │    [LOCAL] Place ships on grid │
     │  ┌─────────────────────────┐   │    ┌─────────────────────────┐ │
     │  │ Ships stored in browser │   │    │ Ships stored in browser │ │
     │  │ NEVER sent to chain!    │   │    │ NEVER sent to chain!    │ │
     │  └─────────────────────────┘   │    └─────────────────────────┘ │
     │                                │                                 │
     │  4. commit_fleet(hash(ships))  │                                 │
     │ ──────────────────────────────>│                                 │
     │                                │    5. commit_fleet(hash(ships)) │
     │                                │<─────────────────────────────── │
     │                                │                                 │
     │                                │   Both committed! Game starts   │
     │                                │   call Game Hub start_game()    │
     │                                │                                 │
```

**Fleet Hash Calculation:**
```typescript
// In browser
const fleet = [
  { ship: "carrier", x: 0, y: 0, length: 5, vertical: false },
  { ship: "battleship", x: 2, y: 3, length: 4, vertical: true },
  // ... etc
];

// Poseidon2 hash (compatible with BN254 field)
const fleetHash = poseidon2Hash(encodeFleet(fleet));
// This hash is committed on-chain
```

### Phase 3: Combat (Turn-Based)

```
┌─────────┐                    ┌─────────────┐                    ┌─────────┐
│ Player1 │                    │  Contract   │                    │ Player2 │
└────┬────┘                    └──────┬──────┘                    └────┬────┘
     │                                │                                 │
     │  6. fire_weapon(x=5, y=3)      │                                 │
     │ ──────────────────────────────>│   Shot recorded on-chain        │
     │                                │                                 │
     │                                │                                 │
     │                                │    [LOCAL] Generate ZK proof:   │
     │                                │    "Shot at (5,3) is a MISS"    │
     │                                │                                 │
     │                                │   7. fire_weapon(x=2, y=1,      │
     │                                │      prev_proof=proof_of_miss)  │
     │                                │<─────────────────────────────── │
     │                                │                                 │
     │  Contract verifies P2's proof  │                                 │
     │  Updates game state            │                                 │
     │                                │                                 │
```

**The ZK Magic:**
- Player 2's browser generates a proof that P1's shot at (5,3) was a miss
- The proof is verified on-chain using BN254 pairings
- P1 learns their shot missed, but learns NOTHING about where P2's ships are!

### Phase 4: Victory

```
┌─────────┐                    ┌─────────────┐                    ┌─────────┐
│ Player1 │                    │  Contract   │                    │ Player2 │
└────┬────┘                    └──────┬──────┘                    └────┬────┘
     │                                │                                 │
     │  [All P2 ships destroyed]      │                                 │
     │                                │                                 │
     │  8. claim_victory(proof)       │                                 │
     │ ──────────────────────────────>│                                 │
     │                                │                                 │
     │  Contract verifies all ships   │                                 │
     │  are marked as destroyed       │                                 │
     │                                │                                 │
     │  Calls Game Hub end_game()     │                                 │
     │  P1 wins the points!           │                                 │
     │                                │                                 │
```

---

## 🔐 ZK Circuit Design

### Circuit: `hit_check.circom`

This is the core ZK circuit that proves hit/miss without revealing ship positions.

```circom
pragma circom 2.1.0;

include "poseidon.circom";   // For hashing
include "comparators.circom"; // For equality checks

template HitCheck(NUM_SHIPS, MAX_LENGTH) {
    // === PRIVATE INPUTS (witness) ===
    // Ship data: [x, y, length, vertical]
    signal input ships[NUM_SHIPS][4];

    // === PUBLIC INPUTS ===
    signal input target_x;
    signal input target_y;
    signal input expected_hash;  // Fleet commitment from game start

    // === OUTPUTS ===
    signal output is_hit;
    signal output computed_hash;

    // === STEP 1: Verify fleet hash ===
    // Ensures player can't change ships after committing
    component hasher = Poseidon(NUM_SHIPS * 4);
    for (var i = 0; i < NUM_SHIPS; i++) {
        for (var j = 0; j < 4; j++) {
            hasher.inputs[i * 4 + j] <== ships[i][j];
        }
    }
    computed_hash <== hasher.out;
    expected_hash === computed_hash;  // CONSTRAINT: hashes must match!

    // === STEP 2: Check if target hits any ship ===
    var hit = 0;
    for (var i = 0; i < NUM_SHIPS; i++) {
        var ship_x = ships[i][0];
        var ship_y = ships[i][1];
        var length = ships[i][2];
        var vertical = ships[i][3];

        // Check each cell of the ship
        for (var j = 0; j < MAX_LENGTH; j++) {
            if (j < length) {  // Only check valid cells
                var cell_x = vertical == 1 ? ship_x : ship_x + j;
                var cell_y = vertical == 1 ? ship_y + j : ship_y;

                if (cell_x == target_x && cell_y == target_y) {
                    hit = 1;
                }
            }
        }
    }

    is_hit <== hit;
}

component main {public [target_x, target_y, expected_hash]} = HitCheck(5, 5);
```

### Circuit Constraints Estimate

| Operation | Constraints |
|-----------|-------------|
| Poseidon hash (20 inputs) | ~3,000 |
| 5 ships × 5 cells × comparisons | ~2,500 |
| Range checks | ~500 |
| **Total** | **~6,000** |

This is well within Stellar's ~450,000 constraint limit!

### Verification Keys

After compiling the circuit and running trusted setup:

```rust
// Generated from `snarkjs zkey export verificationkey`
pub(crate) const VERIFICATION_KEYS: VerificationKeys = VerificationKeys {
    alpha: [...],  // G1 point
    beta: [...],   // G2 point
    gamma: [...],  // G2 point
    delta: [...],  // G2 point
    ic: &[...],    // G1 points for public inputs
};
```

---

## 📦 Contract Design (Soroban)

### Data Structures

```rust
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Game {
    pub player1: Address,
    pub player2: Address,
    pub fleet_hash_p1: BytesN<32>,      // Committed fleet hash
    pub fleet_hash_p2: BytesN<32>,
    pub player1_points: i128,
    pub player2_points: i128,
    pub current_turn: Address,           // Whose turn
    pub shots_p1: Vec<Shot>,             // P1's shots at P2
    pub shots_p2: Vec<Shot>,             // P2's shots at P1
    pub ships_sunk_p1: u8,               // How many of P1's ships are sunk
    pub ships_sunk_p2: u8,
    pub state: GameState,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Shot {
    pub x: u8,
    pub y: u8,
    pub result: ShotResult,              // Hit, Miss, or Pending
    pub proof_verified: bool,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum GameState {
    WaitingForPlayers = 0,
    FleetDeployment = 1,
    Player1Turn = 2,
    Player2Turn = 3,
    Player1Wins = 4,
    Player2Wins = 5,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum ShotResult {
    Pending = 0,     // Not yet verified
    Miss = 1,
    Hit = 2,
    Sunk = 3,        // Hit that sank a ship
}
```

### Contract Functions

```rust
#[contractimpl]
impl TheResistanceContract {
    /// Create a new game lobby
    pub fn create_lobby(
        env: Env,
        session_id: u32,
        player1: Address,
        player1_points: i128,
    ) -> Result<(), Error> {
        player1.require_auth_for_args(vec![&env,
            session_id.into_val(&env),
            player1_points.into_val(&env)
        ]);
        // Store pending game
        // ...
    }

    /// Join an existing lobby
    pub fn join_lobby(
        env: Env,
        session_id: u32,
        player2: Address,
        player2_points: i128,
    ) -> Result<(), Error>;

    /// Commit fleet hash after placing ships locally
    pub fn commit_fleet(
        env: Env,
        session_id: u32,
        player: Address,
        fleet_hash: BytesN<32>,
    ) -> Result<(), Error>;

    /// Fire a weapon at enemy sector
    /// Also submit proof for PREVIOUS shot result (opponent's shot at you)
    pub fn fire_weapon(
        env: Env,
        session_id: u32,
        target_x: u8,
        target_y: u8,
        prev_shot_proof: Option<Bytes>,  // ZK proof for opponent's last shot
    ) -> Result<(), Error> {
        // 1. Verify previous shot proof (if any)
        if let Some(proof) = prev_shot_proof {
            self.verify_shot_proof(&env, &proof)?;
        }

        // 2. Record new shot as "Pending"
        // 3. Switch turns
    }

    /// End the game and claim victory
    pub fn claim_victory(
        env: Env,
        session_id: u32,
        final_proof: Bytes,  // Proof that all opponent ships are sunk
    ) -> Result<Address, Error>;

    /// ZK proof verification using BN254 pairings
    fn verify_shot_proof(
        env: &Env,
        proof: &Bytes,
        public_inputs: &[U256],
    ) -> Result<bool, Error> {
        // Extract proof components
        let (raw_proof, inputs) = extract_proof(env, proof);

        // Use native BN254 pairing
        verify_groth16(env, &VERIFICATION_KEYS, &raw_proof, &inputs)
    }
}
```

---

## 🎨 Frontend Design

### Fleet Placement UI

```
┌────────────────────────────────────────────────────────────┐
│           THE RESISTANCE - FLEET DEPLOYMENT                │
├────────────────────────────────────────────────────────────┤
│                                                            │
│   YOUR SECTOR MAP          │    FLEET HANGAR              │
│   ┌─┬─┬─┬─┬─┬─┬─┬─┬─┬─┐   │                              │
│   │ │ │█│█│█│█│█│ │ │ │   │   ═════ Carrier (5)          │
│ 0 │ │ │ │ │ │ │ │ │ │ │   │   ════  Battleship (4)       │
│   ├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤   │   ═══   Cruiser (3)          │
│ 1 │ │ │ │ │ │ │ │ │ │ │   │   ═══   Submarine (3)        │
│   ├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤   │   ══    Destroyer (2)        │
│ 2 │ │ │ │█│ │ │ │ │ │ │   │                              │
│   ├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤   │   [Drag ships to place]      │
│ 3 │ │ │ │█│ │ │ │ │ │ │   │   [Right-click to rotate]    │
│   ├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤   │                              │
│ 4 │ │ │ │█│ │ │ │ │ │ │   │                              │
│   ├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤   │                              │
│ 5 │ │ │ │█│ │ │ │ │ │ │   │   ┌──────────────────────┐   │
│   ├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤   │   │   COMMIT FLEET       │   │
│ 6 │ │ │ │ │ │ │ │ │ │ │   │   │   (Submit hash to    │   │
│   ├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤   │   │    blockchain)       │   │
│ 7 │ │ │ │ │ │ │ │ │ │ │   │   └──────────────────────┘   │
│   └─┴─┴─┴─┴─┴─┴─┴─┴─┴─┘   │                              │
│     0 1 2 3 4 5 6 7 8 9   │                              │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Combat UI

```
┌────────────────────────────────────────────────────────────────────────────┐
│              THE RESISTANCE - BATTLE MODE                                   │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   YOUR FLEET                   │     ENEMY SPACE                           │
│   (Defense View)               │     (Attack View)                         │
│   ┌─┬─┬─┬─┬─┬─┬─┬─┬─┬─┐       │     ┌─┬─┬─┬─┬─┬─┬─┬─┬─┬─┐               │
│   │ │ │█│█│█│█│█│ │ │ │       │     │ │○│ │ │ │ │ │ │ │ │               │
│ 0 │ │ │ │ │ │ │ │ │ │ │       │   0 │ │ │ │ │ │ │ │ │ │ │               │
│   ├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤       │     ├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤               │
│ 1 │ │ │ │ │ │ │○│ │ │ │       │   1 │ │ │ │ │ │●│ │ │ │ │               │
│   ├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤       │     ├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤               │
│ 2 │ │ │ │█│ │ │ │ │ │ │       │   2 │ │ │ │ │ │●│ │ │ │ │               │
│   ├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤       │     ├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤               │
│ 3 │ │ │ │█│ │ │ │ │ │ │       │   3 │ │ │ │○│ │●│ │ │ │ │               │
│   └─┴─┴─┴─┴─┴─┴─┴─┴─┴─┘       │     └─┴─┴─┴─┴─┴─┴─┴─┴─┴─┘               │
│                                │                                            │
│   ○ = Enemy miss               │     ● = Your hit                          │
│   ● = Enemy hit                │     ○ = Your miss                         │
│   █ = Your ships               │     Click to fire!                        │
│                                │                                            │
│   Ships: ████░ (4/5)           │     Enemy Ships: ███░░ (3/5)              │
│                                │                                            │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │  STATUS: YOUR TURN - Select a sector to attack                      │  │
│   │  [Generating ZK proof for opponent's last shot...]                  │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

### Component Structure

```
src/
├── games/
│   └── the-resistance/
│       ├── TheResistanceGame.tsx      # Main game wrapper
│       ├── FleetPlacement.tsx         # Ship drag-and-drop
│       ├── CombatView.tsx             # Battle UI
│       ├── SectorGrid.tsx             # 10x10 grid component
│       ├── Ship.tsx                   # Draggable ship
│       ├── service.ts                 # Contract interactions
│       ├── bindings.ts                # Generated from contract
│       ├── zkProver.ts                # snarkjs integration
│       └── types.ts                   # Game types
├── hooks/
│   ├── useZkProver.ts                 # ZK proof generation hook
│   └── useGameState.ts                # Contract state polling
└── utils/
    ├── poseidon.ts                    # Poseidon2 hashing
    └── fleetEncoder.ts                # Ship position encoding
```

---

## 🔧 Implementation Phases

### Phase 1: Core Contract (Week 1)
**Goal:** Basic game lifecycle without ZK

1. ✅ Scaffold contract from template (DONE)
2. [ ] Implement `create_lobby` / `join_lobby`
3. [ ] Implement `commit_fleet` with hash storage
4. [ ] Implement `fire_weapon` (no proof verification yet)
5. [ ] Implement `claim_victory` (manual verification)
6. [ ] Game Hub integration

**Deliverable:** Two players can play through a full game with mock verification

### Phase 2: ZK Circuit (Week 1-2)
**Goal:** Working Circom circuit for hit detection

1. [ ] Set up Circom development environment
2. [ ] Implement `hit_check.circom` circuit
3. [ ] Run trusted setup (Powers of Tau)
4. [ ] Generate verification keys
5. [ ] Export keys as Rust constants
6. [ ] Test circuit with snarkjs

**Deliverable:** Circuit compiles, proof generation works locally

### Phase 3: On-Chain Verification (Week 2)
**Goal:** Contract verifies ZK proofs

1. [ ] Integrate BN254 pairing verification
2. [ ] Add verification keys to contract
3. [ ] Implement `verify_shot_proof`
4. [ ] Test full proof pipeline
5. [ ] Deploy updated contract

**Deliverable:** Contract rejects invalid proofs, accepts valid ones

### Phase 4: Frontend (Week 2-3)
**Goal:** Complete game UI

1. [ ] Fleet placement with drag-and-drop
2. [ ] Combat view with grid interactions
3. [ ] Wallet integration (Freighter)
4. [ ] ZK proof generation in browser (snarkjs WASM)
5. [ ] Game state polling + UI updates
6. [ ] Victory/defeat screens

**Deliverable:** Full playable game in browser

### Phase 5: Polish & Demo (Week 3)
**Goal:** Hackathon-ready submission

1. [ ] Video demo recording
2. [ ] README + documentation
3. [ ] UI polish + animations
4. [ ] Error handling + edge cases
5. [ ] Testing with multiple players

---

## 📚 Learning Resources

### Zero-Knowledge Proofs

1. **Circom Documentation**: https://docs.circom.io/
2. **ZK Learning by 0xPARC**: https://learn.0xparc.org/
3. **snarkjs Library**: https://github.com/iden3/snarkjs
4. **Poseidon Hash**: https://www.poseidon-hash.info/

### Stellar / Soroban

1. **Soroban Docs**: https://developers.stellar.org/docs/build/guides
2. **BN254 on Stellar**: https://developers.stellar.org/docs/build/guides/misc/bn254
3. **Stellar SDK**: https://stellar.github.io/js-stellar-sdk/

### Reference Implementations

1. **X-Ray Games (ZK on Stellar)**: `reference/xray-games/`
   - `contracts/slicer/src/circuit.rs` - Verification keys
   - `contracts/common/src/zk.rs` - Groth16 verification

2. **Midnight Sea Battle (Game Logic)**: `reference/midnight-seabattle/`
   - `battleship-contract-commons/GameCommons.compact` - Ship types
   - `battleship-ui/src/` - React UI patterns

3. **TypeZERO (RiscZero approach)**: `reference/typezero/`
   - Alternative ZK system (heavier but more flexible)

---

## ❓ FAQ

### Q: Why not just use commit-reveal without ZK?

Without ZK, you'd have to reveal all ship positions at game end. This means:
- A player losing badly could refuse to reveal (griefing)
- Ships are exposed after every game
- No mathematical guarantee of honest play

With ZK:
- Each shot result is proven immediately
- Ships stay secret forever
- Cheating is mathematically impossible

### Q: Isn't ZK proof generation slow?

Modern circuits with ~10k constraints generate proofs in ~1 second in browser. Our circuit is ~6k constraints, so it's quite fast. The tradeoff is worth it for trustless gameplay.

### Q: What happens if a player disconnects?

The contract can implement timeout logic:
- If it's your turn and you don't move within X minutes, you forfeit
- Game Hub handles the point transfer

### Q: Can the circuit be cheated?

The circuit is deterministic and verified on-chain. The only way to cheat would be:
1. Find a vulnerability in the circuit logic (we'll audit it)
2. Break BN254 elliptic curve cryptography (computationally impossible)
3. Compromise the trusted setup (we'll use existing ceremony)

---

## 🚀 Next Steps

1. **Read the X-Ray Games ZK implementation**
   - Understand how `verify_groth16` works
   - Study the verification key format

2. **Set up Circom development**
   ```bash
   npm install -g circom
   npm install -g snarkjs
   ```

3. **Start implementing Phase 1**
   - Modify `contracts/the-resistance/src/lib.rs`
   - Replace number-guess logic with battleship state machine

Would you like to start with any specific phase?
