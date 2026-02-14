// THE RESISTANCE: Base Check Circuit
// Proves that a scanned star is or isn't one of your secret bases

use poseidon::poseidon2::Poseidon2;

fn main(
    // PRIVATE - your secret base locations
    bases: [Field; 10],
    // PUBLIC - on-chain values
    bases_hash: pub Field,
    target_star: pub Field,
) -> pub Field {
    // Verify commitment matches
    let computed_hash = Poseidon2::hash(bases, 10);
    assert(computed_hash == bases_hash, "Base commitment mismatch");

    // Check if target is a base
    let mut is_base: Field = 0;
    for i in 0..10 {
        if bases[i] == target_star {
            is_base = 1;
        }
    }

    is_base
}

#[test]
fn test_base_found() {
    let bases: [Field; 10] = [10, 25, 50, 100, 150, 200, 250, 300, 350, 400];
    let bases_hash = Poseidon2::hash(bases, 10);
    let result = main(bases, bases_hash, 50);
    assert(result == 1);
}

#[test]
fn test_base_not_found() {
    let bases: [Field; 10] = [10, 25, 50, 100, 150, 200, 250, 300, 350, 400];
    let bases_hash = Poseidon2::hash(bases, 10);
    let result = main(bases, bases_hash, 75);
    assert(result == 0);
}
