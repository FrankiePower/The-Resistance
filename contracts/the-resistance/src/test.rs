#![cfg(test)]

//! Unit tests for The Resistance: Shadow Fleet contract.
//!
//! Note: Full ZK proof verification tests require real proofs from the Noir circuit.
//! These tests verify game state management and basic error handling.

use crate::{Error, TheResistanceContract, TheResistanceContractClient, BASES_PER_PLAYER, TOTAL_STARS};
use soroban_sdk::testutils::{Address as _, Ledger as _};
use soroban_sdk::{contract, contractimpl, Address, Bytes, BytesN, Env};
use ultrahonk_soroban_verifier::PROOF_BYTES;

// ============================================================================
// Mock GameHub for Unit Testing
// ============================================================================

#[contract]
pub struct MockGameHub;

#[contractimpl]
impl MockGameHub {
    pub fn start_game(
        _env: Env,
        _game_id: Address,
        _session_id: u32,
        _player1: Address,
        _player2: Address,
        _player1_points: i128,
        _player2_points: i128,
    ) {
        // Mock implementation
    }

    pub fn end_game(_env: Env, _session_id: u32, _player1_won: bool) {
        // Mock implementation
    }

    pub fn add_game(_env: Env, _game_address: Address) {
        // Mock implementation
    }
}

// ============================================================================
// Test Helpers
// ============================================================================

fn setup_test() -> (
    Env,
    TheResistanceContractClient<'static>,
    MockGameHubClient<'static>,
    Address,
    Address,
) {
    let env = Env::default();
    env.mock_all_auths();

    // Set ledger info
    env.ledger().set(soroban_sdk::testutils::LedgerInfo {
        timestamp: 1441065600,
        protocol_version: 25,
        sequence_number: 100,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: u32::MAX / 2,
        min_persistent_entry_ttl: u32::MAX / 2,
        max_entry_ttl: u32::MAX / 2,
    });

    // Deploy mock GameHub
    let hub_addr = env.register(MockGameHub, ());
    let game_hub = MockGameHubClient::new(&env, &hub_addr);

    // Create admin
    let admin = Address::generate(&env);

    // Create a dummy VK (won't work for real verification, but allows contract setup)
    let dummy_vk = Bytes::from_array(&env, &[0u8; 64]);

    // Deploy the-resistance with admin, GameHub, and VK
    let contract_id = env.register(TheResistanceContract, (&admin, &hub_addr, dummy_vk));
    let client = TheResistanceContractClient::new(&env, &contract_id);

    // Register the-resistance as a whitelisted game
    game_hub.add_game(&contract_id);

    let player1 = Address::generate(&env);
    let player2 = Address::generate(&env);

    (env, client, game_hub, player1, player2)
}

/// Helper to create a fake base commitment (Poseidon hash)
fn fake_commitment(env: &Env, seed: u8) -> BytesN<32> {
    let mut bytes = [0u8; 32];
    bytes[0] = seed;
    bytes[31] = seed;
    BytesN::from_array(env, &bytes)
}

/// Assert that a Result contains a specific error
fn assert_resistance_error<T, E>(
    result: &Result<Result<T, E>, Result<Error, soroban_sdk::InvokeError>>,
    expected_error: Error,
) {
    match result {
        Err(Ok(actual_error)) => {
            assert_eq!(
                *actual_error, expected_error,
                "Expected error {:?} (code {}), but got {:?} (code {})",
                expected_error, expected_error as u32, actual_error, *actual_error as u32
            );
        }
        Err(Err(_invoke_error)) => {
            panic!(
                "Expected contract error {:?} (code {}), but got invocation error",
                expected_error, expected_error as u32
            );
        }
        Ok(Err(_conv_error)) => {
            panic!(
                "Expected contract error {:?} (code {}), but got conversion error",
                expected_error, expected_error as u32
            );
        }
        Ok(Ok(_)) => {
            panic!(
                "Expected error {:?} (code {}), but operation succeeded",
                expected_error, expected_error as u32
            );
        }
    }
}

// ============================================================================
// Game Setup Tests
// ============================================================================

