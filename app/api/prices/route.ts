import { NextResponse } from 'next/server';

export const revalidate = 60; // Cache for 60 seconds

// Mint addresses for Jupiter Price API v2 (no rate limits, no API key)
const TOKEN_MINTS: Record<string, string> = {
  SOL: 'So11111111111111111111111111111111111111112',
  JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  WIF: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
  RAY: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
  PYTH: 'HZ1JovNiVvGrG13dwM6KKWV1Yc3G3PcN2s8NjjE4GFYC',
  JitoSOL: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',
  mSOL: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
  ORCA: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
};

const MINT_TO_SYMBOL = Object.fromEntries(
  Object.entries(TOKEN_MINTS).map(([symbol, mint]) => [mint, symbol])
);

function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } }).finally(
    () => clearTimeout(t)
  );
}

// Fetch 24h price changes from DexScreener (free, no API key, generous limits)
async function fetch24hChanges(): Promise<Record<string, number>> {
  try {
    const addresses = Object.values(TOKEN_MINTS).join(',');
    const res = await fetchWithTimeout(
      `https://api.dexscreener.com/tokens/v1/solana/${addresses}`,
      8000
    );
    if (!res.ok) return {};
    const pairs: Array<{
      baseToken?: { address?: string };
      priceChangeH24?: number;
    }> = await res.json();

    const changes: Record<string, number> = {};
    for (const pair of pairs) {
      const mint = pair.baseToken?.address;
      const symbol = mint ? MINT_TO_SYMBOL[mint] : undefined;
      if (symbol && typeof pair.priceChangeH24 === 'number' && !(symbol in changes)) {
        changes[symbol] = pair.priceChangeH24;
      }
    }
    return changes;
  } catch {
    return {};
  }
}

export async function GET() {
  try {
    const ids = Object.values(TOKEN_MINTS).join(',');

    // Fetch Jupiter prices + DexScreener 24h changes in parallel
    const [jupRes, changes] = await Promise.all([
      fetchWithTimeout(`https://api.jup.ag/price/v2?ids=${ids}`, 8000),
      fetch24hChanges(),
    ]);

    if (!jupRes.ok) throw new Error(`Jupiter ${jupRes.status}`);

    const jupData: { data: Record<string, { price: string }> } = await jupRes.json();

    const prices: Record<string, { usd: number; change24h: number }> = {};
    for (const [symbol, mint] of Object.entries(TOKEN_MINTS)) {
      const entry = jupData.data[mint];
      if (entry) {
        prices[symbol] = {
          usd: parseFloat(entry.price),
          change24h: changes[symbol] ?? 0,
        };
      }
    }

    return NextResponse.json({ prices, source: 'jupiter', ts: Date.now() });
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
