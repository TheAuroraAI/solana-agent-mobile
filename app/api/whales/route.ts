import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { NextRequest } from 'next/server';
import { getSolPrice } from '@/lib/solana';

export const runtime = 'nodejs';
export const revalidate = 0;

// Well-known high-volume Solana program addresses to scan for whale activity
// Jupiter aggregator v6 - processes billions in swaps daily
const JUPITER_V6 = 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4';
// Raydium AMM v4
const RAYDIUM_AMM = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';

export interface WhaleAlert {
  signature: string;
  type: 'buy' | 'sell' | 'transfer';
  token: string;
  amount: number;   // in SOL or token amount
  amountUsd: number;
  wallet: string;
  blockTime: number;
  tier: 'mega' | 'whale' | 'dolphin';
}

function getWhaleTier(amountUsd: number): WhaleAlert['tier'] {
  if (amountUsd >= 500_000) return 'mega';
  if (amountUsd >= 50_000) return 'whale';
  return 'dolphin';
}

// Demo data fallback — realistic based on real Solana transaction patterns
function getDemoAlerts(): WhaleAlert[] {
  const now = Math.floor(Date.now() / 1000);
  return [
    {
      signature: '5QyKjUBq6A3HdFkYpYRqL2mNQ3xgDvEcTsTwMr4Y6PKhFqz8pWJXdNbvB1nS7p2s',
      type: 'buy',
      token: 'SOL',
      amount: 48200,
      amountUsd: 8_626_000,
      wallet: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      blockTime: now - 95,
      tier: 'mega',
    },
    {
      signature: 'Abz3HdkFkYpYRqL2mNQ3xgDvEcTsTwMr4Y6PKhF2pWJXdNbvB1nS7p2s4qY8KjU',
      type: 'sell',
      token: 'JUP',
      amount: 4_250_000,
      amountUsd: 2_870_000,
      wallet: '3w4KM8f2d97TXJSDpbDj5jBkheTqA83TZRuJosgAsU5',
      blockTime: now - 310,
      tier: 'mega',
    },
    {
      signature: 'CxKjUBq6A3HdFkYpYRqL2mNQ3xgDvEcTsTwMr4Y6PKhFqz8pWJXdNbvB1nS7p3t',
      type: 'buy',
      token: 'BONK',
      amount: 15_200_000_000,
      amountUsd: 347_000,
      wallet: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
      blockTime: now - 542,
      tier: 'whale',
    },
    {
      signature: 'DqJ5GH9LwP2mNQ3xgDvEcTsTwMr4Y6PKhFqz8pWJXdNbvB1nS7p2s4qY8KjUBq6',
      type: 'transfer',
      token: 'SOL',
      amount: 8750,
      amountUsd: 1_566_250,
      wallet: 'FrozenSpinach3xKXtg2CW87d97TXJSDpbD5jBkheTqA8',
      blockTime: now - 780,
      tier: 'mega',
    },
    {
      signature: 'EvPkHLm8Q9xgDvEcTsTwMr4Y6PKhFqz8pWJXdNbvB1nS7p2s4qY8KjUBq6A3HdFk',
      type: 'buy',
      token: 'WIF',
      amount: 2_890_000,
      amountUsd: 892_000,
      wallet: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
      blockTime: now - 1100,
      tier: 'whale',
    },
    {
      signature: 'FwJmKNp9RqL2mNQ3xgDvEcTsTwMr4Y6PKhFqz8pWJXdNbvB1nS7p2s4qY8KjU7H',
      type: 'sell',
      token: 'PYTH',
      amount: 9_800_000,
      amountUsd: 215_000,
      wallet: 'AARKkgqmpGJnkpXFsMgpZLCjRaLCNUDq87smVLNPBnrx',
      blockTime: now - 1450,
      tier: 'whale',
    },
    {
      signature: 'Gz8LPqR4T2mNQ3xgDvEcTsTwMr4Y6PKhFqz8pWJXdNbvB1nS7p2s4qY8KjUBq6A',
      type: 'buy',
      token: 'JUP',
      amount: 1_500_000,
      amountUsd: 1_012_500,
      wallet: '6HoqL5CdXtgY7KSumKP8FzBpnT2mNQ3xgDvEcTs4qY8',
      blockTime: now - 1820,
      tier: 'mega',
    },
    {
      signature: 'Hk9MsRv5U3nQ4ygEvFdTuTxNs5Z7RLhGrb9rXKnCwOPq2tYb2oUu8rZ9LjVCr7B',
      type: 'transfer',
      token: 'USDC',
      amount: 3_200_000,
      amountUsd: 3_200_000,
      wallet: '8pVNv6Ibhf3r7LkXcSMj2oHwAmqtTuEvRxP9JbGYdZ4',
      blockTime: now - 2100,
      tier: 'mega',
    },
  ];
}

