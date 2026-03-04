import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, LAMPORTS_PER_SOL, ParsedTransactionWithMeta } from '@solana/web3.js';

const MAINNET_RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const DEVNET_RPC = 'https://api.devnet.solana.com';

// Known program IDs for protocol identification
const PROGRAM_LABELS: Record<string, string> = {
  JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4: 'Jupiter Swap',
  JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB: 'Jupiter v4',
  whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc: 'Orca Whirlpool',
  ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe8rb: 'Associated Token',
  TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA: 'SPL Token',
  '11111111111111111111111111111111': 'System',
  MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD: 'Marinade',
  '27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4': 'Jito Staking',
  MERLuDFBMmsHnsBPZw2sDQZHvXFMwp8EdjudcU2pgJavB: 'Mercurial AMM',
  SSwpkEEcbUqx4vtoEByFjSkhKdnXrynVMSq8MgHrt9bK: 'Saber',
};

const KNOWN_TOKEN_SYMBOLS: Record<string, string> = {
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: 'USDC',
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: 'USDT',
  So11111111111111111111111111111111111111112: 'wSOL',
  mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So: 'mSOL',
  '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj': 'stSOL',
  JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN: 'JUP',
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: 'BONK',
  '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': 'RAY',
  orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE: 'ORCA',
};

export interface RichTransaction {
  signature: string;
  blockTime: number;
  slot: number;
  type: 'send' | 'receive' | 'swap' | 'stake' | 'unstake' | 'other';
  status: 'success' | 'error';
  fee: number; // in SOL
  solChange: number; // positive = receive, negative = send
  tokenChanges: Array<{ symbol: string; mint: string; change: number }>;
  protocol: string;
  counterparty?: string; // for sends/receives
}

export interface HistoryResponse {
  address: string;
  network: string;
  transactions: RichTransaction[];
  summary: {
    totalSent: number;
    totalReceived: number;
    totalFees: number;
    swapCount: number;
    stakeCount: number;
    errorCount: number;
  };
}

function identifyProtocol(tx: ParsedTransactionWithMeta): string {
  const programs = tx.transaction.message.instructions.map((ix) => {
    if ('programId' in ix) return ix.programId.toString();
    return '';
  });
  for (const pid of programs) {
    if (PROGRAM_LABELS[pid]) return PROGRAM_LABELS[pid];
  }
  return 'Solana';
}

function identifyType(
  solChange: number,
  tokenChanges: Array<{ symbol: string; mint: string; change: number }>,
  protocol: string
): RichTransaction['type'] {
  if (protocol.includes('Jupiter') || protocol.includes('Orca') || protocol.includes('Saber') || protocol.includes('Mercurial')) {
    return 'swap';
  }
  if (protocol.includes('Marinade') || protocol.includes('Jito')) {
    return solChange < 0 ? 'stake' : 'unstake';
  }
  if (tokenChanges.length > 0 && Math.abs(solChange) < 0.01) {
    return 'other'; // Token-only transfer
  }
  if (solChange > 0.001) return 'receive';
  if (solChange < -0.001) return 'send';
  return 'other';
}

