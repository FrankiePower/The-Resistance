# The Resistance: Shadow Fleet - Gameplay Design

## Current Implementation (V1 - Hackathon MVP)

### Core Mechanics
- **200 stars** in the galaxy
- **10 secret bases** per player (committed via Poseidon hash at game start)
- **Turn-based scanning** - players alternate scanning stars
- **ZK proofs** verify each scan (proves whether target is/isn't an opponent's base)
- **Win condition**: First to find all 10 opponent bases

### Game Flow
1. Both players commit base locations (Poseidon hash of 10 star IDs)
2. Player 1 goes first
3. Players alternate scanning stars with ZK proofs
4. First to find 10 opponent bases wins
5. Game Hub receives start_game/end_game for points

---

## Design Ideas (Post-Hackathon)

### Time Pressure
- Add game timer (e.g., 5-10 minutes)
- When time expires: **most bases found wins**
- Creates urgency, prevents stalling
- Could use ledger-based countdown

### Colonization Twist
If you scan a star and **don't** find an enemy base:
- You colonize that star (add to your territory)
- Creates risk/reward for scanning
- **Open question**: Do colonized bases count toward opponent's win condition?

**Option A**: Colonized bases are PUBLIC (visible to opponent)
- Original 10 bases stay hidden (ZK-protected)
- Colonized bases can be "destroyed" by opponent
- Win = find all 10 ORIGINAL secret bases

**Option B**: Colonized bases add to your defense
- Opponent must find original 10 + all colonized
- Longer games, more strategic

**Option C**: Colonization is resource-based
- Colonized stars generate "scan power" or points
- More territory = more actions per turn

### Multiple Scans Per Turn
- Start with 1 scan per turn
- Colonization gives bonus scans
- Creates snowball potential

### Base Relocation
- Once per game: relocate 1-3 bases
- Requires new ZK commitment
- Strategic escape mechanism

---

## Technical Considerations

### TTL
- Current: 30 days (too long for testing)
- For hackathon: 1 day (17,280 ledgers)
- Production: TBD based on average game length

### ZK Circuit Changes for Colonization
If colonized bases need ZK protection:
- Would need dynamic commitment updates
- More complex circuit (variable-length base array)
- **Recommendation**: Keep colonized bases PUBLIC for MVP

### Proof Generation Time
- Client-side proof generation: ~2-5 seconds
- Acceptable for turn-based gameplay
- Could add "scanning..." animation

---

## Frontend Requirements

### 3D Galaxy View
- 200 stars positioned in 3D space
- Color coding:
  - White: Unexplored
  - Blue: Your bases (only you see)
  - Green: Colonized by you
  - Red: Found enemy bases
  - Gray: Scanned (empty)

### Game UI
- Current turn indicator
- Found bases counter (X/10)
- Timer (if time-based)
- Scan history sidebar
- ZK proof generation status

### Animations
- Scan beam effect
- Base discovery explosion
- Colonization pulse
- Turn transition

---

## Questions to Resolve

1. **Timer duration?** 5 min? 10 min? Configurable?
2. **Colonization**: Yes/No for MVP?
3. **Colonized base visibility**: Public or ZK-protected?
4. **Win condition with colonization**: Original 10 only vs all bases?
5. **Multiple scans per turn?** Or always 1?

---

## Hackathon Priority

1. Get basic game working (current V1)
2. Deploy to testnet with Game Hub integration
3. Build 3D frontend with proof generation
4. Add timer if time permits
5. Colonization for post-hackathon
