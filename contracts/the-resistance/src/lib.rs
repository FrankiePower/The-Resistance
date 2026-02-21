#![no_std]

//! # The Resistance
//!
//! A ZK-powered 2-player galactic strategy game on Stellar/Soroban.
//!
//! **Gameplay:**
//! - Each player secretly places 10 bases among 200 stars
//! - Players take turns scanning stars to find opponent's bases
//! - Scans are verified by ZK proofs (no one can cheat about base locations)
//! - First player to find all 10 opponent bases wins
//!
//! **ZK Circuit:**
//! The circuit proves: "Given my committed bases, the target star is/isn't a base"
//! without revealing other base locations.

use soroban_sdk::{
    contract, contractclient, contracterror, contractimpl, contracttype,
    vec, Address, Bytes, BytesN, Env, IntoVal, Vec,
};
use ultrahonk_soroban_verifier::{UltraHonkVerifier, PROOF_BYTES};

// ============================================================================
// Game Hub Interface
// ============================================================================

#[contractclient(name = "GameHubClient")]
pub trait GameHub {
    fn start_game(
        env: Env,
        game_id: Address,
        session_id: u32,
        player1: Address,
        player2: Address,
        player1_points: i128,
        player2_points: i128,
    );

    fn end_game(env: Env, session_id: u32, player1_won: bool);
}

// ============================================================================
// Constants
// ============================================================================

/// Total stars in the galaxy
pub const TOTAL_STARS: u32 = 200;

/// Number of bases each player places
pub const BASES_PER_PLAYER: u32 = 10;

/// TTL for game storage (30 days in ledgers)
const GAME_TTL_LEDGERS: u32 = 518_400;

// ============================================================================
// Errors
// ============================================================================

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    GameNotFound = 1,
    NotPlayer = 2,
    NotYourTurn = 3,
    GameAlreadyEnded = 4,
    InvalidProof = 5,
    ProofVerificationFailed = 6,
    StarAlreadyScanned = 7,
    InvalidStarId = 8,
    VkNotSet = 9,
    VkParseError = 10,
    CommitmentMismatch = 11,
    GameNotReady = 12,
}

// ============================================================================
// Data Types
// ============================================================================

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Game {
    pub player1: Address,
    pub player2: Address,
    pub player1_points: i128,
    pub player2_points: i128,

    /// Poseidon hash of player1's 10 base locations
    pub player1_commitment: BytesN<32>,
    /// Poseidon hash of player2's 10 base locations
    pub player2_commitment: BytesN<32>,

    /// Number of opponent bases player1 has found
    pub player1_found: u32,
    /// Number of opponent bases player2 has found
    pub player2_found: u32,

    /// Stars that player1 has scanned (searching for P2's bases)
    pub player1_scanned: Vec<u32>,
    /// Stars that player2 has scanned (searching for P1's bases)
    pub player2_scanned: Vec<u32>,

    /// Whose turn is it (player1 or player2 address)
    pub current_turn: Address,

    /// Winner (once game ends)
    pub winner: Option<Address>,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Game(u32),
    GameHubAddress,
    Admin,
    /// Verification key for ZK proofs (stored once at deploy)
    VerificationKey,
}

// ============================================================================
// Contract Definition
// ============================================================================

#[contract]
pub struct TheResistanceContract;

#[contractimpl]
impl TheResistanceContract {
    // ========================================================================
    // Constructor
    // ========================================================================