function getCounterparty(tx: ParsedTransactionWithMeta, ownerAddress: string): string | undefined {
  const accounts = tx.transaction.message.accountKeys;
  for (const acc of accounts) {
    const addr = acc.pubkey.toString();
    if (addr !== ownerAddress && addr !== '11111111111111111111111111111111') {
      return addr;
    }
  }
  return undefined;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address');
  const network = searchParams.get('network') || 'mainnet';
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);

  if (!address) {
    return NextResponse.json({ error: 'address parameter required' }, { status: 400 });
  }

  let publicKey: PublicKey;
  try {
    publicKey = new PublicKey(address);
  } catch {
    return NextResponse.json({ error: 'Invalid Solana address' }, { status: 400 });
  }

  const rpc = network === 'mainnet' ? MAINNET_RPC : DEVNET_RPC;
  const connection = new Connection(rpc, 'confirmed');

  try {
    // Fetch signatures
    const signatures = await connection.getSignaturesForAddress(publicKey, { limit });

    if (signatures.length === 0) {
      return NextResponse.json({
        address,
        network,
        transactions: [],
        summary: { totalSent: 0, totalReceived: 0, totalFees: 0, swapCount: 0, stakeCount: 0, errorCount: 0 },
      });
    }

    // Fetch parsed transaction details (batch up to 10 at a time)
    const batchSize = 10;
    const parsedTxs: (ParsedTransactionWithMeta | null)[] = [];
    for (let i = 0; i < signatures.length; i += batchSize) {
      const batch = signatures.slice(i, i + batchSize).map((s) => s.signature);
      const results = await connection.getParsedTransactions(batch, {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed',
      });
      parsedTxs.push(...results);
    }

    const transactions: RichTransaction[] = [];

    for (let i = 0; i < signatures.length; i++) {
      const sig = signatures[i];
      const parsed = parsedTxs[i];

      const status: RichTransaction['status'] = sig.err ? 'error' : 'success';
      const fee = parsed?.meta?.fee ? parsed.meta.fee / LAMPORTS_PER_SOL : 0;

      // Calculate SOL change for owner
      let solChange = 0;
      if (parsed?.meta) {
        const pre = parsed.meta.preBalances;
        const post = parsed.meta.postBalances;
        const accountKeys = parsed.transaction.message.accountKeys;
        const ownerIdx = accountKeys.findIndex((k) => k.pubkey.toString() === address);
        if (ownerIdx >= 0 && pre[ownerIdx] !== undefined && post[ownerIdx] !== undefined) {
          solChange = (post[ownerIdx] - pre[ownerIdx]) / LAMPORTS_PER_SOL;
        }
      }

      // Calculate token changes
      const tokenChanges: Array<{ symbol: string; mint: string; change: number }> = [];
      if (parsed?.meta?.preTokenBalances && parsed?.meta?.postTokenBalances) {
        const preMap: Record<string, number> = {};
        const postMap: Record<string, number> = {};
        const mintMap: Record<string, string> = {};

        for (const tb of parsed.meta.preTokenBalances) {
          if (tb.owner === address) {
            const key = `${tb.accountIndex}-${tb.mint}`;
            preMap[key] = tb.uiTokenAmount.uiAmount ?? 0;
            mintMap[key] = tb.mint;
          }
        }
        for (const tb of parsed.meta.postTokenBalances) {
          if (tb.owner === address) {
            const key = `${tb.accountIndex}-${tb.mint}`;
            postMap[key] = tb.uiTokenAmount.uiAmount ?? 0;
            mintMap[key] = tb.mint;
          }
        }

        const allKeys = new Set([...Object.keys(preMap), ...Object.keys(postMap)]);
        for (const key of allKeys) {
          const pre = preMap[key] ?? 0;
          const post = postMap[key] ?? 0;
          const change = post - pre;
          if (Math.abs(change) > 0.000001) {
            const mint = mintMap[key];
            tokenChanges.push({
              symbol: KNOWN_TOKEN_SYMBOLS[mint] ?? mint.slice(0, 6) + '…',
              mint,
              change,
            });
          }
        }
      }

      const protocol = parsed ? identifyProtocol(parsed) : 'Unknown';
      const type = identifyType(solChange, tokenChanges, protocol);
      const counterparty = parsed && (type === 'send' || type === 'receive')
        ? getCounterparty(parsed, address)
        : undefined;

      transactions.push({
        signature: sig.signature,
        blockTime: sig.blockTime ?? 0,
        slot: sig.slot,
        type,
        status,
        fee,
        solChange,
        tokenChanges,
        protocol,
        ...(counterparty ? { counterparty } : {}),
      });
    }

    // Build summary
    const summary = {
      totalSent: transactions.filter((t) => t.type === 'send').reduce((s, t) => s + Math.abs(t.solChange), 0),
      totalReceived: transactions.filter((t) => t.type === 'receive').reduce((s, t) => s + t.solChange, 0),
      totalFees: transactions.reduce((s, t) => s + t.fee, 0),
      swapCount: transactions.filter((t) => t.type === 'swap').length,
      stakeCount: transactions.filter((t) => t.type === 'stake' || t.type === 'unstake').length,
      errorCount: transactions.filter((t) => t.status === 'error').length,
    };

    return NextResponse.json({ address, network, transactions, summary } satisfies HistoryResponse, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    });
  } catch (err) {
    console.error('History API error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch transaction history', details: String(err) },
      { status: 500 }
    );
  }
}
