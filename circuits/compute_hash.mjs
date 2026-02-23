// Compute Poseidon2 hash of bases for Prover.toml
import { Barretenberg, Fr } from '@aztec/bb.js';

async function main() {
  // Initialize Barretenberg
  const api = await Barretenberg.new();

  // Our test bases: base at star 42, rest at 0
  const bases = [42, 0, 0, 0, 0, 0, 0, 0, 0, 0];

  // Convert to Field elements
  const baseFields = bases.map(b => new Fr(BigInt(b)));

  // Compute Poseidon2 hash
  const hash = await api.poseidon2Hash(baseFields);

  console.log("Bases:", bases);
  console.log("Hash (hex):", hash.toString());
  console.log("\nFor Prover.toml:");
  console.log(`bases_hash = "${hash.toString()}"`);

  await api.destroy();
}

main().catch(console.error);
