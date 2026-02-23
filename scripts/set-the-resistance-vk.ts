#!/usr/bin/env bun

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  Account,
  Address,
  Contract,
  Keypair,
  Networks,
  TransactionBuilder,
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
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
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

async function loadSourceAccount(server: rpc.Server, address: string): Promise<Account> {
  try {
    return await server.getAccount(address);
  } catch {
    const res = await fetch(`https://horizon-testnet.stellar.org/accounts/${address}`);
    if (!res.ok) {
      throw new Error(`Failed to load account ${address} from RPC and Horizon`);
    }
    const data = (await res.json()) as { sequence: string };
    return new Account(address, data.sequence);
  }
}

async function main() {
  const envPath = resolve(process.cwd(), '.env');
  const env = parseEnv(readFileSync(envPath, 'utf8'));

  const contractId = env.VITE_THE_RESISTANCE_CONTRACT_ID;
  const adminSecret = env.VITE_DEV_PLAYER1_SECRET;
  const rpcUrl = env.VITE_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
  const networkPassphrase = env.VITE_NETWORK_PASSPHRASE || Networks.TESTNET;
  const vkPath = resolve(process.cwd(), 'circuits', 'target', 'vk', 'vk');

  if (!contractId) throw new Error('Missing VITE_THE_RESISTANCE_CONTRACT_ID in .env');
  if (!adminSecret) throw new Error('Missing VITE_DEV_PLAYER1_SECRET in .env');

  const vkBytes = readFileSync(vkPath);
  const server = new rpc.Server(rpcUrl);
  const admin = Keypair.fromSecret(adminSecret);
  const contract = new Contract(contractId);

  console.log('Contract:', contractId);
  console.log('Admin:', admin.publicKey());
  console.log('VK bytes:', vkBytes.length);

  const source = await loadSourceAccount(server, admin.publicKey());
  const tx = new TransactionBuilder(source, {
    fee: '10000000',
    networkPassphrase,
  })
    .addOperation(
      contract.call(
        'set_vk',
        xdr.ScVal.scvBytes(vkBytes),
      )
    )
    .setTimeout(60)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (!rpc.Api.isSimulationSuccess(sim)) {
    throw new Error(`set_vk simulation failed: ${JSON.stringify(sim)}`);
  }

  const assembled = rpc.assembleTransaction(tx, sim).build();
  assembled.sign(admin);
  const send = await server.sendTransaction(assembled);
  if (send.status === 'ERROR') {
    throw new Error(`set_vk send failed: ${JSON.stringify(send)}`);
  }

  const finalTx = await waitForTx(server, send.hash);
  if (finalTx.status !== 'SUCCESS') {
    throw new Error(`set_vk failed: ${JSON.stringify(finalTx)}`);
  }

  console.log('set_vk tx:', send.hash);
}

main().catch((err) => {
  console.error('set_vk failed:', err);
  process.exit(1);
});
