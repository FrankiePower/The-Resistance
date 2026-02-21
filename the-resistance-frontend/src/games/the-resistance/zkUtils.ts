/**
 * ZK Utilities
 *
 * This module handles:
 * - Poseidon2 hashing of base locations (commitment)
 * - ZK proof generation for scans
 *
 * Note: Full ZK proof generation requires @aztec/bb.js and the compiled circuit.
 * For now, we provide mock implementations that can be replaced later.
 */

// Mock Poseidon2 hash implementation
// In production, this would use the actual Poseidon2 hash function
// from @aztec/bb.js or a compatible library
export async function hashBases(bases: number[]): Promise<string> {
  // Sort bases for deterministic hashing
  const sortedBases = [...bases].sort((a, b) => a - b);

  // For now, use a simple hash (will be replaced with actual Poseidon2)
  // This is just for UI development - the actual commitment will use Poseidon2
  const encoder = new TextEncoder();
  const data = encoder.encode(sortedBases.join(','));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  console.log('[ZK] Generated mock commitment for bases:', sortedBases);
  console.log('[ZK] Commitment hash:', hashHex);

  return hashHex;
}

// Proof generation types
export interface ScanProofInputs {
  bases: number[];           // Private: Your base locations
  basesHash: string;         // Public: Commitment hash
  targetStar: number;        // Public: Star being scanned
}

export interface ScanProof {
  proofBytes: Uint8Array;    // The actual proof
  isBase: boolean;           // Whether target is a base (public output)
}

/**
 * Generate a ZK proof for scanning a star
 *
 * This proves:
 * 1. You know the preimage (base locations) of the commitment
 * 2. The target star is/isn't one of those bases
 *
 * Without revealing which other stars are bases.
 */
export async function generateScanProof(inputs: ScanProofInputs): Promise<ScanProof> {
  console.log('[ZK] Generating proof for scan:', {
    targetStar: inputs.targetStar,
    basesHash: inputs.basesHash.slice(0, 16) + '...'
  });

  // Check if target is a base
  const isBase = inputs.bases.includes(inputs.targetStar);

  // TODO: Replace with actual proof generation using @aztec/bb.js
  // For now, return a mock proof
  await simulateProofGeneration();

  const mockProof = new Uint8Array(14592); // PROOF_BYTES = 456 * 32
  crypto.getRandomValues(mockProof);

  console.log('[ZK] Proof generated:', {
    isBase,
    proofSize: mockProof.length
  });

  return {
    proofBytes: mockProof,
    isBase
  };
}

/**
 * Simulate proof generation time
 */
async function simulateProofGeneration(): Promise<void> {
  // Simulate the time it takes to generate a real proof
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500));
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
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Convert a 32-byte hash to the format expected by the contract (BytesN<32>)
 */
export function hashToBytes32(hashHex: string): Uint8Array {
  // Remove 0x prefix if present
  const cleanHex = hashHex.startsWith('0x') ? hashHex.slice(2) : hashHex;

  // Pad to 64 chars (32 bytes)
  const paddedHex = cleanHex.padStart(64, '0');

  return hexToProof(paddedHex);
}
