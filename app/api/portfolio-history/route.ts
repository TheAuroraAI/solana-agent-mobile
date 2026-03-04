import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

interface DataPoint {
  timestamp: number; // unix seconds
  totalUsd: number;
  solPrice: number;
}

// Fetch 7-day SOL price history from CoinGecko (no key needed)
async function fetchSolPriceHistory(): Promise<Array<[number, number]>> {
  const url = 'https://api.coingecko.com/api/v3/coins/solana/market_chart?vs_currency=usd&days=7&interval=daily';
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const data = await res.json() as { prices: Array<[number, number]> };
  return data.prices;
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
      // Estimate portfolio value at each historical SOL price
      // (tokens are marked at current value as we don't have historical token prices)
      totalUsd: solBalance * price + tokenUsd,
      solPrice: price,
    }));

    return NextResponse.json({ points, source: 'live' });
  } catch {
    // Fallback: generate synthetic history from current balance
    const now = Date.now();
    const currentSolPrice = 170; // rough estimate if CoinGecko fails
    const points: DataPoint[] = Array.from({ length: 8 }, (_, i) => {
      const ts = now - (7 - i) * 86_400_000;
      const variance = 1 + (Math.random() - 0.5) * 0.12;
      const solPrice = currentSolPrice * variance;
      return { timestamp: ts / 1000, totalUsd: solBalance * solPrice + tokenUsd, solPrice };
    });
    return NextResponse.json({ points, source: 'estimated' });
  }
}