#[test]
fn test_start_game() {
    let (env, client, _hub, player1, player2) = setup_test();

    let session_id = 1u32;
    let points = 100_0000000;
    let p1_commitment = fake_commitment(&env, 1);
    let p2_commitment = fake_commitment(&env, 2);

    // Start game
    client.start_game(
        &session_id,
        &player1,
        &player2,
        &points,
        &points,
        &p1_commitment,
        &p2_commitment,
    );

    // Verify game state
    let game = client.get_game(&session_id);
    assert_eq!(game.player1, player1);
    assert_eq!(game.player2, player2);
    assert_eq!(game.player1_points, points);
    assert_eq!(game.player2_points, points);
    assert_eq!(game.player1_commitment, p1_commitment);
    assert_eq!(game.player2_commitment, p2_commitment);
    assert_eq!(game.player1_found, 0);
    assert_eq!(game.player2_found, 0);
    assert_eq!(game.current_turn, player1); // Player1 goes first
    assert!(game.winner.is_none());
}

#[test]
fn test_multiple_sessions() {
    let (env, client, _hub, player1, player2) = setup_test();
    let player3 = Address::generate(&env);
    let player4 = Address::generate(&env);

    let session1 = 1u32;
    let session2 = 2u32;

    client.start_game(
        &session1,
        &player1,
        &player2,
        &100_0000000,
        &100_0000000,
        &fake_commitment(&env, 1),
        &fake_commitment(&env, 2),
    );
    client.start_game(
        &session2,
        &player3,
        &player4,
        &50_0000000,
        &50_0000000,
        &fake_commitment(&env, 3),
        &fake_commitment(&env, 4),
    );

    // Verify both games exist and are independent
    let game1 = client.get_game(&session1);
    let game2 = client.get_game(&session2);

    assert_eq!(game1.player1, player1);
    assert_eq!(game2.player1, player3);
    assert_eq!(game1.player1_points, 100_0000000);
    assert_eq!(game2.player1_points, 50_0000000);
}

#[test]
#[should_panic(expected = "Cannot play against yourself")]
fn test_cannot_self_play() {
    let (env, client, _hub, player1, _player2) = setup_test();

    // Try to start game with same player
    client.start_game(
        &1u32,
        &player1,
        &player1, // Same player!
        &100_0000000,
        &100_0000000,
        &fake_commitment(&env, 1),
        &fake_commitment(&env, 1),
    );
}

#[test]
fn test_game_not_found() {
    let (_env, client, _hub, _player1, _player2) = setup_test();

    let result = client.try_get_game(&999);
    assert_resistance_error(&result, Error::GameNotFound);
}

// ============================================================================
// Query Function Tests
// ============================================================================

#[test]
fn test_get_current_turn() {
    let (env, client, _hub, player1, player2) = setup_test();

    client.start_game(
        &1u32,
        &player1,
        &player2,
        &100_0000000,
        &100_0000000,
        &fake_commitment(&env, 1),
        &fake_commitment(&env, 2),
    );

    let turn = client.get_current_turn(&1u32);
    assert_eq!(turn, player1); // Player1 starts
}

#[test]
fn test_get_scans_empty() {
    let (env, client, _hub, player1, player2) = setup_test();

    client.start_game(
        &1u32,
        &player1,
        &player2,
        &100_0000000,
        &100_0000000,
        &fake_commitment(&env, 1),
        &fake_commitment(&env, 2),
    );

    let scans = client.get_scans(&1u32, &player1);
    assert_eq!(scans.len(), 0);
}

#[test]
fn test_get_found_count_initial() {
    let (env, client, _hub, player1, player2) = setup_test();

    client.start_game(
        &1u32,
        &player1,
        &player2,
        &100_0000000,
        &100_0000000,
        &fake_commitment(&env, 1),
        &fake_commitment(&env, 2),
    );

    let found = client.get_found_count(&1u32, &player1);
    assert_eq!(found, 0);
}

#[test]
fn test_not_player_error_on_scans() {
    let (env, client, _hub, player1, player2) = setup_test();
    let non_player = Address::generate(&env);

    client.start_game(
        &1u32,
        &player1,
        &player2,
        &100_0000000,
        &100_0000000,
        &fake_commitment(&env, 1),
        &fake_commitment(&env, 2),
    );

    let result = client.try_get_scans(&1u32, &non_player);
    assert_resistance_error(&result, Error::NotPlayer);
}

