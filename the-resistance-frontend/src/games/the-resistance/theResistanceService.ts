/**
 * The Resistance - Contract Service
 * Handles all on-chain interactions for the ZK game
 */

import { Client as TheResistanceClient, type Game } from './bindings';
import {
  NETWORK_PASSPHRASE,
  RPC_URL,
  DEFAULT_METHOD_OPTIONS,
  DEFAULT_AUTH_TTL_MINUTES,
  MULTI_SIG_AUTH_TTL_MINUTES,
} from '@/utils/constants';
import { Address, authorizeEntry, contract } from '@stellar/stellar-sdk';
import { Buffer } from 'buffer';
import { signAndSendViaLaunchtube } from '@/utils/transactionHelper';
import { calculateValidUntilLedger } from '@/utils/ledgerUtils';
import { injectSignedAuthEntry } from '@/utils/authEntryUtils';

type ClientOptions = contract.ClientOptions;
const ALLOW_HTTP = RPC_URL.startsWith('http://');

/**
 * Service for interacting with The Resistance game contract
 */
export class TheResistanceService {
  private baseClient: TheResistanceClient;
  private contractId: string;

  constructor(contractId: string) {
    this.contractId = contractId;
    console.log('[TheResistanceService] Config', {
      rpcUrl: RPC_URL,
      networkPassphrase: NETWORK_PASSPHRASE,
      contractId: this.contractId,
    });
    // Base client for read-only operations
    this.baseClient = new TheResistanceClient({
      contractId: this.contractId,
      networkPassphrase: NETWORK_PASSPHRASE,
      rpcUrl: RPC_URL,
      allowHttp: ALLOW_HTTP,
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
      allowHttp: ALLOW_HTTP,
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
   * Quickstart flow for local dev:
   * Sign Player 1 auth entry, inject into Player 2 transaction, then submit.
   */
  async startGameQuickstart(
    sessionId: number,
    player1: string,
    player2: string,
    player1Points: bigint,
    player2Points: bigint,
    player1Commitment: Buffer,
    player2Commitment: Buffer,
    player1Signer: Pick<contract.ClientOptions, 'signTransaction' | 'signAuthEntry'>,
    player2Signer: Pick<contract.ClientOptions, 'signTransaction' | 'signAuthEntry'>,
    authTtlMinutes?: number
  ): Promise<{ result: void; txHash: string | null }> {
    const buildClient = new TheResistanceClient({
      contractId: this.contractId,
      networkPassphrase: NETWORK_PASSPHRASE,
      rpcUrl: RPC_URL,
      allowHttp: ALLOW_HTTP,
      publicKey: player2,
    });

    const tx = await buildClient.start_game(
      {
        session_id: sessionId,
        player1,
        player2,
        player1_points: player1Points,
        player2_points: player2Points,
        player1_commitment: player1Commitment,
        player2_commitment: player2Commitment,
      },
      DEFAULT_METHOD_OPTIONS
    );

    const authEntries = tx.simulationData?.result?.auth;
    if (!authEntries?.length) {
      throw new Error('No auth entries found in start_game simulation');
    }

    let player1AuthEntry: (typeof authEntries)[number] | null = null;
    for (const entry of authEntries) {
      try {
        const entryAddress = entry.credentials().address().address();
        const entryAddressString = Address.fromScAddress(entryAddress).toString();
        if (entryAddressString === player1) {
          player1AuthEntry = entry;
          break;
        }
      } catch {
        // Skip non-address credential entries.
      }
    }

    if (!player1AuthEntry) {
      throw new Error(`No auth entry found for Player 1 (${player1})`);
    }

    if (!player1Signer.signAuthEntry) {
      throw new Error('Player 1 signer does not support auth entry signing');
    }
    const signPlayer1AuthEntry = player1Signer.signAuthEntry;

    const authValidUntilLedgerSeq = authTtlMinutes
      ? await calculateValidUntilLedger(RPC_URL, authTtlMinutes)
      : await calculateValidUntilLedger(RPC_URL, MULTI_SIG_AUTH_TTL_MINUTES);

    const player1SignedAuthEntry = await authorizeEntry(
      player1AuthEntry,
      async (preimage) => {
        const signResult = await signPlayer1AuthEntry(preimage.toXDR('base64'), {
          networkPassphrase: NETWORK_PASSPHRASE,
          address: player1,
        });

        if (signResult.error) {
          throw new Error(`Player 1 auth signing failed: ${signResult.error.message}`);
        }

        return Buffer.from(signResult.signedAuthEntry, 'base64');
      },
      authValidUntilLedgerSeq,
      NETWORK_PASSPHRASE
    );

    const txWithInjectedAuth = await injectSignedAuthEntry(
      tx,
      player1SignedAuthEntry.toXDR('base64'),
      player2,
      player2Signer,
      authValidUntilLedgerSeq
    );

    const player2Client = this.createSigningClient(player2, player2Signer);
    const player2Tx = player2Client.txFromXDR(txWithInjectedAuth.toXDR());
    const needsSigning = await player2Tx.needsNonInvokerSigningBy();

    if (needsSigning.includes(player2)) {
      await player2Tx.signAuthEntries({ expiration: authValidUntilLedgerSeq });
    }

    await player2Tx.simulate();

    const finalValidUntilLedgerSeq = await calculateValidUntilLedger(
      RPC_URL,
      DEFAULT_AUTH_TTL_MINUTES
    );

    const sentTx = await signAndSendViaLaunchtube(
      player2Tx,
      DEFAULT_METHOD_OPTIONS.timeoutInSeconds,
      finalValidUntilLedgerSeq
    );
    const txResponse = sentTx.getTransactionResponse as
      | { hash?: string; id?: string; txHash?: string }
      | undefined;
    const txHash = txResponse?.hash || txResponse?.id || txResponse?.txHash || null;
    return { result: sentTx.result, txHash };
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
      rpcUrl: RPC_URL,
      networkPassphrase: NETWORK_PASSPHRASE,
      contractId: this.contractId,
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

      return this.normalizeActionCount(sentTx.result);
    } catch (err) {
      console.error('[executeAction] Error:', err);
      throw err;
    }
  }

  private normalizeActionCount(raw: unknown): number {
    if (typeof raw === 'number') return raw;
    if (typeof raw === 'bigint') return Number(raw);

    if (raw && typeof raw === 'object') {
      const obj = raw as {
        value?: unknown;
        unwrap?: () => unknown;
        isOk?: () => boolean;
      };

      if ('value' in obj) {
        if (typeof obj.value === 'number') return obj.value;
        if (typeof obj.value === 'bigint') return Number(obj.value);
      }

      if (typeof obj.isOk === 'function' && typeof obj.unwrap === 'function' && obj.isOk()) {
        const unwrapped = obj.unwrap();
        if (typeof unwrapped === 'number') return unwrapped;
        if (typeof unwrapped === 'bigint') return Number(unwrapped);
        if (unwrapped && typeof unwrapped === 'object' && 'value' in (unwrapped as { value?: unknown })) {
          const nested = (unwrapped as { value?: unknown }).value;
          if (typeof nested === 'number') return nested;
          if (typeof nested === 'bigint') return Number(nested);
        }
      }
    }

    throw new Error(`Unexpected execute_action result shape: ${String(raw)}`);
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
