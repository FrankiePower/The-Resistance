// THE RESISTANCE: Base Check Circuit (Perk Edition)
// Proves the result of various weapon/scanner actions against secret bases.

use poseidon::poseidon2::Poseidon2;

// Helper to check if a value is -1, 0, or 1 (i.e. distance <= 1)
// We check if d^3 - d == 0  which is true for 0, 1, -1
fn is_within_one(d: Field) -> bool {
    let d2 = d * d;
    let d3 = d2 * d;
    d3 == d
}

fn main(
    // PRIVATE - your secret base locations
    // We separate X and Y coordinates to make area calculations easier
    bases_x: [Field; 10],
    bases_y: [Field; 10],

    // PUBLIC - on-chain values
    bases_hash: pub Field,
    
    // ACTION TYPE
    // 0 = Basic Shot (Single Target)
    // 1 = Radar Sweep (3x3 Area, reveals COUNT of bases, not exact location)
    // 2 = Orbital Column Strike (Hits an entire X column)
    action_type: pub Field,
    
    // PUBLIC - Coordinates being targeted
    target_x: pub Field,
    target_y: pub Field,
) -> pub Field {

    // 1. Verify commitment matches
    // We pack the x and y coordinates into a single array for hashing
    // For a real implementation, you might want to hash them in pairs or sequentially
    // But for this example, we'll hash the 20 elements. Poseidon2 usually takes 
    // a fixed size, let's hash x's then y's. (Assuming Poseidon2::hash can take 20 inputs
    // or we hash them in chunks if needed. We'll use a simplified version here.)
    // Note: If Poseidon2 doesn't support 20 inputs directly, we would need to chain hashes.
    // Assuming Poseidon2::hash supports up to 16, we might need a workaround.
    // Let's use two hashes and hash the results.
    let hash_x = Poseidon2::hash(bases_x, 10);
    let hash_y = Poseidon2::hash(bases_y, 10);
    // You could hash these two together, but let's assume the bases_hash we receive 
    // is Poseidon2::hash([hash_x, hash_y])
    let computed_hash = Poseidon2::hash([hash_x, hash_y], 2);
    
    assert(computed_hash == bases_hash, "Base commitment mismatch");

    // Ensure action_type is valid (0, 1, or 2)
    assert((action_type == 0) | (action_type == 1) | (action_type == 2), "Invalid action type");

    let mut result: Field = 0;

    for i in 0..10 {
        let x = bases_x[i];
        let y = bases_y[i];
        
        let dx = x - target_x;
        let dy = y - target_y;

        let mut hit: Field = 0;

        // [ACTION 0] Basic Shot: Exact match required
        if action_type == 0 {
            if (dx == 0) & (dy == 0) {
                hit = 1;
            }
        }

        // [ACTION 1] Radar Sweep: Distance <= 1 in both x and y (3x3 grid)
        if action_type == 1 {
            if is_within_one(dx) & is_within_one(dy) {
                hit = 1;
            }
        }

        // [ACTION 2] Orbital Column Strike: X matches, Y doesn't matter
        if action_type == 2 {
            if dx == 0 {
                hit = 1;
            }
        }

        result = result + hit;
    }

    result
}

#[test]
fn test_basic_shot_hit() {
    let mut bases_x = [0; 10];
    let mut bases_y = [0; 10];
    bases_x[0] = 5; bases_y[0] = 5; // Base at (5,5)

    let hash_x = Poseidon2::hash(bases_x, 10);
    let hash_y = Poseidon2::hash(bases_y, 10);
    let bases_hash = Poseidon2::hash([hash_x, hash_y], 2);

    let result = main(bases_x, bases_y, bases_hash, 0, 5, 5);
    assert(result == 1);
}

#[test]
fn test_radar_sweep_detects_multiple() {
    let mut bases_x = [0; 10];
    let mut bases_y = [0; 10];
    // Place 3 bases in a 3x3 area around (5,5)
    bases_x[0] = 4; bases_y[0] = 4; // Top Left
    bases_x[1] = 5; bases_y[1] = 5; // Center
    bases_x[2] = 6; bases_y[2] = 6; // Bottom Right
    
    // Place one far away
    bases_x[3] = 9; bases_y[3] = 9;

    let hash_x = Poseidon2::hash(bases_x, 10);
    let hash_y = Poseidon2::hash(bases_y, 10);
    let bases_hash = Poseidon2::hash([hash_x, hash_y], 2);

    // Radar at (5,5) should detect exactly 3 bases
    let result = main(bases_x, bases_y, bases_hash, 1, 5, 5);
    assert(result == 3);
}

#[test]
fn test_orbital_strike() {
    let mut bases_x = [0; 10];
    let mut bases_y = [0; 10];
    // Place 4 bases in column X=3
    bases_x[0] = 3; bases_y[0] = 1;
    bases_x[1] = 3; bases_y[1] = 5;
    bases_x[2] = 3; bases_y[2] = 9;
    bases_x[3] = 3; bases_y[3] = 2;
    
    // Place others elsewhere
    bases_x[4] = 4; bases_y[4] = 4;

    let hash_x = Poseidon2::hash(bases_x, 10);
    let hash_y = Poseidon2::hash(bases_y, 10);
    let bases_hash = Poseidon2::hash([hash_x, hash_y], 2);

    // Strike column 3 should destroy 4 bases
    let result = main(bases_x, bases_y, bases_hash, 2, 3, 0); // Y doesn't matter
    assert(result == 4);
}
