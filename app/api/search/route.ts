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

    // Fetch prices from DexScreener for matched tokens (free, no auth)
    const mints = scored.map((s) => s.token.address).join(',');
    const dexPrices: Record<string, { price: number | null; change24h: number | null }> = {};

    try {
      const priceRes = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${mints}`, {
        next: { revalidate: 30 },
      });
      if (priceRes.ok) {
        const pairs = await priceRes.json() as Array<{ baseToken?: { address?: string }; priceUsd?: string; priceChange?: { h24?: number } }>;
        for (const pair of pairs) {
          const mint = pair.baseToken?.address;
          if (mint && !dexPrices[mint]) {
            dexPrices[mint] = {
              price: pair.priceUsd ? parseFloat(pair.priceUsd) : null,
              change24h: pair.priceChange?.h24 ?? null,
            };
          }
        }
      }
    } catch { /* prices stay empty */ }

    const results: SearchToken[] = scored.map(({ token }) => {
      const p = dexPrices[token.address];
      return {
        symbol: token.symbol,
        name: token.name,
        mint: token.address,
        decimals: token.decimals,
        logoURI: token.logoURI ?? null,
        price: p?.price ?? null,
        change24h: p?.change24h ?? null,
        volume24h: null,
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
