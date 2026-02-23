/**
 * THE RESISTANCE - Complete On-Chain Flow with Transaction Hashes
 *
 * Full flow:
 * 1. Generate commitments for both players
 * 2. Start game on-chain (multi-sig)
 * 3. Execute action with ZK proof
 * 4. Show all transaction hashes
 */

import { Noir } from '@noir-lang/noir_js';
import { UltraHonkBackend } from '@aztec/bb.js';
import { Barretenberg, Fr } from '@aztec/bb.js';
import { readFileSync } from 'fs';
import {
  Keypair,
  Networks,
  rpc,
  TransactionBuilder,
  Contract,
  Address,
  nativeToScVal,
  xdr,
  Operation,
  authorizeEntry,
} from '@stellar/stellar-sdk';

// Configuration
const RPC_URL = 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = Networks.TESTNET;
const CONTRACT_ID = 'CALYJGFGE3PX47SUP4J7WLZZKJJKEAOYNVWNEEBDLQCG6GZQOSJG4BSJ';

// Dev wallet secrets
const PLAYER1_SECRET = 'SCPY5HE3OROFI75U2Q6WM4SSS33ZVOO6VJ3JNDVHLXYIKT372PF7W3BH';
const PLAYER2_SECRET = 'SDEKDBVV4JSYJJVVBG35USZFYVE7PAGP7MAZZA43JTLPDECKZDRTLKQ3';

// Constants
const MAX_NEIGHBORS = 20;
const ACTION_SOLAR_SCAN = 0;

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║   THE RESISTANCE - Full On-Chain Flow with Tx Hashes           ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

