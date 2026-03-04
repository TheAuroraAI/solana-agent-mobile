import { NextResponse } from 'next/server';

export const revalidate = 60; // Cache for 60 seconds

interface CoinGeckoEntry {
  usd: number;
  usd_24h_change: number;
}

const COINGECKO_IDS: Record<string, string> = {
  SOL: 'solana',
  JUP: 'jupiter-exchange-solana',
  BONK: 'bonk',
  WIF: 'dogwifcoin',
  RAY: 'raydium',
  PYTH: 'pyth-network',
  JitoSOL: 'jito-staked-sol',
  mSOL: 'msol',
  ORCA: 'orca',
};

export async function GET() {
  try {
    const ids = Object.values(COINGECKO_IDS).join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;

    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 },
    });

    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);

    const data: Record<string, CoinGeckoEntry> = await res.json();

    const prices: Record<string, { usd: number; change24h: number }> = {};
    for (const [symbol, cgId] of Object.entries(COINGECKO_IDS)) {
      const entry = data[cgId];
      if (entry) {
        prices[symbol] = {
          usd: entry.usd,
          change24h: entry.usd_24h_change ?? 0,
        };
      }
    }

    return NextResponse.json({ prices, source: 'coingecko', ts: Date.now() });
  } catch {
    // Static fallback
    return NextResponse.json({
      prices: {
        SOL: { usd: 153.5, change24h: 0 },
        JUP: { usd: 0.85, change24h: 0 },
        BONK: { usd: 0.000025, change24h: 0 },
        WIF: { usd: 2.1, change24h: 0 },
      },
      source: 'fallback',
      ts: Date.now(),
    });
  }
}
