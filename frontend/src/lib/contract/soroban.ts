import { rpc, Contract, Address, Account, nativeToScVal, scValToNative, xdr, TransactionBuilder, BASE_FEE, TimeoutInfinite } from '@stellar/stellar-sdk';
import { StellarWalletsKit } from '@creit.tech/stellar-wallets-kit';

export const RPC_URL = 'https://soroban-testnet.stellar.org';
export const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
export const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID || 'CDUR55MLZLS7ROZBJ5PK2AQH3NBDC6KSCXXYZAEHLBQHRBSZPS2UCIZF';

const server = new rpc.Server(RPC_URL);

export interface ChitStatus {
  id: number;
  members: string[];
  contribution_amount: number;
  total_rounds: number;
  current_round: number;
  token: string;
}

export interface Contribution {
  chit_id: number;
  round: number;
  amount: number;
}

// Helper to poll transaction status
async function pollTx(txHash: string) {
  let attempts = 0;
  while (attempts < 20) {
    const txResponse = await server.getTransaction(txHash);
    if (txResponse.status === 'SUCCESS') {
      return txResponse;
    }
    if (txResponse.status === 'FAILED') {
      throw new Error('Transaction failed on-chain: ' + JSON.stringify(txResponse.resultXdr));
    }
    await new Promise((r) => setTimeout(r, 2000));
    attempts++;
  }
  throw new Error('Transaction polling timed out');
}

// Helper to simulate, sign, and submit a Soroban transaction
async function signAndSubmit(pubKey: string, operation: any) {
  // 1. Fetch account details
  const sourceAccount = await server.getLatestLedger().then(() => server.getAccount(pubKey));
  
  // 2. Build temporary transaction
  let tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(TimeoutInfinite)
    .build();

  // 3. Simulate to estimate footprint and fees
  const simulated = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simulated)) {
    throw new Error('Simulation failed: ' + simulated.error);
  }

  // 4. Assemble the final transaction with simulation results
  tx = rpc.assembleTransaction(tx, simulated).build();

  // 5. Trigger Freighter Wallet Popup to sign
  const { signedTxXdr } = await StellarWalletsKit.signTransaction(tx.toXDR(), {
    address: pubKey,
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  // 6. Submit the signed transaction to Stellar Testnet RPC
  const signedTx = TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);
  const response = await server.sendTransaction(signedTx);

  if (response.status === 'ERROR') {
    throw new Error('Failed to submit transaction: ' + JSON.stringify((response as any).errorResultXdr || (response as any).errorResult || response));
  }

  // 7. Poll until transaction is permanently recorded in a ledger
  return await pollTx(response.hash);
}

export async function createChitTx(
  _kit: typeof StellarWalletsKit,
  pubKey: string,
  members: string[],
  amount: number,
  rounds: number,
  token: string
) {
  if (!CONTRACT_ID) throw new Error("Contract ID not configured");

  const contract = new Contract(CONTRACT_ID);
  
  // Convert members to ScVal Vector of Addresses
  const membersScVals = members.map(m => new Address(m).toScVal());
  const membersVec = xdr.ScVal.scvVec(membersScVals);

  const operation = contract.call(
    "create_chit",
    membersVec,
    nativeToScVal(BigInt(Math.floor(amount)), { type: 'i128' }),
    nativeToScVal(rounds, { type: 'u32' }),
    new Address(token).toScVal()
  );

  return await signAndSubmit(pubKey, operation);
}

export async function contributeTx(
  _kit: typeof StellarWalletsKit,
  pubKey: string,
  chitId: number,
  round: number
) {
  if (!CONTRACT_ID) throw new Error("Contract ID not configured");
  
  const contract = new Contract(CONTRACT_ID);
  
  const operation = contract.call(
    "contribute",
    nativeToScVal(chitId, { type: 'u32' }),
    nativeToScVal(round, { type: 'u32' }),
    new Address(pubKey).toScVal()
  );

  return await signAndSubmit(pubKey, operation);
}

export async function disburseTx(
  _kit: typeof StellarWalletsKit,
  pubKey: string,
  chitId: number,
  round: number
) {
  if (!CONTRACT_ID) throw new Error("Contract ID not configured");
  
  const contract = new Contract(CONTRACT_ID);
  
  const operation = contract.call(
    "disburse",
    nativeToScVal(chitId, { type: 'u32' }),
    nativeToScVal(round, { type: 'u32' })
  );

  return await signAndSubmit(pubKey, operation);
}

export async function getChitStatus(chitId: number): Promise<ChitStatus> {
  if (!CONTRACT_ID) throw new Error("Contract ID not configured");

  const contract = new Contract(CONTRACT_ID);
  const tx = new TransactionBuilder(
    new Account("GBB35PEWHYNQJP2YFJ4RAQE7M4DJ2HT64EBKO6CT242K27BWOBAFT22K", "0"),
    {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    }
  )
    .addOperation(contract.call("get_chit_status", nativeToScVal(chitId, { type: 'u32' })))
    .setTimeout(TimeoutInfinite)
    .build();

  // Read-only state query via simulateTransaction
  const simulated = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simulated)) {
    throw new Error('Simulation failed: ' + simulated.error);
  }

  if (!rpc.Api.isSimulationSuccess(simulated)) {
    throw new Error('Simulation failed with unexpected response');
  }

  const scVal = simulated.result?.retval;
  if (!scVal) throw new Error("No return value from contract simulation");
  
  const native = scValToNative(scVal);

  return {
    id: Number(native.id),
    members: native.members.map((m: any) => m.toString()),
    contribution_amount: Number(native.contribution_amount),
    total_rounds: Number(native.total_rounds),
    current_round: Number(native.current_round),
    token: native.token.toString()
  };
}

export async function getMemberChits(address: string): Promise<ChitStatus[]> {
  const chits: ChitStatus[] = [];
  // Scan sequentially starting from ID 1 until we hit the first non-existent group
  for (let i = 1; i <= 200; i++) {
    try {
      const status = await getChitStatus(i);
      if (status.members.includes(address)) {
        chits.push(status);
      }
    } catch (e) {
      // First non-existent ID reached, safe to break sequential scan
      break;
    }
  }
  return chits;
}

export async function getRoundContributions(chitId: number, round: number): Promise<Record<string, boolean>> {
  if (!CONTRACT_ID) throw new Error("Contract ID not configured");

  const contract = new Contract(CONTRACT_ID);
  const tx = new TransactionBuilder(
    new Account("GBB35PEWHYNQJP2YFJ4RAQE7M4DJ2HT64EBKO6CT242K27BWOBAFT22K", "0"),
    {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    }
  )
    .addOperation(contract.call(
      "get_round_contributions",
      nativeToScVal(chitId, { type: 'u32' }),
      nativeToScVal(round, { type: 'u32' })
    ))
    .setTimeout(TimeoutInfinite)
    .build();

  const simulated = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simulated)) {
    throw new Error('Simulation failed: ' + simulated.error);
  }

  if (!rpc.Api.isSimulationSuccess(simulated)) {
    throw new Error('Simulation failed with unexpected response');
  }

  const scVal = simulated.result?.retval;
  if (!scVal) return {};

  const native = scValToNative(scVal);
  return native || {};
}

// Helper for getMemberChits scanning index