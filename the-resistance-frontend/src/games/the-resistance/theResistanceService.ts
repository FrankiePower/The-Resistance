/**
 * The Resistance - Contract Service
 * Handles all on-chain interactions for the ZK game
 */

import { Client as TheResistanceClient, type Game } from './bindings';
import { NETWORK_PASSPHRASE, RPC_URL, DEFAULT_METHOD_OPTIONS, DEFAULT_AUTH_TTL_MINUTES } from '@/utils/constants';
import { contract } from '@stellar/stellar-sdk';
import { Buffer } from 'buffer';
import { signAndSendViaLaunchtube } from '@/utils/transactionHelper';
import { calculateValidUntilLedger } from '@/utils/ledgerUtils';

type ClientOptions = contract.ClientOptions;

/**
 * Service for interacting with The Resistance game contract
 */
export class TheResistanceService {
  private baseClient: TheResistanceClient;
  private contractId: string;

  constructor(contractId: string) {
    this.contractId = contractId;
    // Base client for read-only operations
    this.baseClient = new TheResistanceClient({
      contractId: this.contractId,
      networkPassphrase: NETWORK_PASSPHRASE,
      rpcUrl: RPC_URL,
    });
  }

  /**
   * Create a client with signing capabilities
   */
  private createSigningClient(
    publicKey: string,
    signer: Pick<contract.ClientOptions, 'signTransaction' | 'signAuthEntry'>
  ): TheResistanceClient {
    const options: ClientOptions = {
      contractId: this.contractId,
      networkPassphrase: NETWORK_PASSPHRASE,
      rpcUrl: RPC_URL,
      publicKey,
      ...signer,
    };
    return new TheResistanceClient(options);
  }

  /**
   * Get game state
   * Returns null if game doesn't exist
   */
  async getGame(sessionId: number): Promise<Game | null> {
    try {
      const tx = await this.baseClient.get_game({ session_id: sessionId });
      const result = await tx.simulate();

      if (result.result.isOk()) {
        return result.result.unwrap();
      } else {
        console.log('[getGame] Game not found for session:', sessionId);
        return null;
      }
    } catch (err) {
      console.log('[getGame] Error querying game:', err);
      return null;
    }
  }

  /**
   * Start a new game between two players
   * Both players must provide their base commitments (Poseidon hash of 10 star IDs)
   */
  async startGame(
    sessionId: number,
    player1: string,
    player2: string,
    player1Points: bigint,
    player2Points: bigint,
    player1Commitment: Buffer,
    player2Commitment: Buffer,
    signer: Pick<contract.ClientOptions, 'signTransaction' | 'signAuthEntry'>,
    authTtlMinutes?: number
  ) {
    const client = this.createSigningClient(player1, signer);
    const tx = await client.start_game({
      session_id: sessionId,
      player1,
      player2,
      player1_points: player1Points,
      player2_points: player2Points,
      player1_commitment: player1Commitment,
      player2_commitment: player2Commitment,
    }, DEFAULT_METHOD_OPTIONS);

    const validUntilLedgerSeq = authTtlMinutes
      ? await calculateValidUntilLedger(RPC_URL, authTtlMinutes)
      : await calculateValidUntilLedger(RPC_URL, DEFAULT_AUTH_TTL_MINUTES);

    const sentTx = await signAndSendViaLaunchtube(
      tx,
      DEFAULT_METHOD_OPTIONS.timeoutInSeconds,
      validUntilLedgerSeq
    );
    return sentTx.result;
  }

  /**
   * Execute an action against opponent's bases with ZK proof
   *
   * Action types:
   * - 0: Solar Scan (precision strike on single star)
   * - 1: Deep Radar (count bases in radius)
   * - 2: Arm Strike (destroy entire spiral arm)
   */
  async executeAction(
    sessionId: number,
    playerAddress: string,
    actionType: number,
    targetId: number,
    neighbors: number[],
    neighborCount: number,
    resultCount: number,
    proofBytes: Uint8Array,
    signer: Pick<contract.ClientOptions, 'signTransaction' | 'signAuthEntry'>,
    authTtlMinutes?: number
  ): Promise<number> {
    const client = this.createSigningClient(playerAddress, signer);

    // Convert proof to Buffer
    const proofBuffer = Buffer.from(proofBytes);

    console.log('[executeAction] Calling contract:', {
      sessionId,
      actionType,
      targetId,
      neighborCount,
      resultCount,
      proofLength: proofBuffer.length,
    });

    const tx = await client.execute_action({
      session_id: sessionId,
      player: playerAddress,
      action_type: actionType,
      target_id: targetId,
      neighbors: neighbors,
      neighbor_count: neighborCount,
      result_count: resultCount,
      proof_bytes: proofBuffer,
    }, DEFAULT_METHOD_OPTIONS);

    const validUntilLedgerSeq = authTtlMinutes
      ? await calculateValidUntilLedger(RPC_URL, authTtlMinutes)
      : await calculateValidUntilLedger(RPC_URL, DEFAULT_AUTH_TTL_MINUTES);

    try {
      const sentTx = await signAndSendViaLaunchtube(
        tx,
        DEFAULT_METHOD_OPTIONS.timeoutInSeconds,
        validUntilLedgerSeq
      );

      if (sentTx.getTransactionResponse?.status === 'FAILED') {
        const errorMessage = this.extractErrorFromDiagnostics(sentTx.getTransactionResponse);
        throw new Error(`Transaction failed: ${errorMessage}`);
      }

      // Result is the count of bases found/destroyed
      return sentTx.result;
    } catch (err) {
      console.error('[executeAction] Error:', err);
      throw err;
    }
  }

  /**
   * Get current turn for a game
   */
  async getCurrentTurn(sessionId: number): Promise<string | null> {
    try {
      const tx = await this.baseClient.get_current_turn({ session_id: sessionId });
      const result = await tx.simulate();

      if (result.result.isOk()) {
        return result.result.unwrap();
      }
      return null;
    } catch (err) {
      console.log('[getCurrentTurn] Error:', err);
      return null;
    }
  }

  /**
   * Get player's found base count
   */
  async getFoundCount(sessionId: number, player: string): Promise<number | null> {
    try {
      const tx = await this.baseClient.get_found_count({ session_id: sessionId, player });
      const result = await tx.simulate();

      if (result.result.isOk()) {
        return result.result.unwrap();
      }
      return null;
    } catch (err) {
      console.log('[getFoundCount] Error:', err);
      return null;
    }
  }

  /**
   * Extract error message from diagnostic events
   */
  private extractErrorFromDiagnostics(transactionResponse: any): string {
    try {
      console.error('Transaction response:', JSON.stringify(transactionResponse, null, 2));

      const status = transactionResponse?.status || 'Unknown';
      return `Transaction ${status}. Check console for details.`;
    } catch (err) {
      console.error('Failed to extract error from diagnostics:', err);
      return 'Transaction failed with unknown error';
    }
  }
}

/**
 * Convert a hex hash string to Buffer for contract calls
 */
export function hashToBuffer(hashHex: string): Buffer {
  const cleanHex = hashHex.startsWith('0x') ? hashHex.slice(2) : hashHex;
  const paddedHex = cleanHex.padStart(64, '0');
  return Buffer.from(paddedHex, 'hex');
}
