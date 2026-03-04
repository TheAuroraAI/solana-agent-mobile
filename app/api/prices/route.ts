import { NextResponse } from 'next/server';

export const revalidate = 60; // Cache for 60 seconds

// Mint addresses for DexScreener token lookup
const TOKEN_MINTS: Record<string, string> = {
  SOL: 'So11111111111111111111111111111111111111112',
  JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  WIF: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
  RAY: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
  PYTH: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
  jitoSOL: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',
  mSOL: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
  ORCA: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
};

function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } }).finally(
    () => clearTimeout(t)
  );
}

interface DexPair {
  baseToken?: { address?: string; symbol?: string };
  priceUsd?: string;
  priceChange?: { h24?: number };
}

// Fetch price + 24h change from DexScreener (free, no API key, no rate limits)
async function fetchDexScreenerPrices(): Promise<Record<string, { usd: number; change24h: number }>> {
  const addresses = Object.values(TOKEN_MINTS).join(',');
  const res = await fetchWithTimeout(
    `https://api.dexscreener.com/tokens/v1/solana/${addresses}`,
    8000
  );
  if (!res.ok) throw new Error(`DexScreener ${res.status}`);
  const pairs = await res.json() as DexPair[];

  // Build mint → best pair map (first occurrence wins, prefer higher liquidity)
  const mintToBestPair: Record<string, DexPair> = {};
  for (const pair of pairs) {
    const mint = pair.baseToken?.address;
    if (mint && !mintToBestPair[mint] && parseFloat(pair.priceUsd ?? '0') > 0) {
      mintToBestPair[mint] = pair;
    }
  }

  const prices: Record<string, { usd: number; change24h: number }> = {};
  for (const [symbol, mint] of Object.entries(TOKEN_MINTS)) {
    const pair = mintToBestPair[mint];
    if (pair) {
      prices[symbol] = {
        usd: parseFloat(pair.priceUsd ?? '0'),
        change24h: pair.priceChange?.h24 ?? 0,
      };
    }
  }
  return prices;
}

// CoinGecko fallback for symbols it knows
async function fetchCoinGeckoPrices(): Promise<Record<string, { usd: number; change24h: number }>> {
  const cgIds = 'solana,jupiter-exchange-solana,bonk,dogwifcoin,raydium,pyth-network,jito-staked-sol,msol,orca';
  const res = await fetchWithTimeout(
    `https://api.coingecko.com/api/v3/simple/price?ids=${cgIds}&vs_currencies=usd&include_24hr_change=true`,
    6000
  );
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const data = await res.json() as Record<string, { usd?: number; usd_24h_change?: number }>;

  const cgIdToSymbol: Record<string, string> = {
    solana: 'SOL',
    'jupiter-exchange-solana': 'JUP',
    bonk: 'BONK',
    dogwifcoin: 'WIF',
    raydium: 'RAY',
    'pyth-network': 'PYTH',
    'jito-staked-sol': 'JitoSOL',
    msol: 'mSOL',
    orca: 'ORCA',
  };

  const prices: Record<string, { usd: number; change24h: number }> = {};
  for (const [cgId, symbol] of Object.entries(cgIdToSymbol)) {
    const entry = data[cgId];
    if (entry?.usd && entry.usd > 0) {
      prices[symbol] = { usd: entry.usd, change24h: entry.usd_24h_change ?? 0 };
    }
  }
  return prices;
}

export async function GET() {
  // Try DexScreener first (free, no auth)
  try {
    const prices = await fetchDexScreenerPrices();
    if (Object.keys(prices).length > 0) {
      return NextResponse.json({ prices, source: 'dexscreener', ts: Date.now() });
    }
  } catch {
    // Fall through to CoinGecko
  }

  // CoinGecko fallback
  try {
    const prices = await fetchCoinGeckoPrices();
    if (Object.keys(prices).length > 0) {
      return NextResponse.json({ prices, source: 'coingecko', ts: Date.now() });
    }
  } catch {
    // Fall through to static
  }

  // Static fallback (updated March 2026)
  return NextResponse.json({
    prices: {
      SOL: { usd: 90, change24h: 0 },
      JUP: { usd: 0.19, change24h: 0 },
      BONK: { usd: 0.000006, change24h: 0 },
      WIF: { usd: 0.8, change24h: 0 },
      jitoSOL: { usd: 114, change24h: 0 },
      mSOL: { usd: 110, change24h: 0 },
    },
    source: 'fallback',
    ts: Date.now(),
  });
}
