import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Noir } from '@noir-lang/noir_js';
import { UltraHonkBackend, Barretenberg, Fr } from '@aztec/bb.js';
import {
  Account,
  Address,
  Contract,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
  authorizeEntry,
  nativeToScVal,
  rpc,
  xdr,
} from '@stellar/stellar-sdk';

type EnvMap = Record<string, string>;

function parseEnv(content: string): EnvMap {
  const out: EnvMap = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const k = trimmed.slice(0, eq).trim();
    const v = trimmed.slice(eq + 1).trim();
    out[k] = v;
  }
  return out;
}

async function waitForTx(server: rpc.Server, hash: string): Promise<rpc.Api.GetTransactionResponse> {
  for (;;) {
    const tx = await server.getTransaction(hash);
    if (tx.status !== 'NOT_FOUND') return tx;
    await new Promise((r) => setTimeout(r, 1200));
  }
}

async function loadSourceAccount(
  server: rpc.Server,
  address: string,
  rpcUrl: string
): Promise<Account> {
  try {
    return await server.getAccount(address);
  } catch {
    if (rpcUrl.includes('localhost') || rpcUrl.includes('127.0.0.1')) {
      throw new Error(`Failed to load local account ${address} from RPC`);
    }
    const res = await fetch(`https://horizon-testnet.stellar.org/accounts/${address}`);
    if (!res.ok) {
      throw new Error(`Failed to load account ${address} from RPC and Horizon`);
    }
    const data = (await res.json()) as { sequence: string };
    return new Account(address, data.sequence);
  }
}

