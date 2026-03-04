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
    return data.data.map(d => [d.time, parseFloat(d.priceUsd)]);
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

// GET /api/portfolio-history?wallet=ADDRESS&solBalance=X&tokenUsd=Y
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const demo = searchParams.get('demo') === 'true';
  const solBalance = parseFloat(searchParams.get('solBalance') ?? '0');
  const tokenUsdStr = searchParams.get('tokenUsd') ?? '0';
  const tokenUsd = parseFloat(tokenUsdStr);

  // Build demo points
  if (demo || isNaN(solBalance)) {
    const now = Date.now();
    const demoPoints: DataPoint[] = Array.from({ length: 8 }, (_, i) => {
      const ts = now - (7 - i) * 86_400_000;
      const solPrice = 180 + Math.sin(i * 0.9) * 15 + Math.random() * 8;
      return { timestamp: ts / 1000, totalUsd: 3.2 * solPrice + 450, solPrice };
    });
    return NextResponse.json({ points: demoPoints, source: 'demo' });
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
    // Fallback: fetch current SOL price from DexScreener to seed the estimate
    let currentSolPrice = 91;
    try {
      const dexRes = await fetch('https://api.dexscreener.com/tokens/v1/solana/So11111111111111111111111111111111111111112');
      if (dexRes.ok) {
        const pairs = await dexRes.json() as Array<{ baseToken?: { symbol?: string }; priceUsd?: string }>;
        const solPair = pairs.find((p) => p.baseToken?.symbol === 'SOL');
        const p = solPair?.priceUsd ? parseFloat(solPair.priceUsd) : 0;
        if (p > 0) currentSolPrice = p;
      }
    } catch { /* keep default */ }

    const now = Date.now();
    const points: DataPoint[] = Array.from({ length: 8 }, (_, i) => {
      const ts = now - (7 - i) * 86_400_000;
      const variance = 1 + (Math.random() - 0.5) * 0.12;
      const solPrice = currentSolPrice * variance;
      return { timestamp: ts / 1000, totalUsd: solBalance * solPrice + tokenUsd, solPrice };
    });
    return NextResponse.json({ points, source: 'estimated' });
  }
}
