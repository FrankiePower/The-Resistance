// my_game Noir circuit for Mastermind-like feedback checks.
// Public inputs are ordered to match on-chain checks:
// session_id, guess_id, commitment, guess_packed, exact, partial.
//
// Security note:
// `commitment` is now a salted hash commitment, not a direct packing of `secret`.
// This prevents recovering the answer from on-chain commitment bytes.

fn main(
    session_id: pub Field,
    guess_id: pub Field,
    commitment: pub Field,
    guess_packed: pub Field,
    exact: pub Field,
    partial: pub Field,
    salt: [u8; 16],
    secret: [Field; 4],
    guess: [Field; 4],
) {
    // Keep domain-separator public inputs bound into the proof.
    // (No extra inequality checks needed for Field.)
    let _sid = session_id;
    let _gid = guess_id;

    // Digits in [1, 6] using constrained cast via u8.
    for i in 0..4 {
        let g_u8: u8 = guess[i] as u8;
        let s_u8: u8 = secret[i] as u8;
        assert(g_u8 as Field == guess[i]);
        assert(s_u8 as Field == secret[i]);
        assert(g_u8 > 0);
        assert(s_u8 > 0);
        assert(g_u8 < 7);
        assert(s_u8 < 7);
    }

    // Bind guess bytes to the packed u32-style value.
    let packed_guess =
        guess[0] * 16777216 + // 256^3
        guess[1] * 65536 +    // 256^2
        guess[2] * 256 +      // 256^1
        guess[3];             // 256^0
    assert(guess_packed == packed_guess);

    // One-way salted commitment over witness values:
    // commitment = be31(blake2s(secret_bytes || salt_bytes))
    // where be31 packs the first 31 digest bytes as a field.
    let mut preimage: [u8; 20] = [0; 20];
    for i in 0..4 {
        preimage[i] = secret[i] as u8;
    }
    for i in 0..16 {
        preimage[4 + i] = salt[i];
    }
    let digest = std::hash::blake2s(preimage);
    let mut secret_commitment = 0;
    for i in 0..31 {
        secret_commitment = secret_commitment * 256 + (digest[i] as Field);
    }
    assert(commitment == secret_commitment);

    // Exact matches: correct digit in correct slot.
    let mut ex = 0;
    for i in 0..4 {
        if secret[i] == guess[i] {
            ex += 1;
        }
    }

    // Total matches by color counts, then derive partial.
    let mut total_matches = 0;
    for d in 1..7 {
        let dv = d as Field;
        let mut secret_count = 0;
        let mut guess_count = 0;
        for i in 0..4 {
            if secret[i] == dv {
                secret_count += 1;
            }
            if guess[i] == dv {
                guess_count += 1;
            }
        }
        if secret_count < guess_count {
            total_matches += secret_count;
        } else {
            total_matches += guess_count;
        }
    }
    let pa = total_matches - ex;

    assert(exact == ex as Field);
    assert(partial == pa as Field);
}

// ============================================================
// La Ruleta de la Pobla -- ZK Russian Roulette Circuit (Noir 1.0)
// ============================================================
// Zero-knowledge proof that the game host:
//   1. Knows the bullet_position committed at game start.
//   2. Can prove whether a given chamber is SAFE or LETHAL
//      without revealing the actual bullet position.
//
// The Soroban contract stores `bullet_commitment` = pedersen_hash([salt, bullet_pos]).
// Each turn, the player pulls the trigger on `current_chamber`.
// The host generates a ZK proof showing the result (hit or miss)
// is consistent with the original commitment.
// ============================================================
// Hash: pedersen_hash (BN254-native, available in Noir >= 1.0)
// ============================================================

