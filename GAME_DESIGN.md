# THE RESISTANCE:

## Game Overview

A ZK-powered galactic exploration game where two players secretly establish bases across a 3D galaxy and race to find and destroy each other's bases using limited-range scans.

**Core Innovation:** Zero-Knowledge proofs verify scan results without revealing other base locations.

**Visual Innovation:** 3D galaxy visualization using React Three Fiber.

---

## Core Mechanics

### Setup Phase

1. **Galaxy Generation**
   - 200 stars in spiral arm pattern
   - ~20 special stars with abilities (visible to both players)
   - Generated deterministically from session seed

2. **Base Placement (Secret)**
   - Each player selects 5 stars as their bases
   - Bases are committed as Poseidon2 hash on-chain
   - Actual positions NEVER leave the player's browser

3. **Command Ship Deployment (Public)**
   - Each player places their command ship on any star
   - Position is PUBLIC - opponent can see it
   - Defines the center of your scan range

### Combat Phase

**Turn Structure - Choose ONE action:**

| Action | Effect |
|--------|--------|
| **MOVE** | Move command ship up to distance 20 |
| **SCAN** | Scan any star within range 30 of command ship |

**Scan Resolution:**
1. You submit: target star ID
2. Opponent generates ZK proof: "Star X is/isn't my base"
3. Contract verifies proof on-chain
4. Result revealed: Empty, Enemy Base Found, or Special Star

**When Base Found:**
- Base is marked as destroyed
- First to destroy 3 of opponent's 5 bases wins

---

## Special Star Abilities

| Star Type | Icon | Effect When Scanned |
|-----------|------|---------------------|
| **Relay Station** | ⚡ | +10 scan range for 3 turns |
| **Defense Grid** | 🛡️ | Your bases within range 15 require 2 scans to destroy |
| **Warp Gate** | 🌀 | Can instantly teleport command ship here next turn |
| **Resource Node** | 💎 | +1 extra scan per turn for rest of game |

Special stars are visible during setup - strategic base placement near them matters!

---

## Victory Conditions

- **Win:** Destroy 3 of opponent's 5 bases
- **Forfeit:** Player can forfeit (opponent wins)
- **Timeout:** If turn timer expires, player forfeits

---

## ZK Proof System

### What Gets Proven

```
STATEMENT: "Given my committed bases, star X is [not] one of them"

PRIVATE (witness):
  - bases[5]: actual star IDs of your bases

PUBLIC (verified on-chain):
  - bases_hash: Poseidon2 commitment from game start
  - target_star: star being scanned
  - is_base: result (0 or 1)
```

### Why ZK is Essential

Without ZK:
- Opponent claims "that's not my base" - but might be lying
- Server could reveal base locations - requires trust

With ZK:
- Mathematical proof that result is honest
- Contract verifies using BN254 pairings on Stellar
- Even contract can't learn base positions

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ARCHITECTURE                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  FRONTEND (Next.js + React Three Fiber)                                 │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ • 3D Galaxy visualization (existing code)                        │    │
│  │ • Game HUD (intel panel, action buttons, battle log)            │    │
│  │ • Wallet integration (Freighter)                                 │    │
│  │ • ZK proof generation (snarkjs WASM)                            │    │
│  │ • Local storage for secret base positions                       │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                              │                                           │
│                              ▼                                           │
│  STELLAR NETWORK                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ THE RESISTANCE CONTRACT (Soroban)                                │    │
│  │ ┌─────────────────────────────────────────────────────────────┐ │    │
│  │ │ • create_lobby / join_lobby                                  │ │    │
│  │ │ • commit_bases (stores hash)                                 │ │    │
│  │ │ • deploy_command_ship (public position)                      │ │    │
│  │ │ • move_ship / scan_star                                      │ │    │
│  │ │ • verify_scan_proof (BN254 Groth16)                         │ │    │
│  │ │ • claim_victory                                              │ │    │
│  │ └─────────────────────────────────────────────────────────────┘ │    │
│  │                              │                                   │    │
│  │                              ▼                                   │    │
│  │ GAME HUB CONTRACT                                                │    │
│  │ ┌─────────────────────────────────────────────────────────────┐ │    │
│  │ │ • start_game (locks points)                                  │ │    │
│  │ │ • end_game (transfers points to winner)                      │ │    │
│  │ └─────────────────────────────────────────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ZK CIRCUIT (Circom)                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ • base_check.circom - proves base membership                    │    │
│  │ • Compiled to WASM for browser proving                          │    │
│  │ • Verification key embedded in contract                         │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Game State

