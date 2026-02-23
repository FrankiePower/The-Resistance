/**
 * ZK Utilities for The Resistance
 *
 * This module handles:
 * - Poseidon2 hashing of base locations (commitment)
 * - ZK proof generation for game actions
 *
 * Uses @noir-lang/noir_js for circuit execution and @aztec/bb.js for proving
 */

import { Noir } from '@noir-lang/noir_js';
import { UltraHonkBackend } from '@aztec/bb.js';
import { Barretenberg, Fr } from '@aztec/bb.js';

// Circuit configuration
const CIRCUIT_PATH = '/circuits.json';
const MAX_NEIGHBORS = 20;

// Singleton instances
let noirInstance: Noir | null = null;
let backendInstance: UltraHonkBackend | null = null;
let bbInstance: Barretenberg | null = null;

// Action types (must match circuit)
export const ACTION_SOLAR_SCAN = 0;
export const ACTION_DEEP_RADAR = 1;
export const ACTION_ARM_STRIKE = 2;

export type ActionType = 0 | 1 | 2;

/**
 * Initialize the ZK prover (loads circuit and sets up backend)
 * Call this once at app startup
 */
export async function initZK(): Promise<void> {
  if (noirInstance && backendInstance) {
    console.log('[ZK] Already initialized');
    return;
  }

  console.log('[ZK] Initializing...');

  try {
    // Load compiled circuit
    const response = await fetch(CIRCUIT_PATH);
    if (!response.ok) {
      throw new Error(`Failed to load circuit: ${response.statusText}`);
    }
    const circuit = await response.json();
    console.log('[ZK] Circuit loaded');

    // Initialize Noir
    noirInstance = new Noir(circuit);
    console.log('[ZK] Noir initialized');

    // Initialize UltraHonk backend
    backendInstance = new UltraHonkBackend(circuit.bytecode);
    console.log('[ZK] Backend initialized');

    // Initialize Barretenberg for hashing
    bbInstance = await Barretenberg.new();
    console.log('[ZK] Barretenberg initialized');

    console.log('[ZK] ✓ Initialization complete');
  } catch (err) {
    console.error('[ZK] Initialization failed:', err);
    throw err;
  }
}

/**
 * Compute Poseidon2 hash of base locations
 * This creates the commitment that gets stored on-chain
 */
export async function hashBases(bases: number[]): Promise<string> {
  if (!bbInstance) {
    await initZK();
  }

  if (bases.length !== 10) {
    throw new Error('Must provide exactly 10 bases');
  }

  // Sort bases for deterministic hashing
  const sortedBases = [...bases].sort((a, b) => a - b);

  // Convert to Field elements
  const baseFields = sortedBases.map(b => new Fr(BigInt(b)));

  // Compute Poseidon2 hash
  const hash = await bbInstance!.poseidon2Hash(baseFields);

  console.log('[ZK] Generated commitment for bases:', sortedBases);
  console.log('[ZK] Commitment hash:', hash.toString());

  return hash.toString();
}

// Proof generation types
export interface ActionProofInputs {
  bases: number[];           // Private: Your 10 base star IDs
  basesHash: string;         // Public: Commitment hash
  actionType: ActionType;    // Public: 0, 1, or 2
  targetId: number;          // Public: Target star ID
  neighbors: number[];       // Public: Neighbor IDs for Deep Radar
}

export interface ActionProof {
  proofBytes: Uint8Array;    // The actual proof
  resultCount: number;       // Number of bases found/destroyed (public output)
}

/**
 * Generate a ZK proof for a game action
 *
 * This proves:
 * 1. You know the bases matching the commitment
 * 2. The result count is correct for the given action
 *
 * Without revealing which stars are bases.
 */
export async function generateActionProof(inputs: ActionProofInputs): Promise<ActionProof> {
  if (!noirInstance || !backendInstance) {
    await initZK();
  }

  console.log('[ZK] Generating proof for action:', {
    actionType: inputs.actionType,
    targetId: inputs.targetId,
    basesHash: inputs.basesHash.slice(0, 20) + '...'
  });

  // Sort bases to match commitment
  const sortedBases = [...inputs.bases].sort((a, b) => a - b);

  // Pad neighbors to MAX_NEIGHBORS
  const paddedNeighbors: number[] = new Array(MAX_NEIGHBORS).fill(0);
  for (let i = 0; i < Math.min(inputs.neighbors.length, MAX_NEIGHBORS); i++) {
    paddedNeighbors[i] = inputs.neighbors[i];
  }

  // Build circuit inputs
  const circuitInputs = {
    bases: sortedBases.map(b => b.toString()),
    bases_hash: inputs.basesHash,
    action_type: inputs.actionType.toString(),
    target_id: inputs.targetId.toString(),
    neighbors: paddedNeighbors.map(n => n.toString()),
    neighbor_count: inputs.neighbors.length.toString(),
  };

  console.log('[ZK] Circuit inputs prepared');

  try {
    // Execute circuit to get witness and return value
    const { witness, returnValue } = await noirInstance!.execute(circuitInputs);
    console.log('[ZK] Circuit executed, result:', returnValue);

    // Extract result count from return value
    const resultCount = typeof returnValue === 'string'
      ? parseInt(returnValue, 16)
      : Number(returnValue);

    // Must use keccak mode to match on-chain UltraHonk verifier transcript.
    console.log('[ZK] Generating proof (keccak mode)...');
    const proof = await backendInstance!.generateProof(witness, { keccak: true });
    console.log('[ZK] Proof generated, size:', proof.proof.length);

    return {
      proofBytes: proof.proof,
      resultCount,
    };
  } catch (err) {
    console.error('[ZK] Proof generation failed:', err);
    throw err;
  }
}

/**
 * Verify a proof locally (for testing)
 */
export async function verifyProof(proof: Uint8Array): Promise<boolean> {
  if (!backendInstance) {
    await initZK();
  }

  try {
    const isValid = await backendInstance!.verifyProof({ proof, publicInputs: [] }, { keccak: true });
    console.log('[ZK] Proof verification:', isValid ? 'VALID' : 'INVALID');
    return isValid;
  } catch (err) {
    console.error('[ZK] Proof verification failed:', err);
    return false;
  }
}

/**
 * Convert proof bytes to hex string for contract submission
 */
export function proofToHex(proof: Uint8Array): string {
  return Array.from(proof)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to proof bytes
 */
export function hexToProof(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Convert a 32-byte hash to the format expected by the contract (BytesN<32>)
 */
export function hashToBytes32(hashHex: string): Uint8Array {
  const cleanHex = hashHex.startsWith('0x') ? hashHex.slice(2) : hashHex;
  const paddedHex = cleanHex.padStart(64, '0');
  return hexToProof(paddedHex);
}

/**
 * Cleanup resources (call on app unmount if needed)
 */
export async function destroyZK(): Promise<void> {
  if (backendInstance) {
    await backendInstance.destroy();
    backendInstance = null;
  }
  if (bbInstance) {
    await bbInstance.destroy();
    bbInstance = null;
  }
  noirInstance = null;
  console.log('[ZK] Resources cleaned up');
}
