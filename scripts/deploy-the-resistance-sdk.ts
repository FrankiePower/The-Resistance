#!/usr/bin/env bun

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import {
  Account,
  Address,
  Networks,
  Operation,
  TransactionBuilder,
  rpc,
  scValToNative,
  xdr,
  Keypair,
} from '@stellar/stellar-sdk';

function parseEnv(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  const raw = readFileSync(path, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    out[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return out;
}

function setEnvKey(content: string, key: string, value: string): string {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(content)) return content.replace(re, line);
  return `${content.trimEnd()}\n${line}\n`;
}

async function waitForTx(server: rpc.Server, hash: string): Promise<rpc.Api.GetTransactionResponse> {
  for (;;) {
    const tx = await server.getTransaction(hash);
    if (tx.status !== 'NOT_FOUND') return tx;
    await new Promise((r) => setTimeout(r, 1200));
  }
}

async function loadSourceAccount(server: rpc.Server, address: string): Promise<Account> {
  try {
    return await server.getAccount(address);
  } catch {
    const res = await fetch(`https://horizon-testnet.stellar.org/accounts/${address}`);
    if (!res.ok) throw new Error(`Failed to load source account ${address} from Horizon`);
    const data = (await res.json()) as { sequence: string };
    return new Account(address, data.sequence);
  }
}

function normalizeScVal(retval: string | xdr.ScVal): xdr.ScVal {
  if (typeof retval === 'string') return xdr.ScVal.fromXDR(retval, 'base64');
  return retval;
}

function scValToBytes(retval: string | xdr.ScVal): Buffer {
  const sc = normalizeScVal(retval);
  const native = scValToNative(sc);
  if (Buffer.isBuffer(native)) return native;
  if (native instanceof Uint8Array) return Buffer.from(native);
  throw new Error(`Unexpected retval type for bytes: ${typeof native}`);
}

function scValToAddress(retval: string | xdr.ScVal): string {
  const sc = normalizeScVal(retval);
  return Address.fromScVal(sc).toString();
}

async function main() {
  const envPath = '.env';
  if (!existsSync(envPath)) throw new Error('.env not found');

  const env = parseEnv(envPath);
  const rpcUrl = env.VITE_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
  const networkPassphrase = env.VITE_NETWORK_PASSPHRASE || Networks.TESTNET;
  const sourceSecret = env.VITE_DEV_PLAYER1_SECRET;
  const gameHub = 'CB4VZAT2U3UC6XFK3N23SKRF2NDCMP3QHJYMCHHFMZO7MRQO6DQ2EMYG';

  if (!sourceSecret) throw new Error('Missing VITE_DEV_PLAYER1_SECRET in .env');

  const source = Keypair.fromSecret(sourceSecret);
  const sourceAddress = source.publicKey();
  const server = new rpc.Server(rpcUrl);

  const wasmPath = 'target/wasm32v1-none/release/the_resistance.wasm';
  const vkPath = (() => {
    const base = 'circuits/target/vk';
    if (!existsSync(base)) {
      throw new Error(`Missing vk path: ${base}`);
    }
    const stats = statSync(base);
    if (stats.isDirectory()) {
      const nested = `${base}/vk`;
      if (!existsSync(nested)) {
        throw new Error(`Missing vk file: ${nested}`);
      }
      return nested;
    }
    return base;
  })();
  if (!existsSync(wasmPath)) throw new Error(`Missing wasm: ${wasmPath}`);
  if (!existsSync(vkPath)) throw new Error(`Missing vk file: ${vkPath}`);

  const wasm = readFileSync(wasmPath);
  const vkBytes = readFileSync(vkPath);
  const localWasmHash = createHash('sha256').update(wasm).digest('hex');

  console.log('Source account:', sourceAddress);
  console.log('Local WASM hash:', localWasmHash);
  console.log('VK bytes:', vkBytes.length);

  // 1) Upload WASM
  const uploadSource = await loadSourceAccount(server, sourceAddress);
  const uploadTx = new TransactionBuilder(uploadSource, {
    fee: '10000000',
    networkPassphrase,
  })
    .addOperation(Operation.uploadContractWasm({ wasm }))
    .setTimeout(60)
    .build();

  const uploadSim = await server.simulateTransaction(uploadTx);
  if (!rpc.Api.isSimulationSuccess(uploadSim)) {
    throw new Error(`upload simulation failed: ${JSON.stringify(uploadSim)}`);
  }

  const uploadAssembled = rpc.assembleTransaction(uploadTx, uploadSim).build();
  uploadAssembled.sign(source);
  const uploadSend = await server.sendTransaction(uploadAssembled);
  if (uploadSend.status === 'ERROR') {
    throw new Error(`upload send failed: ${JSON.stringify(uploadSend)}`);
  }
  const uploadResult = await waitForTx(server, uploadSend.hash);
  if (uploadResult.status !== 'SUCCESS') {
    throw new Error(`upload tx failed: ${JSON.stringify(uploadResult)}`);
  }

  const uploadedWasmHash =
    uploadSim.result?.retval ? scValToBytes(uploadSim.result.retval).toString('hex') : localWasmHash;
  console.log('Uploaded WASM hash:', uploadedWasmHash);

  // 2) Deploy with constructor args
  const deploySource = await loadSourceAccount(server, sourceAddress);
  const deployTx = new TransactionBuilder(deploySource, {
    fee: '10000000',
    networkPassphrase,
  })
    .addOperation(
      Operation.createCustomContract({
        address: new Address(sourceAddress),
        wasmHash: Buffer.from(uploadedWasmHash, 'hex'),
        constructorArgs: [
          new Address(sourceAddress).toScVal(),
          new Address(gameHub).toScVal(),
          xdr.ScVal.scvBytes(vkBytes),
        ],
      })
    )
    .setTimeout(60)
    .build();

  const deploySim = await server.simulateTransaction(deployTx);
  if (!rpc.Api.isSimulationSuccess(deploySim)) {
    throw new Error(`deploy simulation failed: ${JSON.stringify(deploySim)}`);
  }

  const deployAssembled = rpc.assembleTransaction(deployTx, deploySim).build();
  deployAssembled.sign(source);
  const deploySend = await server.sendTransaction(deployAssembled);
  if (deploySend.status === 'ERROR') {
    throw new Error(`deploy send failed: ${JSON.stringify(deploySend)}`);
  }
  const deployResult = await waitForTx(server, deploySend.hash);
  if (deployResult.status !== 'SUCCESS') {
    throw new Error(`deploy tx failed: ${JSON.stringify(deployResult)}`);
  }

  if (!deploySim.result?.retval) {
    throw new Error('Missing deploy simulation return value (contract id)');
  }
  const contractId = scValToAddress(deploySim.result.retval);
  console.log('Deployed contract:', contractId);
  console.log('Deploy tx:', deploySend.hash);

  // 3) Update .env and deployment.json
  const envRaw = readFileSync(envPath, 'utf8');
  const updatedEnv = setEnvKey(envRaw, 'VITE_THE_RESISTANCE_CONTRACT_ID', contractId);
  writeFileSync(envPath, updatedEnv);

  if (existsSync('deployment.json')) {
    try {
      const json = JSON.parse(readFileSync('deployment.json', 'utf8')) as any;
      if (!json.contracts || typeof json.contracts !== 'object') json.contracts = {};
      json.contracts['the-resistance'] = contractId;
      json.deployedAt = new Date().toISOString();
      writeFileSync('deployment.json', `${JSON.stringify(json, null, 2)}\n`);
    } catch {
      // Ignore malformed deployment.json
    }
  }

  console.log('Updated .env and deployment.json');
}

main().catch((err) => {
  console.error('SDK deploy failed:', err);
  process.exit(1);
});