async function main() {
  const rootEnvPath = resolve(process.cwd(), '..', '.env');
  const env = parseEnv(readFileSync(rootEnvPath, 'utf8'));
  const runtimeEnv = process.env as Record<string, string | undefined>;

  const contractId = runtimeEnv.E2E_CONTRACT_ID || env.VITE_THE_RESISTANCE_CONTRACT_ID;
  const player1Secret = runtimeEnv.E2E_PLAYER1_SECRET || env.VITE_DEV_PLAYER1_SECRET;
  const player2Secret = runtimeEnv.E2E_PLAYER2_SECRET || env.VITE_DEV_PLAYER2_SECRET;
  const rpcUrl =
    runtimeEnv.E2E_RPC_URL || env.VITE_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
  const networkPassphrase =
    runtimeEnv.E2E_NETWORK_PASSPHRASE || env.VITE_NETWORK_PASSPHRASE || Networks.TESTNET;

  if (!contractId || !player1Secret || !player2Secret) {
    throw new Error('Missing required env keys in root .env');
  }

  const server = new rpc.Server(rpcUrl, {
    allowHttp: rpcUrl.startsWith('http://'),
  });
  const contract = new Contract(contractId);
  const player1 = Keypair.fromSecret(player1Secret);
  const player2 = Keypair.fromSecret(player2Secret);

  console.log('Contract:', contractId);
  console.log('Player1:', player1.publicKey());
  console.log('Player2:', player2.publicKey());

  const circuitPath = resolve(process.cwd(), 'public', 'circuits.json');
  const circuit = JSON.parse(readFileSync(circuitPath, 'utf8'));
  const noir = new Noir(circuit);
  const backend = new UltraHonkBackend(circuit.bytecode);
  const bb = await Barretenberg.new();

  const player1Bases = [5, 23, 45, 67, 89, 112, 134, 156, 178, 195].sort((a, b) => a - b);
  const player2Bases = [10, 30, 50, 70, 95, 115, 138, 160, 182, 198].sort((a, b) => a - b);

  const player1Hash = await bb.poseidon2Hash(player1Bases.map((n) => new Fr(BigInt(n))));
  const player2Hash = await bb.poseidon2Hash(player2Bases.map((n) => new Fr(BigInt(n))));
  const p1Commit = Buffer.from(player1Hash.toString().replace(/^0x/, '').padStart(64, '0'), 'hex');
  const p2Commit = Buffer.from(player2Hash.toString().replace(/^0x/, '').padStart(64, '0'), 'hex');

  const sessionId = (Math.floor(Math.random() * 0xffffffff) >>> 0) || 1;
  const stake = BigInt(10_000_000);

  console.log('Session:', sessionId);

  // start_game with two auth entries
  const p1Account = await loadSourceAccount(server, player1.publicKey(), rpcUrl);
  const startTx = new TransactionBuilder(p1Account, {
    fee: '10000000',
    networkPassphrase,
  })
    .addOperation(
      contract.call(
        'start_game',
        nativeToScVal(sessionId, { type: 'u32' }),
        new Address(player1.publicKey()).toScVal(),
        new Address(player2.publicKey()).toScVal(),
        nativeToScVal(stake, { type: 'i128' }),
        nativeToScVal(stake, { type: 'i128' }),
        xdr.ScVal.scvBytes(p1Commit),
        xdr.ScVal.scvBytes(p2Commit),
      )
    )
    .setTimeout(60)
    .build();

  const startSim = await server.simulateTransaction(startTx);
  if (!rpc.Api.isSimulationSuccess(startSim)) {
    throw new Error(`start_game simulation failed: ${JSON.stringify(startSim)}`);
  }

  const authEntries = startSim.result?.auth || [];
  const validUntilLedger = startSim.latestLedger + 120;
  const signedAuthEntries = await Promise.all(
    authEntries.map(async (entry) => {
      try {
        const addr = Address.fromScAddress(entry.credentials().address().address()).toString();
        const kp = addr === player1.publicKey() ? player1 : player2;
        return authorizeEntry(entry, kp, validUntilLedger, networkPassphrase);
      } catch {
        return entry;
      }
    })
  );

  const assembledStart = rpc.assembleTransaction(startTx, startSim).build();
  const startEnvelope = assembledStart.toEnvelope();
  const startInvokeOp = startEnvelope.v1().tx().operations()[0].body().invokeHostFunctionOp();
  startInvokeOp.auth(signedAuthEntries);
  const startWithAuth = TransactionBuilder.fromXDR(startEnvelope.toXDR('base64'), networkPassphrase);
  startWithAuth.sign(player1);
  const startSend = await server.sendTransaction(startWithAuth);
  if (startSend.status === 'ERROR') {
    throw new Error(`start_game submit error: ${JSON.stringify(startSend)}`);
  }
  const startResult = await waitForTx(server, startSend.hash);
  if (startResult.status !== 'SUCCESS') {
    throw new Error(`start_game failed: ${JSON.stringify(startResult)}`);
  }
  console.log('start_game tx:', startSend.hash);

  // Build proof for solar scan target 50 (known player2 base -> hit=1)
  const targetStar = 50;
  const actionType = 0;
  const neighbors = new Array(20).fill('0');
  const noirInputs = {
    bases: player2Bases.map((n) => n.toString()),
    bases_hash: player2Hash.toString(),
    action_type: actionType.toString(),
    target_id: targetStar.toString(),
    neighbors,
    neighbor_count: '0',
  };
  const proofRun = await noir.execute(noirInputs);
  const resultCount =
    typeof proofRun.returnValue === 'string'
      ? parseInt(proofRun.returnValue, 16)
      : Number(proofRun.returnValue);
  const proof = await backend.generateProof(proofRun.witness, { keccak: true });
  const proofValid = await backend.verifyProof(
    { proof: proof.proof, publicInputs: proof.publicInputs },
    { keccak: true },
  );
  if (!proofValid) {
    throw new Error('Local keccak proof verification failed');
  }
  console.log('proof bytes:', proof.proof.length, 'result_count:', resultCount);

  // execute_action
  const p1Account2 = await loadSourceAccount(server, player1.publicKey(), rpcUrl);
  const execTx = new TransactionBuilder(p1Account2, {
    fee: '10000000',
    networkPassphrase,
  })
    .addOperation(
      contract.call(
        'execute_action',
        nativeToScVal(sessionId, { type: 'u32' }),
        new Address(player1.publicKey()).toScVal(),
        nativeToScVal(actionType, { type: 'u32' }),
        nativeToScVal(targetStar, { type: 'u32' }),
        xdr.ScVal.scvVec([]),
        nativeToScVal(0, { type: 'u32' }),
        nativeToScVal(resultCount, { type: 'u32' }),
        xdr.ScVal.scvBytes(Buffer.from(proof.proof)),
      )
    )
    .setTimeout(60)
    .build();

  const execSim = await server.simulateTransaction(execTx, { cpuInstructions: 2_000_000_000 });
  if (!rpc.Api.isSimulationSuccess(execSim)) {
    throw new Error(`execute_action simulation failed: ${JSON.stringify(execSim)}`);
  }

  const preparedExec = rpc.assembleTransaction(execTx, execSim).build();
  preparedExec.sign(player1);
  const execSend = await server.sendTransaction(preparedExec);
  if (execSend.status === 'ERROR') {
    throw new Error(`execute_action submit error: ${JSON.stringify(execSend)}`);
  }
  const execResult = await waitForTx(server, execSend.hash);
  if (execResult.status !== 'SUCCESS') {
    throw new Error(`execute_action failed with status: ${execResult.status}`);
  }
  console.log('execute_action tx:', execSend.hash);
  console.log('PASS: end-to-end onchain proof flow succeeded.');

  await backend.destroy();
  await bb.destroy();
}

main().catch((err) => {
  console.error('E2E failed:', err);
  process.exit(1);
});
