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

    // Estimate percentages
    const solPrice = await getSolPrice();
    const totalEstimate = solBalance * solPrice + tokens.reduce((s, t) => {
      if (t.symbol === 'USDC' || t.symbol === 'USDT') return s + t.amount;
      return s + t.amount * 0.01; // rough estimate
    }, 0);

    const solPct = totalEstimate > 0 ? Math.round((solBalance * solPrice / totalEstimate) * 100) : 100;

    const result: CloneData = {
      address: wallet,
      label: 'Custom Wallet',
      solBalance,
      solPct,
      tokens,
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
