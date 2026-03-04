import { NextResponse } from 'next/server';

export const revalidate = 120;

export interface TrendingToken {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number;
  total_volume: number;
  market_cap: number;
  market_cap_rank: number | null;
}

interface Tab {
  label: string;
  tokens: TrendingToken[];
}

export interface TrendingData {
  tabs: Record<string, Tab>;
  source: string;
  ts: number;
}

async function fetchCategory(order: string, label: string): Promise<{ label: string; tokens: TrendingToken[] }> {
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=solana-ecosystem&order=${order}&per_page=15&page=1&sparkline=false&price_change_percentage=24h`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 120 },
  });
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const raw: TrendingToken[] = await res.json();
  return { label, tokens: raw };
}

export async function GET() {
  try {
    const [gainers, volume, mcap] = await Promise.all([
      fetchCategory('price_change_percentage_24h_desc', 'Top Gainers'),
      fetchCategory('volume_desc', 'High Volume'),
      fetchCategory('market_cap_desc', 'Large Cap'),
    ]);

    const losers = {
      label: 'Top Losers',
      tokens: [...gainers.tokens].reverse().slice(0, 15),
    };

    return NextResponse.json({
      tabs: { gainers, losers, volume, mcap },
      source: 'coingecko',
      ts: Date.now(),
    } satisfies TrendingData);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch' },
      { status: 502 }
    );
  }
}