```rust
pub struct Game {
    // Players
    pub player1: Address,
    pub player2: Option<Address>,
    pub player1_points: i128,
    pub player2_points: i128,

    // Secret base commitments
    pub bases_hash_p1: Option<BytesN<32>>,
    pub bases_hash_p2: Option<BytesN<32>>,

    // Public command ship positions
    pub command_ship_p1: Option<u32>,  // Star ID
    pub command_ship_p2: Option<u32>,

    // Game state
    pub state: GameState,
    pub current_turn: Option<Address>,

    // Scan results (verified on-chain)
    pub scans_p1: Vec<ScanResult>,  // P1's scans of P2's space
    pub scans_p2: Vec<ScanResult>,

    // Destruction count
    pub bases_destroyed_p1: u8,  // How many of P1's bases destroyed
    pub bases_destroyed_p2: u8,

    // Buffs from special stars
    pub buffs_p1: Vec<Buff>,
    pub buffs_p2: Vec<Buff>,

    // Timestamps
    pub created_at: u64,
    pub turn_started_at: u64,
}

pub struct ScanResult {
    pub star_id: u32,
    pub result: ScanOutcome,  // Empty, BaseFound, BaseDestroyed, SpecialStar
    pub proof_verified: bool,
}

pub enum Buff {
    RelayStation { expires_turn: u32 },  // +10 range
    DefenseGrid { center_star: u32 },    // Bases need 2 hits
    WarpGateAccess { star_id: u32 },     // Can teleport
    ResourceNode,                         // +1 scan per turn
}
```

---

## Galaxy Generation

Stars are generated deterministically from session seed so both players see the same galaxy:

```typescript
function generateGalaxy(sessionSeed: number): Star[] {
  const rng = seedRandom(sessionSeed);
  const stars: Star[] = [];

  // Spiral arm generation (same as existing code)
  const arms = 4;
  const starsPerArm = 50;

  for (let arm = 0; arm < arms; arm++) {
    for (let i = 0; i < starsPerArm; i++) {
      const angle = (arm * Math.PI * 2) / arms + (i / starsPerArm) * Math.PI * 2;
      const radius = 20 + i * 1.5 + rng() * 10;

      stars.push({
        id: arm * starsPerArm + i,
        position: [
          Math.cos(angle) * radius + (rng() * 8 - 4),
          (rng() - 0.5) * 15,
          Math.sin(angle) * radius + (rng() * 8 - 4)
        ],
        type: getStarType(rng()),  // 10% chance of special
      });
    }
  }

  return stars;
}
```

---

## UI Components

### 1. Galaxy View (existing, modified)
- Show all 200 stars
- Color-code: unexplored, scanned-empty, enemy-found, your-bases
- Highlight scan range around command ship
- Click stars to scan (if in range) or move command ship

### 2. Intel Panel
- Your bases remaining: ●●●●● (5/5)
- Enemy bases found: 💥 (1/?)
- Enemy bases destroyed: 0
- Your command ship position
- Enemy command ship position
- Active buffs

### 3. Action Buttons
- [MOVE SHIP] - Select destination star
- [SCAN STAR] - Select target within range
- [USE WARP] - If warp gate available

### 4. Battle Log
- Turn-by-turn history
- "Turn 5: You scanned Star #78 - ENEMY BASE FOUND!"
- "Turn 4: Enemy moved to Star #134"

---

## Development Phases

### Phase 1: Core Contract (Week 1)
- [ ] Lobby system (create/join)
- [ ] Base commitment (hash storage)
- [ ] Command ship deployment
- [ ] Basic scan/move mechanics (no ZK yet)
- [ ] Game Hub integration

### Phase 2: ZK Circuit (Week 1-2)
- [ ] Write base_check.circom
- [ ] Trusted setup (use existing Powers of Tau)
- [ ] Generate proving/verification keys
- [ ] Test proof generation

### Phase 3: On-Chain Verification (Week 2)
- [ ] Embed verification key in contract
- [ ] Implement verify_scan_proof
- [ ] Test full proof pipeline

### Phase 4: Frontend (Week 2-3)
- [ ] Adapt 3D galaxy for game
- [ ] Add HUD components
- [ ] Wallet integration
- [ ] ZK proof generation in browser
- [ ] Polish and animations

### Phase 5: Demo (Week 3)
- [ ] Full playthrough testing
- [ ] Video recording
- [ ] Deploy to testnet
- [ ] Documentation

---

## Why This Wins

1. **Visual Impact** - 3D galaxy is immediately impressive demo
2. **Novel ZK Application** - Not basic battleship
3. **Dark Forest Inspiration** - References famous ZK game
4. **Stellar Native** - Uses Protocol 25 BN254 primitives
5. **Strategic Depth** - Command ship movement + abilities
6. **Playable Demo** - Complete game loop for judges

---

## References

- Dark Forest: https://zkga.me/
- X-Ray Games (ZK on Stellar): reference/xray-games/
- 3D Galaxy Simulation: 3-d-galaxy-simulation/
- Midnight Sea Battle: reference/midnight-seabattle/