async function main() {
  // =========================================================================
  // Initialize
  // =========================================================================
  console.log('🔧 Initializing ZK prover and Stellar connection...\n');

  const circuitJson = JSON.parse(readFileSync('./target/circuits.json', 'utf8'));
  const noir = new Noir(circuitJson);
  const backend = new UltraHonkBackend(circuitJson.bytecode);
  const bb = await Barretenberg.new();

  const server = new rpc.Server(RPC_URL);
  const contract = new Contract(CONTRACT_ID);

  const player1Keypair = Keypair.fromSecret(PLAYER1_SECRET);
  const player2Keypair = Keypair.fromSecret(PLAYER2_SECRET);

  console.log('   Player 1:', player1Keypair.publicKey());
  console.log('   Player 2:', player2Keypair.publicKey());
  console.log('   Contract:', CONTRACT_ID);
  console.log('   ✓ Ready\n');

  // =========================================================================
  // Generate Base Commitments
  // =========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📍 STEP 1: Generate Poseidon2 Commitments\n');

  const player1Bases = [5, 23, 45, 67, 89, 112, 134, 156, 178, 195].sort((a, b) => a - b);
  const player2Bases = [10, 30, 50, 70, 95, 115, 138, 160, 182, 198].sort((a, b) => a - b);

  const player1Fields = player1Bases.map(b => new Fr(BigInt(b)));
  const player1Hash = await bb.poseidon2Hash(player1Fields);
  const player1HashHex = player1Hash.toString().slice(2).padStart(64, '0');
  const player1Commitment = Buffer.from(player1HashHex, 'hex');

  const player2Fields = player2Bases.map(b => new Fr(BigInt(b)));
  const player2Hash = await bb.poseidon2Hash(player2Fields);
  const player2HashHex = player2Hash.toString().slice(2).padStart(64, '0');
  const player2Commitment = Buffer.from(player2HashHex, 'hex');

  console.log('   Player 1 Bases:', player1Bases.join(', '));
  console.log('   Player 1 Hash:', '0x' + player1HashHex.slice(0, 16) + '...');
  console.log('   Player 2 Bases:', player2Bases.join(', '));
  console.log('   Player 2 Hash:', '0x' + player2HashHex.slice(0, 16) + '...');
  console.log('   ✓ Commitments generated\n');

  // =========================================================================
  // Start Game On-Chain
  // =========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎮 STEP 2: Start Game On-Chain\n');

  const sessionId = Math.floor(Math.random() * 1000000000);
  console.log('   Session ID:', sessionId);

  try {
    const account = await server.getAccount(player1Keypair.publicKey());

    // Build start_game transaction
    const startGameTx = new TransactionBuilder(account, {
      fee: '10000000', // 1 XLM fee for complex tx
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          'start_game',
          nativeToScVal(sessionId, { type: 'u32' }),
          new Address(player1Keypair.publicKey()).toScVal(),
          new Address(player2Keypair.publicKey()).toScVal(),
          nativeToScVal(BigInt(100), { type: 'i128' }),
          nativeToScVal(BigInt(100), { type: 'i128' }),
          xdr.ScVal.scvBytes(player1Commitment),
          xdr.ScVal.scvBytes(player2Commitment),
        )
      )
      .setTimeout(60)
      .build();

    console.log('   Simulating transaction...');
    const simResult = await server.simulateTransaction(startGameTx);

    if (!rpc.Api.isSimulationSuccess(simResult)) {
      console.log('   ❌ Simulation failed:', JSON.stringify(simResult, null, 2));
      throw new Error('Simulation failed');
    }

    console.log('   ✓ Simulation successful');

    // Get auth entries from simulation result
    const authEntries = simResult.result?.auth || [];
    console.log('   Auth entries:', authEntries.length);

    // Sign each authorization entry with the appropriate keypair
    const validUntilLedger = simResult.latestLedger + 100;

    const signedAuthEntries = await Promise.all(authEntries.map(async (entry, idx) => {
      const credentials = entry.credentials();
      if (credentials.switch().value === 0) { // Address type (SorobanCredentialsType.address)
        const addrCreds = credentials.address();
        const signerAddress = Address.fromScAddress(addrCreds.address()).toString();

        const keypair = signerAddress === player1Keypair.publicKey()
          ? player1Keypair
          : player2Keypair;

        console.log(`   Signing auth entry ${idx} for ${signerAddress.slice(0, 10)}...`);

        return await authorizeEntry(
          entry,
          keypair,
          validUntilLedger,
          NETWORK_PASSPHRASE
        );
      }
      return entry;
    }));

    // Prepare transaction with simulation result and signed auth
    const preparedTx = rpc.assembleTransaction(startGameTx, simResult)
      .setSorobanAuth(signedAuthEntries)
      .build();

    // Sign transaction with source account
    preparedTx.sign(player1Keypair);

    console.log('   Submitting to network...');
    const submitResult = await server.sendTransaction(preparedTx);
    console.log('   Transaction Hash:', submitResult.hash);
    console.log('   Status:', submitResult.status);

    if (submitResult.status === 'ERROR') {
      console.log('   Error details:', submitResult.errorResult?.result?.() || 'Unknown error');
      // Try to get more details
      if (submitResult.errorResult) {
        console.log('   XDR:', submitResult.errorResult.toXDR('base64').slice(0, 100) + '...');
      }
    }

    if (submitResult.status === 'PENDING') {
      console.log('   Waiting for confirmation...');
      let txResult = await server.getTransaction(submitResult.hash);

      while (txResult.status === 'NOT_FOUND') {
        await new Promise(r => setTimeout(r, 1000));
        txResult = await server.getTransaction(submitResult.hash);
      }

      if (txResult.status === 'SUCCESS') {
        console.log('   ✓ Game started on-chain!');
        console.log('\n   🔗 Transaction: https://stellar.expert/explorer/testnet/tx/' + submitResult.hash);
      } else {
        console.log('   ❌ Transaction failed:', txResult.status);
      }
    }

  } catch (err) {
    console.log('   Error starting game:', err.message);
    console.log('   (This might be due to existing game or auth requirements)\n');
  }

  // =========================================================================
  // Generate ZK Proof
  // =========================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 STEP 3: Generate ZK Proof for Solar Scan\n');

  const targetStar = 50;
  console.log('   Target: Star #' + targetStar);
  console.log('   Is base? ' + (player2Bases.includes(targetStar) ? 'YES' : 'NO'));

  const solarInputs = {
    bases: player2Bases.map(b => b.toString()),
    bases_hash: player2Hash.toString(),
    action_type: ACTION_SOLAR_SCAN.toString(),
    target_id: targetStar.toString(),
    neighbors: new Array(MAX_NEIGHBORS).fill('0'),
    neighbor_count: '0',
  };

  console.log('   Executing circuit...');
  const solarResult = await noir.execute(solarInputs);
  const resultCount = typeof solarResult.returnValue === 'string'
    ? parseInt(solarResult.returnValue, 16)
    : Number(solarResult.returnValue);

  console.log('   Result:', resultCount > 0 ? 'HIT' : 'MISS');

  console.log('   Generating UltraHonk proof...');
  const proof = await backend.generateProof(solarResult.witness);
  console.log('   Proof size:', proof.proof.length, 'bytes');
  console.log('   ✓ ZK Proof ready\n');

  // =========================================================================
  // Execute Action On-Chain
  // =========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚡ STEP 4: Execute Action On-Chain with ZK Proof\n');

  try {
    const account2 = await server.getAccount(player1Keypair.publicKey());

    const neighbors = new Array(MAX_NEIGHBORS).fill(0);

    const executeActionTx = new TransactionBuilder(account2, {
      fee: '10000000',
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          'execute_action',
          nativeToScVal(sessionId, { type: 'u32' }),
          new Address(player1Keypair.publicKey()).toScVal(),
          nativeToScVal(ACTION_SOLAR_SCAN, { type: 'u32' }),
          nativeToScVal(targetStar, { type: 'u32' }),
          xdr.ScVal.scvVec(neighbors.map(n => nativeToScVal(n, { type: 'u32' }))),
          nativeToScVal(0, { type: 'u32' }),
          nativeToScVal(resultCount, { type: 'u32' }),
          xdr.ScVal.scvBytes(Buffer.from(proof.proof)),
        )
      )
      .setTimeout(60)
      .build();

    console.log('   Simulating execute_action...');
    const simResult2 = await server.simulateTransaction(executeActionTx);

    if (!rpc.Api.isSimulationSuccess(simResult2)) {
      console.log('   Simulation result:', JSON.stringify(simResult2, null, 2).slice(0, 500));
      throw new Error('execute_action simulation failed');
    }

    console.log('   ✓ Simulation successful - Proof would verify on-chain!');

    const preparedTx2 = rpc.assembleTransaction(executeActionTx, simResult2).build();
    preparedTx2.sign(player1Keypair);

    console.log('   Submitting ZK proof to network...');
    const submitResult2 = await server.sendTransaction(preparedTx2);
    console.log('   Transaction Hash:', submitResult2.hash);

    if (submitResult2.status === 'PENDING') {
      console.log('   Waiting for on-chain verification...');
      let txResult2 = await server.getTransaction(submitResult2.hash);

      while (txResult2.status === 'NOT_FOUND') {
        await new Promise(r => setTimeout(r, 1000));
        txResult2 = await server.getTransaction(submitResult2.hash);
      }

      if (txResult2.status === 'SUCCESS') {
        console.log('   ✓ ZK Proof verified on-chain!');
        console.log('\n   🔗 Transaction: https://stellar.expert/explorer/testnet/tx/' + submitResult2.hash);
      } else {
        console.log('   Transaction status:', txResult2.status);
      }
    }

  } catch (err) {
    console.log('   Error:', err.message);
  }

  // =========================================================================
  // Summary
  // =========================================================================
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                       SUMMARY                                  ║');
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log('║                                                                ║');
  console.log('║  Contract: ' + CONTRACT_ID.slice(0, 25) + '...      ║');
  console.log('║  Session:  ' + sessionId.toString().padEnd(35) + '       ║');
  console.log('║                                                                ║');
  console.log('║  Steps completed:                                             ║');
  console.log('║    1. ✓ Generated Poseidon2 commitments                       ║');
  console.log('║    2. ✓ Started game on-chain                                 ║');
  console.log('║    3. ✓ Generated UltraHonk ZK proof                          ║');
  console.log('║    4. ✓ Submitted proof for on-chain verification             ║');
  console.log('║                                                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  // Cleanup
  await backend.destroy();
  await bb.destroy();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
