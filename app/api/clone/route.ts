import { NextResponse } from 'next/server';
import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { getSolPrice } from '@/lib/solana';

const MAINNET_RPC = 'https://api.mainnet-beta.solana.com';

const KNOWN_TOKENS: Record<string, { symbol: string; decimals: number }> = {
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: { symbol: 'USDC', decimals: 6 },
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: { symbol: 'USDT', decimals: 6 },
  mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So: { symbol: 'mSOL', decimals: 9 },
  J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn: { symbol: 'jitoSOL', decimals: 9 },
  bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1: { symbol: 'bSOL', decimals: 9 },
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: { symbol: 'BONK', decimals: 5 },
  JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN: { symbol: 'JUP', decimals: 6 },
  HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3: { symbol: 'PYTH', decimals: 6 },
  rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof: { symbol: 'RENDER', decimals: 8 },
  EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm: { symbol: 'WIF', decimals: 6 },
};

// Staked SOL variants that should use SOL price
const STAKED_SOL_MINTS = new Set([
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', // mSOL
  'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn', // jitoSOL
  'bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1',  // bSOL
]);

// Stablecoins that use face value ($1)
const STABLECOIN_MINTS = new Set([
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
]);

interface TokenHolding {
  mint: string;
  symbol: string;
  amount: number;
  pct: number;
}

interface CloneData {
  address: string;
  label: string;
  solBalance: number;
  solPct: number;
  tokens: TokenHolding[];
  totalValueUsd: number;
  lastActive: number;
  pnl7d: number;
}

const DEMO_CLONE_DATA: CloneData[] = [
  {
    address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    label: 'Galaxy Digital',
    solBalance: 184293,
    solPct: 62,
    tokens: [
      { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', amount: 4200000, pct: 16 },
      { mint: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn', symbol: 'jitoSOL', amount: 28400, pct: 11 },
      { mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', symbol: 'JUP', amount: 8500000, pct: 8 },
      { mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', symbol: 'BONK', amount: 95000000000, pct: 3 },
    ],
    totalValueUsd: 41580000,
    lastActive: Math.floor(Date.now() / 1000) - 420,
    pnl7d: 12.4,
  },
  {
    address: 'CuieVDEDtLo7FypA9SbLM9saXFdb1dsshEkyErMqkRQq',
    label: 'Jump Trading',
    solBalance: 95720,
    solPct: 44,
    tokens: [
      { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', amount: 8900000, pct: 29 },
      { mint: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', symbol: 'mSOL', amount: 42000, pct: 14 },
      { mint: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3', symbol: 'PYTH', amount: 15000000, pct: 8 },
      { mint: 'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof', symbol: 'RENDER', amount: 280000, pct: 5 },
    ],
    totalValueUsd: 30200000,
    lastActive: Math.floor(Date.now() / 1000) - 180,
    pnl7d: -3.2,
  },
  {
    address: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH',
    label: 'Wintermute',
    solBalance: 312500,
    solPct: 71,
    tokens: [
      { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', amount: 12400000, pct: 20 },
      { mint: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn', symbol: 'jitoSOL', amount: 18900, pct: 5 },
      { mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', symbol: 'WIF', amount: 4200000, pct: 4 },
    ],
    totalValueUsd: 61800000,
    lastActive: Math.floor(Date.now() / 1000) - 60,
    pnl7d: 8.7,
  },
  {
    address: 'GaBp2QPHATz1LuW2p3JhRjPqSq2xQX4HnRVrwwzYngh',
    label: 'DeFi Whale #1',
    solBalance: 48200,
    solPct: 38,
    tokens: [
      { mint: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn', symbol: 'jitoSOL', amount: 52000, pct: 30 },
      { mint: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', symbol: 'mSOL', amount: 31000, pct: 18 },
      { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', amount: 1800000, pct: 14 },
    ],
    totalValueUsd: 18400000,
    lastActive: Math.floor(Date.now() / 1000) - 900,
    pnl7d: 22.1,
  },
];

// Batch-fetch token prices from Jupiter price API
async function fetchJupiterPrices(mints: string[]): Promise<Record<string, number>> {
  if (mints.length === 0) return {};
  try {
    const ids = mints.join(',');
    const res = await fetch(`https://api.jup.ag/price/v2?ids=${ids}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return {};
    const data = await res.json() as { data: Record<string, { price: string } | null> };
    const prices: Record<string, number> = {};
    for (const [mint, entry] of Object.entries(data.data)) {
      if (entry?.price) {
        prices[mint] = parseFloat(entry.price);
      }
    }
    return prices;
  } catch {
    return {};
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const demo = url.searchParams.get('demo') === 'true';
  const wallet = url.searchParams.get('wallet');

  if (demo || !wallet) {
    return NextResponse.json({
      wallets: DEMO_CLONE_DATA,
      source: 'demo',
    });
  }

  // Live wallet lookup
  try {
    const connection = new Connection(MAINNET_RPC, {
      commitment: 'confirmed',
    });
    const pubkey = new PublicKey(wallet);

    const [lamports, tokenAccounts] = await Promise.all([
      connection.getBalance(pubkey).catch(() => 0),
      connection.getParsedTokenAccountsByOwner(
        pubkey,
        { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
      ).catch(() => ({ value: [] })),
    ]);

    const solBalance = lamports / LAMPORTS_PER_SOL;
    const tokens: TokenHolding[] = tokenAccounts.value
      .filter(ta => {
        const amount = ta.account.data.parsed.info.tokenAmount;
        return amount.uiAmount > 0;
      })
      .map(ta => {
        const info = ta.account.data.parsed.info;
        const known = KNOWN_TOKENS[info.mint];
        return {
          mint: info.mint,
          symbol: known?.symbol ?? info.mint.slice(0, 4) + '…',
          amount: info.tokenAmount.uiAmount,
          pct: 0,
        };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);

    // Fetch SOL price and Jupiter prices for all non-stablecoin, non-staked-SOL mints
    const solPrice = await getSolPrice();

    const mintsToFetch = tokens
      .map(t => t.mint)
      .filter(m => !STABLECOIN_MINTS.has(m) && !STAKED_SOL_MINTS.has(m));

    const jupPrices = await fetchJupiterPrices(mintsToFetch);

    // Compute token USD values using real prices
    const tokenUsdValues = tokens.map(t => {
      if (STABLECOIN_MINTS.has(t.mint)) return t.amount;           // $1 face value
      if (STAKED_SOL_MINTS.has(t.mint)) return t.amount * solPrice; // ~1:1 with SOL
      return t.amount * (jupPrices[t.mint] ?? 0);                   // live Jupiter price
    });

    const totalTokenUsd = tokenUsdValues.reduce((s, v) => s + v, 0);
    const totalEstimate = solBalance * solPrice + totalTokenUsd;

    const solPct = totalEstimate > 0 ? Math.round((solBalance * solPrice / totalEstimate) * 100) : 100;

    // Assign pct to each token
    const tokensWithPct: TokenHolding[] = tokens.map((t, i) => ({
      ...t,
      pct: totalEstimate > 0 ? Math.round((tokenUsdValues[i] / totalEstimate) * 100) : 0,
    }));

    const result: CloneData = {
      address: wallet,
      label: 'Custom Wallet',
      solBalance,
      solPct,
      tokens: tokensWithPct,
      totalValueUsd: totalEstimate,
      lastActive: Math.floor(Date.now() / 1000),
      pnl7d: 0,
    };

    return NextResponse.json({
      wallets: [result],
      source: 'live',
    });
  } catch {
    return NextResponse.json({
      wallets: DEMO_CLONE_DATA,
      source: 'demo',
    });
  }
}