fn main(
    // -- Private inputs (only the host / prover knows) --------
    salt: Field,              // Random salt committed at game start
    bullet_position: Field,   // 0..5 which chamber has the bullet

    // -- Public inputs (verifiable on-chain) ------------------
    bullet_commitment: pub Field, // pedersen_hash([salt, bullet_position])
    current_chamber: pub Field,   // Which chamber is being fired (0..5)
    is_hit: pub Field,            // 1 = bullet found (death), 0 = safe (click)
) {
    // --- 1. Verify bullet commitment -------------------------
    // The host proves they committed to this exact bullet position
    // at game start, without revealing it.
    let computed_commitment = std::hash::pedersen_hash([salt, bullet_position]);
    assert(
        computed_commitment == bullet_commitment,
        "Bad commitment: salt+position does not match on-chain hash"
    );

    // --- 2. Verify bullet_position is valid (0..5) -----------
    // A 6-chamber revolver: positions 0, 1, 2, 3, 4, 5.
    assert(bullet_position as u8 < 6, "Bullet position must be 0..5");

    // --- 3. Verify current_chamber is valid (0..5) -----------
    assert(current_chamber as u8 < 6, "Chamber must be 0..5");

    // --- 4. Verify hit/miss result is correct ----------------
    // is_hit must be 1 if current_chamber == bullet_position, else 0.
    if current_chamber == bullet_position {
        assert(is_hit == 1, "Should be a hit: chamber matches bullet position");
    } else {
        assert(is_hit == 0, "Should be safe: chamber does not match bullet position");
    }
}

// ============================================================
// Unit tests (run with `nargo test`)
// ============================================================
#[test]
fn test_miss_proof_valid() {
    // Bullet in chamber 3, firing chamber 0 -> safe
    let salt = 42;
    let bullet_pos = 3;
    let chamber = 0;
    let commitment = std::hash::pedersen_hash([salt, bullet_pos]);
    main(salt, bullet_pos, commitment, chamber, 0); // is_hit = 0
}

#[test]
fn test_hit_proof_valid() {
    // Bullet in chamber 2, firing chamber 2 -> death
    let salt = 99999;
    let bullet_pos = 2;
    let chamber = 2;
    let commitment = std::hash::pedersen_hash([salt, bullet_pos]);
    main(salt, bullet_pos, commitment, chamber, 1); // is_hit = 1
}

#[test(should_fail_with = "Bad commitment: salt+position does not match on-chain hash")]
fn test_wrong_salt_fails() {
    let real_salt = 11111;
    let fake_salt = 22222;
    let bullet_pos = 4;
    let chamber = 0;
    let commitment = std::hash::pedersen_hash([real_salt, bullet_pos]);
    // Trying with wrong salt
    main(fake_salt, bullet_pos, commitment, chamber, 0);
}

#[test(should_fail_with = "Should be a hit: chamber matches bullet position")]
fn test_lying_about_miss_fails() {
    // Bullet in chamber 1, firing chamber 1, but claiming safe
    let salt = 55555;
    let bullet_pos = 1;
    let chamber = 1;
    let commitment = std::hash::pedersen_hash([salt, bullet_pos]);
    // Lying: saying is_hit=0 when it should be 1
    main(salt, bullet_pos, commitment, chamber, 0);
}

#[test(should_fail_with = "Should be safe: chamber does not match bullet position")]
fn test_lying_about_hit_fails() {
    // Bullet in chamber 5, firing chamber 0, but claiming hit
    let salt = 77777;
    let bullet_pos = 5;
    let chamber = 0;
    let commitment = std::hash::pedersen_hash([salt, bullet_pos]);
    // Lying: saying is_hit=1 when it should be 0
    main(salt, bullet_pos, commitment, chamber, 1);
}

#[test(should_fail_with = "Bad commitment: salt+position does not match on-chain hash")]
fn test_wrong_bullet_position_fails() {
    // Committed to position 3, but proving with position 4
    let salt = 88888;
    let real_pos = 3;
    let fake_pos = 4;
    let chamber = 0;
    let commitment = std::hash::pedersen_hash([salt, real_pos]);
    main(salt, fake_pos, commitment, chamber, 0);
}