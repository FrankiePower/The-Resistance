import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}





export interface Game {
  /**
 * Whose turn is it (player1 or player2 address)
 */
current_turn: string;
  player1: string;
  /**
 * Arms that player1 has struck with Arm Strike (0-9)
 */
player1_arms_struck: Array<u32>;
  /**
 * Poseidon hash of player1's 10 base locations
 */
player1_commitment: Buffer;
  /**
 * Number of opponent bases player1 has found/destroyed
 */
player1_found: u32;
  player1_points: i128;
  /**
 * Stars that player1 has scanned with Solar Scan (searching for P2's bases)
 */
player1_scanned: Array<u32>;
  player2: string;
  /**
 * Arms that player2 has struck with Arm Strike (0-9)
 */
player2_arms_struck: Array<u32>;
  /**
 * Poseidon hash of player2's 10 base locations
 */
player2_commitment: Buffer;
  /**
 * Number of opponent bases player2 has found/destroyed
 */
player2_found: u32;
  player2_points: i128;
  /**
 * Stars that player2 has scanned with Solar Scan (searching for P1's bases)
 */
player2_scanned: Array<u32>;
  /**
 * Winner (once game ends)
 */
winner: Option<string>;
}

export const Errors = {
  1: {message:"GameNotFound"},
  2: {message:"NotPlayer"},
  3: {message:"NotYourTurn"},
  4: {message:"GameAlreadyEnded"},
  5: {message:"InvalidProof"},
  6: {message:"ProofVerificationFailed"},
  7: {message:"StarAlreadyScanned"},
  8: {message:"InvalidStarId"},
  9: {message:"VkNotSet"},
  10: {message:"VkParseError"},
  11: {message:"CommitmentMismatch"},
  12: {message:"GameNotReady"},
  13: {message:"InvalidActionType"},
  14: {message:"ArmAlreadyStruck"},
  15: {message:"InvalidResultCount"}
}

export type DataKey = {tag: "Game", values: readonly [u32]} | {tag: "GameHubAddress", values: void} | {tag: "Admin", values: void} | {tag: "VerificationKey", values: void};

export interface Client {
  /**
   * Construct and simulate a scan transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Legacy scan function for backwards compatibility (Solar Scan only)
   */
  scan: ({session_id, player, target_star, proof_bytes, is_base}: {session_id: u32, player: string, target_star: u32, proof_bytes: Buffer, is_base: boolean}, options?: MethodOptions) => Promise<AssembledTransaction<Result<boolean>>>

