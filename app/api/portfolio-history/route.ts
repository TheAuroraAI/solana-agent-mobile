import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

interface DataPoint {
  timestamp: number; // unix seconds
  totalUsd: number;
  solPrice: number;
}

// Fetch 7-day SOL price history from CoinCap (free, no key, good rate limits)
async function fetchSolPriceHistory(): Promise<Array<[number, number]>> {
  const end = Date.now();
  const start = end - 7 * 24 * 60 * 60 * 1000;
  const url = `https://api.coincap.io/v2/assets/solana/history?interval=d1&start=${start}&end=${end}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`CoinCap ${res.status}`);
    const data = await res.json() as { data: Array<{ time: number; priceUsd: string }> };
    return data.data.map((d) => [d.time, parseFloat(d.priceUsd)]);
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

// Fallback: fetch just current SOL price to build a flat line (no randomness)
async function fetchCurrentSolPrice(): Promise<number> {
  const res = await fetch(
    'https://api.dexscreener.com/tokens/v1/solana/So11111111111111111111111111111111111111112',
    { headers: { Accept: 'application/json' } },
  );
  if (!res.ok) throw new Error('DexScreener unavailable');
  const pairs = await res.json() as Array<{ baseToken?: { symbol?: string }; priceUsd?: string }>;
  const solPair = pairs.find((p) => p.baseToken?.symbol === 'SOL');
  const price = solPair?.priceUsd ? parseFloat(solPair.priceUsd) : 0;
  if (!price || price <= 0) throw new Error('No SOL price');
  return price;
}

// GET /api/portfolio-history?wallet=ADDRESS&solBalance=X&tokenUsd=Y
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const solBalanceStr = searchParams.get('solBalance');
  const tokenUsdStr = searchParams.get('tokenUsd') ?? '0';
  const solBalance = solBalanceStr ? parseFloat(solBalanceStr) : NaN;
  const tokenUsd = parseFloat(tokenUsdStr);

  if (!solBalanceStr || isNaN(solBalance) || solBalance < 0) {
    // No wallet connected — return empty (no fake demo data)
    return NextResponse.json({ points: [], source: 'empty', requiresWallet: true });
  }

  try {
    const prices = await fetchSolPriceHistory();
    const points: DataPoint[] = prices.map(([ms, price]) => ({
      timestamp: ms / 1000,
      totalUsd: solBalance * price + tokenUsd,
      solPrice: price,
    }));
    return NextResponse.json({ points, source: 'live' });
  } catch {
    // Fallback: use current SOL price to build a flat line (no random variance)
    try {
      const currentSolPrice = await fetchCurrentSolPrice();
      const now = Date.now();
      const points: DataPoint[] = Array.from({ length: 8 }, (_, i) => {
        const ts = now - (7 - i) * 86_400_000;
        return {
          timestamp: ts / 1000,
          totalUsd: solBalance * currentSolPrice + tokenUsd,
          solPrice: currentSolPrice,
        };
      });
      return NextResponse.json({ points, source: 'estimated' });
    } catch {
      return NextResponse.json({ points: [], source: 'error' }, { status: 503 });
    }
  }
}