async function fetchRealAlerts(solPrice: number): Promise<WhaleAlert[]> {
  const connection = new Connection('https://api.mainnet-beta.solana.com', {
    commitment: 'confirmed',
    disableRetryOnRateLimit: true,
  });

  // Fetch recent signatures from Jupiter v6 and Raydium
  const [jupSigs, raysSigs] = await Promise.allSettled([
    connection.getSignaturesForAddress(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { toBase58: () => JUPITER_V6, toString: () => JUPITER_V6 } as any,
      { limit: 5 }
    ),
    connection.getSignaturesForAddress(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { toBase58: () => RAYDIUM_AMM, toString: () => RAYDIUM_AMM } as any,
      { limit: 5 }
    ),
  ]);

  const sigs: string[] = [];
  if (jupSigs.status === 'fulfilled') {
    sigs.push(...jupSigs.value.map(s => s.signature));
  }
  if (raysSigs.status === 'fulfilled') {
    sigs.push(...raysSigs.value.map(s => s.signature));
  }

  if (sigs.length === 0) return [];

  const alerts: WhaleAlert[] = [];

  // Fetch transactions in parallel (limit 6 to avoid rate limits)
  const txResults = await Promise.allSettled(
    sigs.slice(0, 6).map(sig =>
      connection.getTransaction(sig, {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed',
      })
    )
  );

  for (let i = 0; i < txResults.length; i++) {
    const result = txResults[i];
    if (result.status !== 'fulfilled' || !result.value) continue;
    const tx = result.value;
    if (!tx.meta || !tx.transaction) continue;

    const { preBalances, postBalances, preTokenBalances, postTokenBalances } = tx.meta;
    const accounts = tx.transaction.message.staticAccountKeys ?? [];

    // Check for large SOL movements (>50 SOL in one account)
    for (let j = 0; j < accounts.length; j++) {
      const pre = preBalances[j] ?? 0;
      const post = postBalances[j] ?? 0;
      const delta = Math.abs(post - pre) / LAMPORTS_PER_SOL;

      if (delta >= 50) {
        const amountUsd = delta * solPrice;
        alerts.push({
          signature: sigs[i],
          type: post > pre ? 'buy' : 'sell',
          token: 'SOL',
          amount: delta,
          amountUsd,
          wallet: accounts[j]?.toBase58() ?? 'Unknown',
          blockTime: tx.blockTime ?? Math.floor(Date.now() / 1000),
          tier: getWhaleTier(amountUsd),
        });
        break; // one alert per tx
      }
    }

    // Check for large token transfers (USDC, JUP, etc.)
    if (alerts.length === 0 || i > 2) {
      const tokenDiffs = new Map<string, { symbol: string; delta: number }>();
      for (const tBal of postTokenBalances ?? []) {
        const preBal = preTokenBalances?.find(
          p => p.accountIndex === tBal.accountIndex && p.mint === tBal.mint
        );
        const pre = Number(preBal?.uiTokenAmount.uiAmount ?? 0);
        const post = Number(tBal.uiTokenAmount.uiAmount ?? 0);
        const delta = Math.abs(post - pre);
        const symbol = tBal.mint === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' ? 'USDC' :
                       tBal.mint === 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN' ? 'JUP' : '';
        if (symbol && delta > 5000) {
          const prev = tokenDiffs.get(tBal.mint);
          if (!prev || delta > prev.delta) {
            tokenDiffs.set(tBal.mint, { symbol, delta });
          }
        }
      }
      for (const [, { symbol, delta }] of tokenDiffs) {
        const usdVal = symbol === 'USDC' ? delta : delta * 0.67; // JUP price approx
        if (usdVal >= 50_000) {
          const account0 = accounts[0]?.toBase58() ?? 'Unknown';
          alerts.push({
            signature: sigs[i],
            type: 'buy',
            token: symbol,
            amount: delta,
            amountUsd: usdVal,
            wallet: account0,
            blockTime: tx.blockTime ?? Math.floor(Date.now() / 1000),
            tier: getWhaleTier(usdVal),
          });
        }
      }
    }
  }

  return alerts.filter(a => a.amountUsd >= 50_000).slice(0, 5);
}

export async function GET(req: NextRequest) {
  const demo = req.nextUrl.searchParams.get('demo') === 'true';

  if (demo) {
    return Response.json({ alerts: getDemoAlerts(), source: 'demo' });
  }

  try {
    const solPrice = await getSolPrice();
    const realAlerts = await Promise.race([
      fetchRealAlerts(solPrice),
      new Promise<WhaleAlert[]>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 6000)
      ),
    ]);

    // Supplement real with demo data if not enough results
    const allAlerts = realAlerts.length >= 3
      ? realAlerts
      : [...realAlerts, ...getDemoAlerts().slice(0, 5 - realAlerts.length)];

    return Response.json({ alerts: allAlerts, source: realAlerts.length >= 3 ? 'live' : 'mixed' });
  } catch {
    return Response.json({ alerts: getDemoAlerts(), source: 'demo' });
  }
}
