// THE RESISTANCE: 3D Galactic War Circuit
// Proves the result of weapon/scanner actions against secret bases using star IDs.
//
// Game Setup:
// - 200 stars total (IDs: 0-199)
// - 10 arms of 20 stars each (Arm 0 = stars 0-19, Arm 1 = stars 20-39, etc.)
// - Each player hides 10 bases among the 200 stars
//
// Actions:
// - Solar Scan (0): Precision strike on a single star
// - Deep Radar (1): Scan a region, count bases within neighbor radius
// - Arm Strike (2): Devastate an entire arm, destroy all bases in that arm

use poseidon::poseidon2::Poseidon2;

// Maximum neighbors for Deep Radar scan (adjustable based on radius)
global MAX_NEIGHBORS: u32 = 20;

// Stars per arm for Arm Strike calculation
global STARS_PER_ARM: u32 = 20;

// Helper: Convert u32 array to Field array for hashing
fn bases_to_fields(bases: [u32; 10]) -> [Field; 10] {
    let mut fields: [Field; 10] = [0; 10];
    for i in 0..10 {
        fields[i] = bases[i] as Field;
    }
    fields
}

fn main(
    // PRIVATE - your 10 secret base star IDs (0-199)
    bases: [u32; 10],

    // PUBLIC - commitment hash of your bases
    bases_hash: pub Field,

    // PUBLIC - action type
    // 0 = Solar Scan (single star precision strike)
    // 1 = Deep Radar (count bases in neighbor radius)
    // 2 = Arm Strike (destroy entire spiral arm)
    action_type: pub u32,

    // PUBLIC - target star ID (0-199)
    target_id: pub u32,

    // PUBLIC - neighbor star IDs for Deep Radar (unused for other actions)
    // These are precomputed by the frontend based on 3D positions
    neighbors: pub [u32; MAX_NEIGHBORS],
    neighbor_count: pub u32,
) -> pub u32 {

    // ===========================================
    // 1. VERIFY BASE COMMITMENT
    // ===========================================
    // Convert bases to Field array for hashing
    let bases_fields = bases_to_fields(bases);
    let computed_hash = Poseidon2::hash(bases_fields, 10);
    assert(computed_hash == bases_hash, "Base commitment mismatch - cheating detected!");

    // ===========================================
    // 2. VALIDATE INPUTS
    // ===========================================
    assert(
        (action_type == 0) | (action_type == 1) | (action_type == 2),
        "Invalid action type"
    );

    // Validate target_id is in valid range (0-199)
    assert(target_id < 200, "Target star ID out of range");

    // ===========================================
    // 3. EXECUTE ACTION & COUNT HITS
    // ===========================================
    let mut result: u32 = 0;

    // Calculate target's arm index for Arm Strike (integer division)
    let target_arm = target_id / STARS_PER_ARM;

    for i in 0..10 {
        let base_id = bases[i];
        let mut hit: u32 = 0;

        // [ACTION 0] SOLAR SCAN: Exact star match
        if action_type == 0 {
            if base_id == target_id {
                hit = 1;
            }
        }

        // [ACTION 1] DEEP RADAR: Check if base is in neighbor list
        if action_type == 1 {
            // Loop through the neighbor list to check membership
            for j in 0..MAX_NEIGHBORS {
                // Only check up to neighbor_count valid entries
                if j < neighbor_count {
                    if base_id == neighbors[j] {
                        hit = 1;
                    }
                }
            }
        }

        // [ACTION 2] ARM STRIKE: Same arm = hit (integer division)
        if action_type == 2 {
            let base_arm = base_id / STARS_PER_ARM;
            if base_arm == target_arm {
                hit = 1;
            }
        }

        result = result + hit;
    }

    result
}

// ===========================================
// HELPER: Compute hash for tests
// ===========================================
fn compute_test_hash(bases: [u32; 10]) -> Field {
    let bases_fields = bases_to_fields(bases);
    Poseidon2::hash(bases_fields, 10)
}

// ===========================================
// TESTS
// ===========================================

#[test]
fn test_solar_scan_hit() {
    // Setup: Base at star 42
    let mut bases: [u32; 10] = [0; 10];
    bases[0] = 42;

    let bases_hash = compute_test_hash(bases);
    let neighbors: [u32; MAX_NEIGHBORS] = [0; MAX_NEIGHBORS];

    // Scan star 42 - should hit
    let result = main(bases, bases_hash, 0, 42, neighbors, 0);
    assert(result == 1);
}

#[test]
fn test_solar_scan_miss() {
    // Setup: Base at star 42
    let mut bases: [u32; 10] = [0; 10];
    bases[0] = 42;

    let bases_hash = compute_test_hash(bases);
    let neighbors: [u32; MAX_NEIGHBORS] = [0; MAX_NEIGHBORS];

    // Scan star 43 - should miss
    let result = main(bases, bases_hash, 0, 43, neighbors, 0);
    assert(result == 0);
}