// ============================================================================
// Admin Function Tests
// ============================================================================

#[test]
fn test_admin_functions() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let new_admin = Address::generate(&env);
    let hub_addr = env.register(MockGameHub, ());
    let new_hub = Address::generate(&env);
    let dummy_vk = Bytes::from_array(&env, &[0u8; 64]);

    let contract_id = env.register(TheResistanceContract, (&admin, &hub_addr, dummy_vk));
    let client = TheResistanceContractClient::new(&env, &contract_id);

    // Get initial admin
    assert_eq!(client.get_admin(), admin);

    // Set new admin
    client.set_admin(&new_admin);
    assert_eq!(client.get_admin(), new_admin);

    // Get initial hub
    assert_eq!(client.get_hub(), hub_addr);

    // Set new hub
    client.set_hub(&new_hub);
    assert_eq!(client.get_hub(), new_hub);
}

#[test]
fn test_set_vk() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let hub_addr = env.register(MockGameHub, ());
    let dummy_vk = Bytes::from_array(&env, &[0u8; 64]);
    let new_vk = Bytes::from_array(&env, &[1u8; 128]);

    let contract_id = env.register(TheResistanceContract, (&admin, &hub_addr, dummy_vk));
    let client = TheResistanceContractClient::new(&env, &contract_id);

    // Update VK (admin only)
    client.set_vk(&new_vk);

    // VK is updated - can verify by trying to start a game and scan
    // (which would fail with different errors depending on VK state)
}

// ============================================================================
// Constants Tests
// ============================================================================

#[test]
fn test_constants() {
    // Verify game constants are correct
    assert_eq!(TOTAL_STARS, 200);
    assert_eq!(BASES_PER_PLAYER, 10);
}

// ============================================================================
// Scan Error Tests (without actual ZK verification)
// ============================================================================
//
// Note: Full scan tests require real ZK proofs from the Noir circuit.
// These tests verify error conditions before ZK verification is reached.

#[test]
fn test_scan_invalid_star_id() {
    let (env, client, _hub, player1, player2) = setup_test();

    client.start_game(
        &1u32,
        &player1,
        &player2,
        &100_0000000,
        &100_0000000,
        &fake_commitment(&env, 1),
        &fake_commitment(&env, 2),
    );

    // Try to scan star 200 (invalid - max is 199)
    let fake_proof = Bytes::from_array(&env, &[0u8; 32]); // Wrong size
    let result = client.try_scan(&1u32, &player1, &200, &fake_proof, &false);
    assert_resistance_error(&result, Error::InvalidStarId);
}

#[test]
fn test_scan_invalid_proof_length() {
    let (env, client, _hub, player1, player2) = setup_test();

    client.start_game(
        &1u32,
        &player1,
        &player2,
        &100_0000000,
        &100_0000000,
        &fake_commitment(&env, 1),
        &fake_commitment(&env, 2),
    );

    // Try to scan with wrong proof length
    let fake_proof = Bytes::from_array(&env, &[0u8; 32]); // Should be PROOF_BYTES
    let result = client.try_scan(&1u32, &player1, &50, &fake_proof, &false);
    assert_resistance_error(&result, Error::InvalidProof);
}

#[test]
fn test_scan_not_your_turn() {
    let (env, client, _hub, player1, player2) = setup_test();

    client.start_game(
        &1u32,
        &player1,
        &player2,
        &100_0000000,
        &100_0000000,
        &fake_commitment(&env, 1),
        &fake_commitment(&env, 2),
    );

    // Player2 tries to scan but it's player1's turn
    // Use correct proof length to pass that check and reach the turn check
    let fake_proof = Bytes::from_slice(&env, &[0u8; PROOF_BYTES]);
    let result = client.try_scan(&1u32, &player2, &50, &fake_proof, &false);
    assert_resistance_error(&result, Error::NotYourTurn);
}

#[test]
fn test_scan_game_not_found() {
    let (env, client, _hub, player1, _player2) = setup_test();

    // Use correct proof length to pass that check and reach the game lookup
    let fake_proof = Bytes::from_slice(&env, &[0u8; PROOF_BYTES]);
    let result = client.try_scan(&999, &player1, &50, &fake_proof, &false);
    assert_resistance_error(&result, Error::GameNotFound);
}