    /// Initialize the contract with admin, GameHub address, and ZK verification key.
    ///
    /// # Arguments
    /// * `admin` - Admin address (can upgrade contract)
    /// * `game_hub` - Address of the GameHub contract
    /// * `vk_bytes` - Verification key bytes for the ZK circuit
    pub fn __constructor(env: Env, admin: Address, game_hub: Address, vk_bytes: Bytes) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::GameHubAddress, &game_hub);
        env.storage()
            .instance()
            .set(&DataKey::VerificationKey, &vk_bytes);
    }

    // ========================================================================
    // Game Lifecycle
    // ========================================================================

    /// Start a new game between two players.
    ///
    /// Both players must submit their base commitments (Poseidon hash of 10 star IDs).
    /// Player1 goes first.
    ///
    /// # Arguments
    /// * `session_id` - Unique session identifier
    /// * `player1` - Address of first player (goes first)
    /// * `player2` - Address of second player
    /// * `player1_points` - Points committed by player 1
    /// * `player2_points` - Points committed by player 2
    /// * `player1_commitment` - Poseidon hash of player1's 10 bases
    /// * `player2_commitment` - Poseidon hash of player2's 10 bases
    pub fn start_game(
        env: Env,
        session_id: u32,
        player1: Address,
        player2: Address,
        player1_points: i128,
        player2_points: i128,
        player1_commitment: BytesN<32>,
        player2_commitment: BytesN<32>,
    ) -> Result<(), Error> {
        // Prevent self-play
        if player1 == player2 {
            panic!("Cannot play against yourself");
        }

        // Require auth from both players (they commit points + base commitments)
        player1.require_auth_for_args(vec![
            &env,
            session_id.into_val(&env),
            player1_points.into_val(&env),
            player1_commitment.clone().into_val(&env),
        ]);
        player2.require_auth_for_args(vec![
            &env,
            session_id.into_val(&env),
            player2_points.into_val(&env),
            player2_commitment.clone().into_val(&env),
        ]);

        // Get GameHub and register game
        let game_hub_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::GameHubAddress)
            .expect("GameHub not set");

        let game_hub = GameHubClient::new(&env, &game_hub_addr);
        game_hub.start_game(
            &env.current_contract_address(),
            &session_id,
            &player1,
            &player2,
            &player1_points,
            &player2_points,
        );

        // Create game state
        let game = Game {
            player1: player1.clone(),
            player2: player2.clone(),
            player1_points,
            player2_points,
            player1_commitment,
            player2_commitment,
            player1_found: 0,
            player2_found: 0,
            player1_scanned: Vec::new(&env),
            player2_scanned: Vec::new(&env),
            current_turn: player1, // Player1 goes first
            winner: None,
        };

        // Store game
        let key = DataKey::Game(session_id);
        env.storage().temporary().set(&key, &game);
        env.storage()
            .temporary()
            .extend_ttl(&key, GAME_TTL_LEDGERS, GAME_TTL_LEDGERS);

        Ok(())
    }

    /// Scan a star to check if it's an opponent's base.
    ///
    /// The player must provide a ZK proof that proves:
    /// 1. They know the opponent's base commitment (matches stored hash)
    /// 2. The target star is/isn't one of those bases
    ///
    /// # Arguments
    /// * `session_id` - Game session ID
    /// * `player` - Address of scanning player
    /// * `target_star` - Star ID being scanned (0-199)
    /// * `proof_bytes` - UltraHonk proof bytes
    /// * `is_base` - Whether the target is a base (proven by ZK circuit)
    ///
    /// # Returns
    /// * `bool` - True if a base was found
    pub fn scan(
        env: Env,
        session_id: u32,
        player: Address,
        target_star: u32,
        proof_bytes: Bytes,
        is_base: bool,
    ) -> Result<bool, Error> {
        player.require_auth();

        // Validate star ID
        if target_star >= TOTAL_STARS {
            return Err(Error::InvalidStarId);
        }

        // Validate proof length
        if proof_bytes.len() as usize != PROOF_BYTES {
            return Err(Error::InvalidProof);
        }

        // Get game
        let key = DataKey::Game(session_id);
        let mut game: Game = env
            .storage()
            .temporary()
            .get(&key)
            .ok_or(Error::GameNotFound)?;

        // Check game not ended
        if game.winner.is_some() {
            return Err(Error::GameAlreadyEnded);
        }

        // Check it's this player's turn
        if game.current_turn != player {
            return Err(Error::NotYourTurn);
        }

        // Determine which player is scanning and get opponent's commitment
        let (is_player1, opponent_commitment, scanned_list) = if player == game.player1 {
            (true, &game.player2_commitment, &game.player1_scanned)
        } else if player == game.player2 {
            (false, &game.player1_commitment, &game.player2_scanned)
        } else {
            return Err(Error::NotPlayer);
        };

        // Check star hasn't been scanned already by this player
        for i in 0..scanned_list.len() {
            if scanned_list.get(i).unwrap() == target_star {
                return Err(Error::StarAlreadyScanned);
            }
        }

        // Build public inputs for ZK verification
        // Circuit public inputs: [bases_hash (32 bytes), target_star (32 bytes), is_base (32 bytes)]
        let mut public_inputs = Bytes::new(&env);

        // Add opponent's base commitment (32 bytes)
        public_inputs.append(&Bytes::from_array(&env, &opponent_commitment.to_array()));

        // Add target_star as 32-byte field element (big-endian, left-padded)
        let mut star_bytes = [0u8; 32];
        star_bytes[28..32].copy_from_slice(&target_star.to_be_bytes());
        public_inputs.append(&Bytes::from_array(&env, &star_bytes));

        // Add is_base as 32-byte field element (0 or 1)
        let mut is_base_bytes = [0u8; 32];
        is_base_bytes[31] = if is_base { 1 } else { 0 };
        public_inputs.append(&Bytes::from_array(&env, &is_base_bytes));

        // Get verification key and verify proof
        let vk_bytes: Bytes = env
            .storage()
            .instance()
            .get(&DataKey::VerificationKey)
            .ok_or(Error::VkNotSet)?;

        let verifier =
            UltraHonkVerifier::new(&env, &vk_bytes).map_err(|_| Error::VkParseError)?;

        verifier
            .verify(&proof_bytes, &public_inputs)
            .map_err(|_| Error::ProofVerificationFailed)?;

        // Proof verified! Update game state
        if is_player1 {
            game.player1_scanned.push_back(target_star);
            if is_base {
                game.player1_found += 1;
            }
            // Check win condition
            if game.player1_found >= BASES_PER_PLAYER {
                game.winner = Some(game.player1.clone());
            } else {
                game.current_turn = game.player2.clone();
            }
        } else {
            game.player2_scanned.push_back(target_star);
            if is_base {
                game.player2_found += 1;
            }
            // Check win condition
            if game.player2_found >= BASES_PER_PLAYER {
                game.winner = Some(game.player2.clone());
            } else {
                game.current_turn = game.player1.clone();
            }
        }

        // If game ended, notify GameHub
        if let Some(ref winner) = game.winner {
            let game_hub_addr: Address = env
                .storage()
                .instance()
                .get(&DataKey::GameHubAddress)
                .expect("GameHub not set");

            let game_hub = GameHubClient::new(&env, &game_hub_addr);
            let player1_won = *winner == game.player1;
            game_hub.end_game(&session_id, &player1_won);
        }

        // Save updated game state
        env.storage().temporary().set(&key, &game);
        env.storage()
            .temporary()
            .extend_ttl(&key, GAME_TTL_LEDGERS, GAME_TTL_LEDGERS);

        Ok(is_base)
    }

    // ========================================================================
    // Query Functions
    // ========================================================================

    /// Get game state.
    pub fn get_game(env: Env, session_id: u32) -> Result<Game, Error> {
        let key = DataKey::Game(session_id);
        env.storage()
            .temporary()
            .get(&key)
            .ok_or(Error::GameNotFound)
    }

    /// Get the current turn for a game.
    pub fn get_current_turn(env: Env, session_id: u32) -> Result<Address, Error> {
        let game = Self::get_game(env, session_id)?;
        Ok(game.current_turn)
    }

    /// Get a player's scan history.
    pub fn get_scans(env: Env, session_id: u32, player: Address) -> Result<Vec<u32>, Error> {
        let game = Self::get_game(env, session_id)?;
        if player == game.player1 {
            Ok(game.player1_scanned)
        } else if player == game.player2 {
            Ok(game.player2_scanned)
        } else {
            Err(Error::NotPlayer)
        }
    }

    /// Get a player's found base count.
    pub fn get_found_count(env: Env, session_id: u32, player: Address) -> Result<u32, Error> {
        let game = Self::get_game(env, session_id)?;
        if player == game.player1 {
            Ok(game.player1_found)
        } else if player == game.player2 {
            Ok(game.player2_found)
        } else {
            Err(Error::NotPlayer)
        }
    }

    // ========================================================================
    // Admin Functions
    // ========================================================================

    /// Get the current admin address.
    pub fn get_admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("Admin not set")
    }

    /// Set a new admin address.
    pub fn set_admin(env: Env, new_admin: Address) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("Admin not set");
        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &new_admin);
    }

    /// Get the GameHub contract address.
    pub fn get_hub(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::GameHubAddress)
            .expect("GameHub not set")
    }

    /// Set a new GameHub contract address.
    pub fn set_hub(env: Env, new_hub: Address) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("Admin not set");
        admin.require_auth();

        env.storage()
            .instance()
            .set(&DataKey::GameHubAddress, &new_hub);
    }

    /// Update the verification key (admin only).
    pub fn set_vk(env: Env, vk_bytes: Bytes) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("Admin not set");
        admin.require_auth();

        env.storage()
            .instance()
            .set(&DataKey::VerificationKey, &vk_bytes);
    }

    /// Upgrade the contract WASM.
    pub fn upgrade(env: Env, new_wasm_hash: BytesN<32>) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("Admin not set");
        admin.require_auth();

        env.deployer().update_current_contract_wasm(new_wasm_hash);
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod test;
