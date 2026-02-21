# Strategic Perks: The New Resistance Mechanics

To make *The Resistance* more adrenaline-pumping and strategic, we have evolved the game from a blind guessing "Battleship" copy into a dynamic, tactical war game. 

We achieved this by upgrading the Zero-Knowledge (ZK) Noir circuit to support **Action Types**. Instead of just firing blind, you now have a command arsenal. 

---

## 🚀 The Three Arsenal Commands

Before the game starts, you commit to 10 secret base locations. During your turn, you can choose to execute one of the following commands against enemy space.

### 1. Basic Strike (`action_type = 0`)
* **What it is:** A standard precision attack on a single star.
* **Area of Effect:** 1 Star (x, y)
* **What ZK reveals:** Exactly `1` (Hit) or `0` (Miss).
* **Strategy:** Use this when you are confident about an enemy location.

### 2. Deep Space Radar Sweep (`action_type = 1`)
* **What it is:** A tactical scanner that sweeps deep space radially from the target star.
* **Area of Effect:** Euclidean radius. (Checks all stars within a `15-lightyear` distance of `[target_x, target_y, target_z]`).
* **What ZK reveals:** A number between `0` and `N` representing *how many* enemy bases are inside that local radius. It **does not** reveal exactly which stars hold the bases.
* **UI Experience:** The player sees a sweeping green radar animation that leaves behind a glowing number like "⚠️ 3 Signatures Detected".
* **Strategy:** Use this early game to find "hot zones" before wasting turns on empty space.

### 3. Galactic Arm Strike (`action_type = 2`)
* **What it is:** A devastating superweapon that incinerates an entire spiral arm of the galaxy.
* **Area of Effect:** 50 Stars (All stars belonging to the selected star's spiral arm cohort, computed via modulo math on the `target_id`).
* **What ZK reveals:** A number between `0` and `10` showing the total number of bases destroyed in that arm.
* **UI Experience:** The screen turns red, alarms blare, and a massive cosmic blast rips through the curvature of that entire galactic arm. 
* **Strategy:** A massive swing-turn weapon. Great for when radar detects multiple targets clustered along the curve of the galaxy, or as a desperation move.

---

## 🧠 How the ZK Circuit Works Under the Hood

The magic of *The Resistance* is that your opponent’s browser has to prove the result of your attack without revealing where their remaining bases are.

Here is how the Noir circuit (`circuits/src/main.nr`) mathematically proves the perks:

1. **Commitment Check:** The circuit hashes the defender's secret X and Y coordinates to ensure they haven't moved their bases since the game started.
2. **Action Switch:** It checks the `action_type` parameter (0, 1, or 2) provided by the attacker.
3. **Loop Over All Bases:** 
   - If `action_type == 0` (Strike): It checks `if target_id == base_id` directly to ensure a pinpoint hit constraint.
   - If `action_type == 1` (Radar): It computes the 3D Euclidean distance `sqrt((x2-x1)^2 + (y2-y1)^2 + (z2-z1)^2) <= MAX_RADIUS`. 
   - If `action_type == 2` (Arm Strike): It checks if the `base_id` belongs to the same mathematical arm group as the `target_id` (e.g., `if (base_id / 50) == (target_id / 50)`).
4. **Aggregate Result:** It adds up the math constraints hit and returns the final number (e.g. "3 bases destroyed" or "2 signatures found").

Because this happens inside a ZK Snark, the attacker gets the verified number on-chain, but the defender's actual `[Field; 10]` array remains locked locally in their browser.

---

## 🎨 Recommended UI Upgrades
To make this fun, the frontend should react wildly to these actions:
* **Suspense Delay:** When an action is taken, delay the result by 2-3 seconds while the ZK proof is "generating". Play a tension-building sound effect.
* **Radar Reveal:** Make the Radar Sweep feel analytical. Show hex grids scanning.
* **Carnage:** The Orbital Strike should shake the DOM window and leave permanent "scorched earth" marks on the grid.