#[test]
fn test_deep_radar_finds_multiple() {
    // Setup: Bases at stars 10, 15, 42, 100
    let mut bases: [u32; 10] = [0; 10];
    bases[0] = 10;
    bases[1] = 15;
    bases[2] = 42;
    bases[3] = 100;

    let bases_hash = compute_test_hash(bases);

    // Neighbors of star 12 include stars 10, 11, 13, 14, 15 (within radius)
    let mut neighbors: [u32; MAX_NEIGHBORS] = [0; MAX_NEIGHBORS];
    neighbors[0] = 10;
    neighbors[1] = 11;
    neighbors[2] = 13;
    neighbors[3] = 14;
    neighbors[4] = 15;
    let neighbor_count: u32 = 5;

    // Radar scan should find 2 bases (10 and 15)
    let result = main(bases, bases_hash, 1, 12, neighbors, neighbor_count);
    assert(result == 2);
}

#[test]
fn test_deep_radar_finds_none() {
    // Setup: Bases at stars 100, 150
    let mut bases: [u32; 10] = [0; 10];
    bases[0] = 100;
    bases[1] = 150;

    let bases_hash = compute_test_hash(bases);

    // Neighbors of star 12 (stars 10-15) - no bases here
    let mut neighbors: [u32; MAX_NEIGHBORS] = [0; MAX_NEIGHBORS];
    neighbors[0] = 10;
    neighbors[1] = 11;
    neighbors[2] = 13;
    neighbors[3] = 14;
    neighbors[4] = 15;
    let neighbor_count: u32 = 5;

    // Radar scan should find 0 bases
    let result = main(bases, bases_hash, 1, 12, neighbors, neighbor_count);
    assert(result == 0);
}

#[test]
fn test_arm_strike_destroys_multiple() {
    // Setup:
    // - Arm 3 = stars 60-79
    // - Bases at stars 65, 72, 78 (all in Arm 3) + star 100 (Arm 5)
    let mut bases: [u32; 10] = [0; 10];
    bases[0] = 65;  // Arm 3 (65/20 = 3)
    bases[1] = 72;  // Arm 3 (72/20 = 3)
    bases[2] = 78;  // Arm 3 (78/20 = 3)
    bases[3] = 100; // Arm 5 (100/20 = 5)

    let bases_hash = compute_test_hash(bases);
    let neighbors: [u32; MAX_NEIGHBORS] = [0; MAX_NEIGHBORS];

    // Strike star 70 (Arm 3) - should destroy 3 bases
    let result = main(bases, bases_hash, 2, 70, neighbors, 0);
    assert(result == 3);
}

#[test]
fn test_arm_strike_misses() {
    // Setup: Bases at stars 10, 25 (Arms 0 and 1)
    let mut bases: [u32; 10] = [0; 10];
    bases[0] = 10;  // Arm 0 (10/20 = 0)
    bases[1] = 25;  // Arm 1 (25/20 = 1)

    let bases_hash = compute_test_hash(bases);
    let neighbors: [u32; MAX_NEIGHBORS] = [0; MAX_NEIGHBORS];

    // Strike star 150 (Arm 7) - should destroy 0 bases
    let result = main(bases, bases_hash, 2, 150, neighbors, 0);
    assert(result == 0);
}

#[test]
fn test_arm_boundaries() {
    // Verify arm calculation: star 19 = Arm 0, star 20 = Arm 1
    // Place bases in different arms so we can test boundary correctly
    let mut bases: [u32; 10] = [0; 10];
    bases[0] = 19;   // Arm 0 (19/20 = 0)
    bases[1] = 20;   // Arm 1 (20/20 = 1)
    bases[2] = 60;   // Arm 3
    bases[3] = 80;   // Arm 4
    bases[4] = 100;  // Arm 5
    bases[5] = 120;  // Arm 6
    bases[6] = 140;  // Arm 7
    bases[7] = 160;  // Arm 8
    bases[8] = 180;  // Arm 9
    bases[9] = 199;  // Arm 9

    let bases_hash = compute_test_hash(bases);
    let neighbors: [u32; MAX_NEIGHBORS] = [0; MAX_NEIGHBORS];

    // Strike Arm 0 (target star 5) - should only hit star 19
    let result = main(bases, bases_hash, 2, 5, neighbors, 0);
    assert(result == 1);

    // Strike Arm 1 (target star 25) - should only hit star 20
    let result2 = main(bases, bases_hash, 2, 25, neighbors, 0);
    assert(result2 == 1);
}

#[test]
fn test_all_bases_in_one_arm() {
    // Edge case: All 10 bases in same arm (Arm 2 = stars 40-59)
    let mut bases: [u32; 10] = [0; 10];
    bases[0] = 40;
    bases[1] = 41;
    bases[2] = 42;
    bases[3] = 43;
    bases[4] = 44;
    bases[5] = 45;
    bases[6] = 46;
    bases[7] = 47;
    bases[8] = 48;
    bases[9] = 49;

    let bases_hash = compute_test_hash(bases);
    let neighbors: [u32; MAX_NEIGHBORS] = [0; MAX_NEIGHBORS];

    // Strike Arm 2 (stars 40-59) - should destroy all 10
    let result = main(bases, bases_hash, 2, 45, neighbors, 0);
    assert(result == 10);
}
