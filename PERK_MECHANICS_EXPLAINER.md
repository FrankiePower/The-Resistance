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
* **What it is:** A tactical scanner that checks a 3x3 grid centered on your target coordinate.
* **Area of Effect:** 9 Stars (target_x ± 1, target_y ± 1).
* **What ZK reveals:** A number between `0` and `9` representing *how many* enemy bases are inside that 3x3 sector. It **does not** reveal exactly which of the 9 stars hold the bases.
* **UI Experience:** The player sees a sweeping green radar animation that leaves behind a glowing number like "⚠️ 3 Signatures Detected".
* **Strategy:** Use this early game to find "hot zones" before wasting turns on empty space.

### 3. Orbital Column Strike (`action_type = 2`)
* **What it is:** A devastating superweapon that incinerates an entire vertical column (an entire X-coordinate line) from top to bottom.
* **Area of Effect:** 10+ Stars (The entire `target_x` column).
* **What ZK reveals:** A number between `0` and `10` showing the total number of bases destroyed in that column.
* **UI Experience:** The screen turns red, alarms blare, and a massive laser rips through the map. 
* **Strategy:** A massive swing-turn weapon. Great for when radar detects multiple targets in a line, or as a desperation move.

---

## 🧠 How the ZK Circuit Works Under the Hood

The magic of *The Resistance* is that your opponent’s browser has to prove the result of your attack without revealing where their remaining bases are.

Here is how the Noir circuit (`circuits/src/main.nr`) mathematically proves the perks:

1. **Commitment Check:** The circuit hashes the defender's secret X and Y coordinates to ensure they haven't moved their bases since the game started.
2. **Action Switch:** It checks the `action_type` parameter (0, 1, or 2) provided by the attacker.
3. **Loop Over All Bases:** 
   - If `action_type == 0` (Strike): It checks `if (base_x == target_x) AND (base_y == target_y)`.
   - If `action_type == 1` (Radar): It calculates the distance. `if (distance_x <= 1) AND (distance_y <= 1)`. 
   - If `action_type == 2` (Orbital Strike): It ignores the Y coordinate entirely and just checks `if (base_x == target_x)`.
4. **Aggregate Result:** It adds up the hits and returns the final number (e.g. "3 bases destroyed").

Because this happens inside a ZK Snark, the attacker gets the verified number on-chain, but the defender's actual `[Field; 10]` array remains locked locally in their browser.

---

## 🎨 Recommended UI Upgrades
To make this fun, the frontend should react wildly to these actions:
* **Suspense Delay:** When an action is taken, delay the result by 2-3 seconds while the ZK proof is "generating". Play a tension-building sound effect.
* **Radar Reveal:** Make the Radar Sweep feel analytical. Show hex grids scanning.
* **Carnage:** The Orbital Strike should shake the DOM window and leave permanent "scorched earth" marks on the grid.
