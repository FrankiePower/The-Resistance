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


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CAAFND6VG2X6SDZPXV6AG2HOX4HJI2DQ57IHT2G44WFKUDW2RRIMAM5T",
  }
} as const


export interface Game {
  /**
 * Whose turn is it (player1 or player2 address)
 */
current_turn: string;
  player1: string;
  /**
 * Poseidon hash of player1's 10 base locations
 */
player1_commitment: Buffer;
  /**
 * Number of opponent bases player1 has found
 */
player1_found: u32;
  player1_points: i128;
  /**
 * Stars that player1 has scanned (searching for P2's bases)
 */
player1_scanned: Array<u32>;
  player2: string;
  /**
 * Poseidon hash of player2's 10 base locations
 */
player2_commitment: Buffer;
  /**
 * Number of opponent bases player2 has found
 */
player2_found: u32;
  player2_points: i128;
  /**
 * Stars that player2 has scanned (searching for P1's bases)
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
  12: {message:"GameNotReady"}
}

export type DataKey = {tag: "Game", values: readonly [u32]} | {tag: "GameHubAddress", values: void} | {tag: "Admin", values: void} | {tag: "VerificationKey", values: void};

export interface Client {
  /**
   * Construct and simulate a scan transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Scan a star to check if it's an opponent's base.
   * 
   * The player must provide a ZK proof that proves:
   * 1. They know the opponent's base commitment (matches stored hash)
   * 2. The target star is/isn't one of those bases
   * 
   * # Arguments
   * * `session_id` - Game session ID
   * * `player` - Address of scanning player
   * * `target_star` - Star ID being scanned (0-199)
   * * `proof_bytes` - UltraHonk proof bytes
   * * `is_base` - Whether the target is a base (proven by ZK circuit)
   * 
   * # Returns
   * * `bool` - True if a base was found
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
      new ContractSpec([ "AAAAAQAAAAAAAAAAAAAABEdhbWUAAAAMAAAALVdob3NlIHR1cm4gaXMgaXQgKHBsYXllcjEgb3IgcGxheWVyMiBhZGRyZXNzKQAAAAAAAAxjdXJyZW50X3R1cm4AAAATAAAAAAAAAAdwbGF5ZXIxAAAAABMAAAAsUG9zZWlkb24gaGFzaCBvZiBwbGF5ZXIxJ3MgMTAgYmFzZSBsb2NhdGlvbnMAAAAScGxheWVyMV9jb21taXRtZW50AAAAAAPuAAAAIAAAACpOdW1iZXIgb2Ygb3Bwb25lbnQgYmFzZXMgcGxheWVyMSBoYXMgZm91bmQAAAAAAA1wbGF5ZXIxX2ZvdW5kAAAAAAAABAAAAAAAAAAOcGxheWVyMV9wb2ludHMAAAAAAAsAAAA5U3RhcnMgdGhhdCBwbGF5ZXIxIGhhcyBzY2FubmVkIChzZWFyY2hpbmcgZm9yIFAyJ3MgYmFzZXMpAAAAAAAAD3BsYXllcjFfc2Nhbm5lZAAAAAPqAAAABAAAAAAAAAAHcGxheWVyMgAAAAATAAAALFBvc2VpZG9uIGhhc2ggb2YgcGxheWVyMidzIDEwIGJhc2UgbG9jYXRpb25zAAAAEnBsYXllcjJfY29tbWl0bWVudAAAAAAD7gAAACAAAAAqTnVtYmVyIG9mIG9wcG9uZW50IGJhc2VzIHBsYXllcjIgaGFzIGZvdW5kAAAAAAANcGxheWVyMl9mb3VuZAAAAAAAAAQAAAAAAAAADnBsYXllcjJfcG9pbnRzAAAAAAALAAAAOVN0YXJzIHRoYXQgcGxheWVyMiBoYXMgc2Nhbm5lZCAoc2VhcmNoaW5nIGZvciBQMSdzIGJhc2VzKQAAAAAAAA9wbGF5ZXIyX3NjYW5uZWQAAAAD6gAAAAQAAAAXV2lubmVyIChvbmNlIGdhbWUgZW5kcykAAAAABndpbm5lcgAAAAAD6AAAABM=",
        "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAADAAAAAAAAAAMR2FtZU5vdEZvdW5kAAAAAQAAAAAAAAAJTm90UGxheWVyAAAAAAAAAgAAAAAAAAALTm90WW91clR1cm4AAAAAAwAAAAAAAAAQR2FtZUFscmVhZHlFbmRlZAAAAAQAAAAAAAAADEludmFsaWRQcm9vZgAAAAUAAAAAAAAAF1Byb29mVmVyaWZpY2F0aW9uRmFpbGVkAAAAAAYAAAAAAAAAElN0YXJBbHJlYWR5U2Nhbm5lZAAAAAAABwAAAAAAAAANSW52YWxpZFN0YXJJZAAAAAAAAAgAAAAAAAAACFZrTm90U2V0AAAACQAAAAAAAAAMVmtQYXJzZUVycm9yAAAACgAAAAAAAAASQ29tbWl0bWVudE1pc21hdGNoAAAAAAALAAAAAAAAAAxHYW1lTm90UmVhZHkAAAAM",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABAAAAAEAAAAAAAAABEdhbWUAAAABAAAABAAAAAAAAAAAAAAADkdhbWVIdWJBZGRyZXNzAAAAAAAAAAAAAAAAAAVBZG1pbgAAAAAAAAAAAAA2VmVyaWZpY2F0aW9uIGtleSBmb3IgWksgcHJvb2ZzIChzdG9yZWQgb25jZSBhdCBkZXBsb3kpAAAAAAAPVmVyaWZpY2F0aW9uS2V5AA==",
        "AAAAAAAAAfFTY2FuIGEgc3RhciB0byBjaGVjayBpZiBpdCdzIGFuIG9wcG9uZW50J3MgYmFzZS4KClRoZSBwbGF5ZXIgbXVzdCBwcm92aWRlIGEgWksgcHJvb2YgdGhhdCBwcm92ZXM6CjEuIFRoZXkga25vdyB0aGUgb3Bwb25lbnQncyBiYXNlIGNvbW1pdG1lbnQgKG1hdGNoZXMgc3RvcmVkIGhhc2gpCjIuIFRoZSB0YXJnZXQgc3RhciBpcy9pc24ndCBvbmUgb2YgdGhvc2UgYmFzZXMKCiMgQXJndW1lbnRzCiogYHNlc3Npb25faWRgIC0gR2FtZSBzZXNzaW9uIElECiogYHBsYXllcmAgLSBBZGRyZXNzIG9mIHNjYW5uaW5nIHBsYXllcgoqIGB0YXJnZXRfc3RhcmAgLSBTdGFyIElEIGJlaW5nIHNjYW5uZWQgKDAtMTk5KQoqIGBwcm9vZl9ieXRlc2AgLSBVbHRyYUhvbmsgcHJvb2YgYnl0ZXMKKiBgaXNfYmFzZWAgLSBXaGV0aGVyIHRoZSB0YXJnZXQgaXMgYSBiYXNlIChwcm92ZW4gYnkgWksgY2lyY3VpdCkKCiMgUmV0dXJucwoqIGBib29sYCAtIFRydWUgaWYgYSBiYXNlIHdhcyBmb3VuZAAAAAAAAARzY2FuAAAABQAAAAAAAAAKc2Vzc2lvbl9pZAAAAAAABAAAAAAAAAAGcGxheWVyAAAAAAATAAAAAAAAAAt0YXJnZXRfc3RhcgAAAAAEAAAAAAAAAAtwcm9vZl9ieXRlcwAAAAAOAAAAAAAAAAdpc19iYXNlAAAAAAEAAAABAAAD6QAAAAEAAAAD",
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
        get_found_count: this.txFromJSON<Result<u32>>,
        get_current_turn: this.txFromJSON<Result<string>>
  }
}