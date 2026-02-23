import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { UltraHonkBackend } from '@aztec/bb.js';

async function main() {
  const circuitPath = resolve(process.cwd(), 'public', 'circuits.json');
  const outDir = resolve(process.cwd(), '..', 'circuits', 'target', 'vk');
  const outPath = resolve(outDir, 'vk');

  const circuit = JSON.parse(readFileSync(circuitPath, 'utf8'));
  const backend = new UltraHonkBackend(circuit.bytecode);

  const vk = await backend.getVerificationKey({ keccak: true });
  if (vk.length !== 1760) {
    throw new Error(`Unexpected VK length ${vk.length} (expected 1760 for ultra_keccak_honk)`);
  }
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, Buffer.from(vk));

  await backend.destroy();
  console.log(`Wrote VK (${vk.length} bytes) to ${outPath}`);
}

main().catch((err) => {
  console.error('VK generation failed:', err);
  process.exit(1);
});
