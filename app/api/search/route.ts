import { NextResponse } from 'next/server';

export interface SearchToken {
  symbol: string;
  name: string;
  mint: string;
  decimals: number;
  logoURI: string | null;
  price: number | null;
  change24h: number | null;
  volume24h: number | null;
}

interface JupToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  tags?: string[];
}

// Cache Jupiter token list in memory for the session
let cachedTokens: JupToken[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function getJupTokens(): Promise<JupToken[]> {
  if (cachedTokens && Date.now() - cacheTime < CACHE_TTL) return cachedTokens;
  const res = await fetch('https://tokens.jup.ag/tokens?tags=verified', {
    next: { revalidate: 600 },
  });
  if (!res.ok) throw new Error('Jupiter token list unavailable');
  const tokens: JupToken[] = await res.json();
  cachedTokens = tokens;
  cacheTime = Date.now();
  return tokens;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get('q') ?? '').trim().toLowerCase();

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [], query });
  }

  try {
    const tokens = await getJupTokens();

    // Score and filter tokens
    const scored = tokens
      .map((t) => {
        const sym = t.symbol.toLowerCase();
        const name = t.name.toLowerCase();
        const addr = t.address.toLowerCase();
        let score = 0;
        if (sym === query) score += 100;
        else if (sym.startsWith(query)) score += 80;
        else if (sym.includes(query)) score += 50;
        else if (name.startsWith(query)) score += 40;
        else if (name.includes(query)) score += 20;
        else if (addr === query) score += 120; // exact mint match
        else return null;
        return { token: t, score };
      })
      .filter((x): x is { token: JupToken; score: number } => x !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);

    if (scored.length === 0) {
      return NextResponse.json({ results: [], query });
    }

    // Fetch prices from Jupiter for matched tokens
    const mints = scored.map((s) => s.token.address).join(',');
    let prices: Record<string, { price: number | null; extraInfo?: { priceChange24h?: { percentage?: number }; quotedVolume24hUSD?: number } }> = {};

    try {
      const priceRes = await fetch(`https://api.jup.ag/price/v2?ids=${mints}`, {
        next: { revalidate: 30 },
      });
      if (priceRes.ok) {
        const priceData = await priceRes.json();
        prices = priceData.data ?? {};
      }
    } catch { /* prices stay empty */ }

    const results: SearchToken[] = scored.map(({ token }) => {
      const p = prices[token.address];
      return {
        symbol: token.symbol,
        name: token.name,
        mint: token.address,
        decimals: token.decimals,
        logoURI: token.logoURI ?? null,
        price: p?.price ?? null,
        change24h: p?.extraInfo?.priceChange24h?.percentage ?? null,
        volume24h: p?.extraInfo?.quotedVolume24hUSD ?? null,
      };
    });

    return NextResponse.json({ results, query });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Search failed', results: [], query },
      { status: 502 }
    );
  }
}