  /**
   * Construct and simulate a set_vk transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Update the verification key (admin only).
   */
  set_vk: ({vk_bytes}: {vk_bytes: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_hub transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get the GameHub contract address.
   */
  get_hub: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a set_hub transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Set a new GameHub contract address.
   */
  set_hub: ({new_hub}: {new_hub: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a upgrade transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Upgrade the contract WASM.
   */
  upgrade: ({new_wasm_hash}: {new_wasm_hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_game transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get game state.
   */
  get_game: ({session_id}: {session_id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<Game>>>

  /**
   * Construct and simulate a get_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get the current admin address.
   */
  get_admin: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a get_scans transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get a player's scan history.
   */
  get_scans: ({session_id, player}: {session_id: u32, player: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<Array<u32>>>>

  /**
   * Construct and simulate a set_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Set a new admin address.
   */
  set_admin: ({new_admin}: {new_admin: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a start_game transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Start a new game between two players.
   * 
   * Both players must submit their base commitments (Poseidon hash of 10 star IDs).
   * Player1 goes first.
   * 
   * # Arguments
   * * `session_id` - Unique session identifier
   * * `player1` - Address of first player (goes first)
   * * `player2` - Address of second player
   * * `player1_points` - Points committed by player 1
   * * `player2_points` - Points committed by player 2
   * * `player1_commitment` - Poseidon hash of player1's 10 bases
   * * `player2_commitment` - Poseidon hash of player2's 10 bases
   */
  start_game: ({session_id, player1, player2, player1_points, player2_points, player1_commitment, player2_commitment}: {session_id: u32, player1: string, player2: string, player1_points: i128, player2_points: i128, player1_commitment: Buffer, player2_commitment: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a execute_action transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Execute an action against opponent's bases.
   * 
   * The player must provide a ZK proof that proves the result of their action.
   * 
   * # Action Types:
   * * 0 = Solar Scan: Precision scan of a single star (returns 0 or 1)
   * * 1 = Deep Radar: Scan radius around star, returns count of bases nearby (0-10)
   * * 2 = Arm Strike: Destroy entire spiral arm, returns count destroyed (0-10)
   * 
   * # Arguments
   * * `session_id` - Game session ID
   * * `player` - Address of acting player
   * * `action_type` - Type of action (0, 1, or 2)
   * * `target_id` - Target star ID (0-199)
   * * `neighbors` - Neighbor star IDs for Deep Radar (ignored for other actions)
   * * `neighbor_count` - Number of valid neighbors
   * * `result_count` - Number of bases found/destroyed (proven by ZK circuit)
   * * `proof_bytes` - UltraHonk proof bytes
   * 
   * # Returns
   * * `u32` - The result count (bases found/destroyed)
   */
  execute_action: ({session_id, player, action_type, target_id, neighbors, neighbor_count, result_count, proof_bytes}: {session_id: u32, player: string, action_type: u32, target_id: u32, neighbors: Array<u32>, neighbor_count: u32, result_count: u32, proof_bytes: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<u32>>>

  /**
   * Construct and simulate a get_found_count transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get a player's found base count.
   */
  get_found_count: ({session_id, player}: {session_id: u32, player: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<u32>>>

  /**
   * Construct and simulate a get_current_turn transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get the current turn for a game.
   */
  get_current_turn: ({session_id}: {session_id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<string>>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
        /** Constructor/Initialization Args for the contract's `__constructor` method */
        {admin, game_hub, vk_bytes}: {admin: string, game_hub: string, vk_bytes: Buffer},
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy({admin, game_hub, vk_bytes}, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAQAAAAAAAAAAAAAABEdhbWUAAAAOAAAALVdob3NlIHR1cm4gaXMgaXQgKHBsYXllcjEgb3IgcGxheWVyMiBhZGRyZXNzKQAAAAAAAAxjdXJyZW50X3R1cm4AAAATAAAAAAAAAAdwbGF5ZXIxAAAAABMAAAAyQXJtcyB0aGF0IHBsYXllcjEgaGFzIHN0cnVjayB3aXRoIEFybSBTdHJpa2UgKDAtOSkAAAAAABNwbGF5ZXIxX2FybXNfc3RydWNrAAAAA+oAAAAEAAAALFBvc2VpZG9uIGhhc2ggb2YgcGxheWVyMSdzIDEwIGJhc2UgbG9jYXRpb25zAAAAEnBsYXllcjFfY29tbWl0bWVudAAAAAAD7gAAACAAAAA0TnVtYmVyIG9mIG9wcG9uZW50IGJhc2VzIHBsYXllcjEgaGFzIGZvdW5kL2Rlc3Ryb3llZAAAAA1wbGF5ZXIxX2ZvdW5kAAAAAAAABAAAAAAAAAAOcGxheWVyMV9wb2ludHMAAAAAAAsAAABJU3RhcnMgdGhhdCBwbGF5ZXIxIGhhcyBzY2FubmVkIHdpdGggU29sYXIgU2NhbiAoc2VhcmNoaW5nIGZvciBQMidzIGJhc2VzKQAAAAAAAA9wbGF5ZXIxX3NjYW5uZWQAAAAD6gAAAAQAAAAAAAAAB3BsYXllcjIAAAAAEwAAADJBcm1zIHRoYXQgcGxheWVyMiBoYXMgc3RydWNrIHdpdGggQXJtIFN0cmlrZSAoMC05KQAAAAAAE3BsYXllcjJfYXJtc19zdHJ1Y2sAAAAD6gAAAAQAAAAsUG9zZWlkb24gaGFzaCBvZiBwbGF5ZXIyJ3MgMTAgYmFzZSBsb2NhdGlvbnMAAAAScGxheWVyMl9jb21taXRtZW50AAAAAAPuAAAAIAAAADROdW1iZXIgb2Ygb3Bwb25lbnQgYmFzZXMgcGxheWVyMiBoYXMgZm91bmQvZGVzdHJveWVkAAAADXBsYXllcjJfZm91bmQAAAAAAAAEAAAAAAAAAA5wbGF5ZXIyX3BvaW50cwAAAAAACwAAAElTdGFycyB0aGF0IHBsYXllcjIgaGFzIHNjYW5uZWQgd2l0aCBTb2xhciBTY2FuIChzZWFyY2hpbmcgZm9yIFAxJ3MgYmFzZXMpAAAAAAAAD3BsYXllcjJfc2Nhbm5lZAAAAAPqAAAABAAAABdXaW5uZXIgKG9uY2UgZ2FtZSBlbmRzKQAAAAAGd2lubmVyAAAAAAPoAAAAEw==",
        "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAADwAAAAAAAAAMR2FtZU5vdEZvdW5kAAAAAQAAAAAAAAAJTm90UGxheWVyAAAAAAAAAgAAAAAAAAALTm90WW91clR1cm4AAAAAAwAAAAAAAAAQR2FtZUFscmVhZHlFbmRlZAAAAAQAAAAAAAAADEludmFsaWRQcm9vZgAAAAUAAAAAAAAAF1Byb29mVmVyaWZpY2F0aW9uRmFpbGVkAAAAAAYAAAAAAAAAElN0YXJBbHJlYWR5U2Nhbm5lZAAAAAAABwAAAAAAAAANSW52YWxpZFN0YXJJZAAAAAAAAAgAAAAAAAAACFZrTm90U2V0AAAACQAAAAAAAAAMVmtQYXJzZUVycm9yAAAACgAAAAAAAAASQ29tbWl0bWVudE1pc21hdGNoAAAAAAALAAAAAAAAAAxHYW1lTm90UmVhZHkAAAAMAAAAAAAAABFJbnZhbGlkQWN0aW9uVHlwZQAAAAAAAA0AAAAAAAAAEEFybUFscmVhZHlTdHJ1Y2sAAAAOAAAAAAAAABJJbnZhbGlkUmVzdWx0Q291bnQAAAAAAA8=",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABAAAAAEAAAAAAAAABEdhbWUAAAABAAAABAAAAAAAAAAAAAAADkdhbWVIdWJBZGRyZXNzAAAAAAAAAAAAAAAAAAVBZG1pbgAAAAAAAAAAAAA2VmVyaWZpY2F0aW9uIGtleSBmb3IgWksgcHJvb2ZzIChzdG9yZWQgb25jZSBhdCBkZXBsb3kpAAAAAAAPVmVyaWZpY2F0aW9uS2V5AA==",
        "AAAAAAAAAEJMZWdhY3kgc2NhbiBmdW5jdGlvbiBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHkgKFNvbGFyIFNjYW4gb25seSkAAAAAAARzY2FuAAAABQAAAAAAAAAKc2Vzc2lvbl9pZAAAAAAABAAAAAAAAAAGcGxheWVyAAAAAAATAAAAAAAAAAt0YXJnZXRfc3RhcgAAAAAEAAAAAAAAAAtwcm9vZl9ieXRlcwAAAAAOAAAAAAAAAAdpc19iYXNlAAAAAAEAAAABAAAD6QAAAAEAAAAD",
        "AAAAAAAAAClVcGRhdGUgdGhlIHZlcmlmaWNhdGlvbiBrZXkgKGFkbWluIG9ubHkpLgAAAAAAAAZzZXRfdmsAAAAAAAEAAAAAAAAACHZrX2J5dGVzAAAADgAAAAA=",
        "AAAAAAAAACFHZXQgdGhlIEdhbWVIdWIgY29udHJhY3QgYWRkcmVzcy4AAAAAAAAHZ2V0X2h1YgAAAAAAAAAAAQAAABM=",
        "AAAAAAAAACNTZXQgYSBuZXcgR2FtZUh1YiBjb250cmFjdCBhZGRyZXNzLgAAAAAHc2V0X2h1YgAAAAABAAAAAAAAAAduZXdfaHViAAAAABMAAAAA",
        "AAAAAAAAABpVcGdyYWRlIHRoZSBjb250cmFjdCBXQVNNLgAAAAAAB3VwZ3JhZGUAAAAAAQAAAAAAAAANbmV3X3dhc21faGFzaAAAAAAAA+4AAAAgAAAAAA==",
        "AAAAAAAAAA9HZXQgZ2FtZSBzdGF0ZS4AAAAACGdldF9nYW1lAAAAAQAAAAAAAAAKc2Vzc2lvbl9pZAAAAAAABAAAAAEAAAPpAAAH0AAAAARHYW1lAAAAAw==",
        "AAAAAAAAAB5HZXQgdGhlIGN1cnJlbnQgYWRtaW4gYWRkcmVzcy4AAAAAAAlnZXRfYWRtaW4AAAAAAAAAAAAAAQAAABM=",
        "AAAAAAAAABxHZXQgYSBwbGF5ZXIncyBzY2FuIGhpc3RvcnkuAAAACWdldF9zY2FucwAAAAAAAAIAAAAAAAAACnNlc3Npb25faWQAAAAAAAQAAAAAAAAABnBsYXllcgAAAAAAEwAAAAEAAAPpAAAD6gAAAAQAAAAD",
        "AAAAAAAAABhTZXQgYSBuZXcgYWRtaW4gYWRkcmVzcy4AAAAJc2V0X2FkbWluAAAAAAAAAQAAAAAAAAAJbmV3X2FkbWluAAAAAAAAEwAAAAA=",
        "AAAAAAAAAfpTdGFydCBhIG5ldyBnYW1lIGJldHdlZW4gdHdvIHBsYXllcnMuCgpCb3RoIHBsYXllcnMgbXVzdCBzdWJtaXQgdGhlaXIgYmFzZSBjb21taXRtZW50cyAoUG9zZWlkb24gaGFzaCBvZiAxMCBzdGFyIElEcykuClBsYXllcjEgZ29lcyBmaXJzdC4KCiMgQXJndW1lbnRzCiogYHNlc3Npb25faWRgIC0gVW5pcXVlIHNlc3Npb24gaWRlbnRpZmllcgoqIGBwbGF5ZXIxYCAtIEFkZHJlc3Mgb2YgZmlyc3QgcGxheWVyIChnb2VzIGZpcnN0KQoqIGBwbGF5ZXIyYCAtIEFkZHJlc3Mgb2Ygc2Vjb25kIHBsYXllcgoqIGBwbGF5ZXIxX3BvaW50c2AgLSBQb2ludHMgY29tbWl0dGVkIGJ5IHBsYXllciAxCiogYHBsYXllcjJfcG9pbnRzYCAtIFBvaW50cyBjb21taXR0ZWQgYnkgcGxheWVyIDIKKiBgcGxheWVyMV9jb21taXRtZW50YCAtIFBvc2VpZG9uIGhhc2ggb2YgcGxheWVyMSdzIDEwIGJhc2VzCiogYHBsYXllcjJfY29tbWl0bWVudGAgLSBQb3NlaWRvbiBoYXNoIG9mIHBsYXllcjIncyAxMCBiYXNlcwAAAAAACnN0YXJ0X2dhbWUAAAAAAAcAAAAAAAAACnNlc3Npb25faWQAAAAAAAQAAAAAAAAAB3BsYXllcjEAAAAAEwAAAAAAAAAHcGxheWVyMgAAAAATAAAAAAAAAA5wbGF5ZXIxX3BvaW50cwAAAAAACwAAAAAAAAAOcGxheWVyMl9wb2ludHMAAAAAAAsAAAAAAAAAEnBsYXllcjFfY29tbWl0bWVudAAAAAAD7gAAACAAAAAAAAAAEnBsYXllcjJfY29tbWl0bWVudAAAAAAD7gAAACAAAAABAAAD6QAAAAIAAAAD",
        "AAAAAAAAAPNJbml0aWFsaXplIHRoZSBjb250cmFjdCB3aXRoIGFkbWluLCBHYW1lSHViIGFkZHJlc3MsIGFuZCBaSyB2ZXJpZmljYXRpb24ga2V5LgoKIyBBcmd1bWVudHMKKiBgYWRtaW5gIC0gQWRtaW4gYWRkcmVzcyAoY2FuIHVwZ3JhZGUgY29udHJhY3QpCiogYGdhbWVfaHViYCAtIEFkZHJlc3Mgb2YgdGhlIEdhbWVIdWIgY29udHJhY3QKKiBgdmtfYnl0ZXNgIC0gVmVyaWZpY2F0aW9uIGtleSBieXRlcyBmb3IgdGhlIFpLIGNpcmN1aXQAAAAADV9fY29uc3RydWN0b3IAAAAAAAADAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAACGdhbWVfaHViAAAAEwAAAAAAAAAIdmtfYnl0ZXMAAAAOAAAAAA==",
        "AAAAAAAAAzxFeGVjdXRlIGFuIGFjdGlvbiBhZ2FpbnN0IG9wcG9uZW50J3MgYmFzZXMuCgpUaGUgcGxheWVyIG11c3QgcHJvdmlkZSBhIFpLIHByb29mIHRoYXQgcHJvdmVzIHRoZSByZXN1bHQgb2YgdGhlaXIgYWN0aW9uLgoKIyBBY3Rpb24gVHlwZXM6CiogMCA9IFNvbGFyIFNjYW46IFByZWNpc2lvbiBzY2FuIG9mIGEgc2luZ2xlIHN0YXIgKHJldHVybnMgMCBvciAxKQoqIDEgPSBEZWVwIFJhZGFyOiBTY2FuIHJhZGl1cyBhcm91bmQgc3RhciwgcmV0dXJucyBjb3VudCBvZiBiYXNlcyBuZWFyYnkgKDAtMTApCiogMiA9IEFybSBTdHJpa2U6IERlc3Ryb3kgZW50aXJlIHNwaXJhbCBhcm0sIHJldHVybnMgY291bnQgZGVzdHJveWVkICgwLTEwKQoKIyBBcmd1bWVudHMKKiBgc2Vzc2lvbl9pZGAgLSBHYW1lIHNlc3Npb24gSUQKKiBgcGxheWVyYCAtIEFkZHJlc3Mgb2YgYWN0aW5nIHBsYXllcgoqIGBhY3Rpb25fdHlwZWAgLSBUeXBlIG9mIGFjdGlvbiAoMCwgMSwgb3IgMikKKiBgdGFyZ2V0X2lkYCAtIFRhcmdldCBzdGFyIElEICgwLTE5OSkKKiBgbmVpZ2hib3JzYCAtIE5laWdoYm9yIHN0YXIgSURzIGZvciBEZWVwIFJhZGFyIChpZ25vcmVkIGZvciBvdGhlciBhY3Rpb25zKQoqIGBuZWlnaGJvcl9jb3VudGAgLSBOdW1iZXIgb2YgdmFsaWQgbmVpZ2hib3JzCiogYHJlc3VsdF9jb3VudGAgLSBOdW1iZXIgb2YgYmFzZXMgZm91bmQvZGVzdHJveWVkIChwcm92ZW4gYnkgWksgY2lyY3VpdCkKKiBgcHJvb2ZfYnl0ZXNgIC0gVWx0cmFIb25rIHByb29mIGJ5dGVzCgojIFJldHVybnMKKiBgdTMyYCAtIFRoZSByZXN1bHQgY291bnQgKGJhc2VzIGZvdW5kL2Rlc3Ryb3llZCkAAAAOZXhlY3V0ZV9hY3Rpb24AAAAAAAgAAAAAAAAACnNlc3Npb25faWQAAAAAAAQAAAAAAAAABnBsYXllcgAAAAAAEwAAAAAAAAALYWN0aW9uX3R5cGUAAAAABAAAAAAAAAAJdGFyZ2V0X2lkAAAAAAAABAAAAAAAAAAJbmVpZ2hib3JzAAAAAAAD6gAAAAQAAAAAAAAADm5laWdoYm9yX2NvdW50AAAAAAAEAAAAAAAAAAxyZXN1bHRfY291bnQAAAAEAAAAAAAAAAtwcm9vZl9ieXRlcwAAAAAOAAAAAQAAA+kAAAAEAAAAAw==",
        "AAAAAAAAACBHZXQgYSBwbGF5ZXIncyBmb3VuZCBiYXNlIGNvdW50LgAAAA9nZXRfZm91bmRfY291bnQAAAAAAgAAAAAAAAAKc2Vzc2lvbl9pZAAAAAAABAAAAAAAAAAGcGxheWVyAAAAAAATAAAAAQAAA+kAAAAEAAAAAw==",
        "AAAAAAAAACBHZXQgdGhlIGN1cnJlbnQgdHVybiBmb3IgYSBnYW1lLgAAABBnZXRfY3VycmVudF90dXJuAAAAAQAAAAAAAAAKc2Vzc2lvbl9pZAAAAAAABAAAAAEAAAPpAAAAEwAAAAM=" ]),
      options
    )
  }
  public readonly fromJSON = {
    scan: this.txFromJSON<Result<boolean>>,
        set_vk: this.txFromJSON<null>,
        get_hub: this.txFromJSON<string>,
        set_hub: this.txFromJSON<null>,
        upgrade: this.txFromJSON<null>,
        get_game: this.txFromJSON<Result<Game>>,
        get_admin: this.txFromJSON<string>,
        get_scans: this.txFromJSON<Result<Array<u32>>>,
        set_admin: this.txFromJSON<null>,
        start_game: this.txFromJSON<Result<void>>,
        execute_action: this.txFromJSON<Result<u32>>,
        get_found_count: this.txFromJSON<Result<u32>>,
        get_current_turn: this.txFromJSON<Result<string>>
  }
}