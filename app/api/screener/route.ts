import { NextResponse, type NextRequest } from 'next/server';

export const revalidate = 300; // Cache 5 min

export type SortField = 'marketCap' | 'volume24h' | 'price' | 'change24h' | 'change7d' | 'txCount' | 'holders';
export type SortDir = 'asc' | 'desc';

export interface ScreenerToken {
  id: string;
  symbol: string;
  name: string;
  logo: string;
  price: number;
  marketCap: number;
  volume24h: number;
  change24h: number;
  change7d: number;
  change30d: number;
  txCount24h: number;
  holders: number;
  liquidity: number;
  fdv: number;
  ath: number;
  athChangePercent: number;
  launchDate: string;
  category: 'defi' | 'meme' | 'gaming' | 'ai' | 'infra' | 'nft';
  isVerified: boolean;
  tags: string[];
}

export interface ScreenerData {
  tokens: ScreenerToken[];
  totalCount: number;
  lastUpdated: string;
  source: 'live' | 'estimated';
}

// ─── Token metadata (logos + category — not available from CoinGecko) ─────────

const TOKEN_META: Record<string, {
  logo: string;
  category: ScreenerToken['category'];
  tags: string[];
  isVerified: boolean;
  launchDate: string;
}> = {
  SOL:    { logo: '◎',  category: 'infra',  tags: ['layer1', 'smart-contracts'],           isVerified: true,  launchDate: '2020-03-16' },
  JUP:    { logo: '🪐', category: 'defi',   tags: ['aggregator', 'swap', 'dex'],            isVerified: true,  launchDate: '2024-01-31' },
  BONK:   { logo: '🐶', category: 'meme',   tags: ['meme', 'dog-coin'],                     isVerified: true,  launchDate: '2022-12-25' },
  WIF:    { logo: '🎩', category: 'meme',   tags: ['meme', 'dog-coin'],                     isVerified: true,  launchDate: '2023-11-20' },
  RAY:    { logo: '⚡', category: 'defi',   tags: ['dex', 'amm', 'liquidity'],              isVerified: true,  launchDate: '2021-02-21' },
  PYTH:   { logo: '🔮', category: 'infra',  tags: ['oracle', 'price-feed'],                 isVerified: true,  launchDate: '2023-08-09' },
  JTO:    { logo: '🔷', category: 'defi',   tags: ['liquid-staking', 'mev'],               isVerified: true,  launchDate: '2023-12-07' },
  ORCA:   { logo: '🐋', category: 'defi',   tags: ['dex', 'amm', 'clmm'],                  isVerified: true,  launchDate: '2021-03-04' },
  MSOL:   { logo: '🫙', category: 'defi',   tags: ['liquid-staking'],                       isVerified: true,  launchDate: '2021-10-12' },
  MNDE:   { logo: '🔵', category: 'defi',   tags: ['governance', 'liquid-staking'],         isVerified: true,  launchDate: '2021-10-20' },
  DRIFT:  { logo: '🌊', category: 'defi',   tags: ['perps', 'dex'],                         isVerified: true,  launchDate: '2023-11-10' },
  KMNO:   { logo: '🌀', category: 'defi',   tags: ['lending', 'yield'],                     isVerified: true,  launchDate: '2024-01-10' },
  RENDER: { logo: '🖥️', category: 'ai',    tags: ['gpu', 'rendering', 'decentralized'],    isVerified: true,  launchDate: '2020-07-23' },
  HNT:    { logo: '📡', category: 'infra',  tags: ['iot', 'wireless', 'helium'],            isVerified: true,  launchDate: '2019-07-29' },
  MOBILE: { logo: '📶', category: 'infra',  tags: ['wireless', 'helium'],                   isVerified: true,  launchDate: '2023-03-20' },
  POPCAT: { logo: '🐱', category: 'meme',   tags: ['meme', 'cat-coin'],                     isVerified: false, launchDate: '2024-01-01' },
  MEW:    { logo: '🐈', category: 'meme',   tags: ['meme', 'cat-coin'],                     isVerified: false, launchDate: '2024-03-01' },
  BOME:   { logo: '📚', category: 'meme',   tags: ['meme'],                                 isVerified: false, launchDate: '2024-03-14' },
  FLOKI:  { logo: '⚡', category: 'meme',   tags: ['meme', 'dog-coin'],                     isVerified: true,  launchDate: '2021-06-25' },
  SAMO:   { logo: '🐕', category: 'meme',   tags: ['meme', 'dog-coin'],                     isVerified: false, launchDate: '2021-04-01' },
};

// ─── CoinGecko fetch ──────────────────────────────────────────────────────────

interface CoinGeckoToken {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency: number;
  price_change_percentage_30d_in_currency: number;
  fully_diluted_valuation: number | null;
  ath: number;
  ath_change_percentage: number;
  market_cap_rank: number;
  circulating_supply: number;
  total_supply: number | null;
}

async function fetchCoinGeckoTokens(): Promise<CoinGeckoToken[]> {
  // Fetch top Solana ecosystem tokens + SOL by market cap
  const [solanaEco, sol] = await Promise.allSettled([
    fetch(
      'https://api.coingecko.com/api/v3/coins/markets' +
      '?vs_currency=usd&category=solana-ecosystem' +
      '&order=market_cap_desc&per_page=20&page=1' +
      '&sparkline=false&price_change_percentage=7d,30d',
      { headers: { 'Accept': 'application/json' } },
    ).then((r) => r.ok ? r.json() as Promise<CoinGeckoToken[]> : Promise.reject(r.status)),
    fetch(
      'https://api.coingecko.com/api/v3/coins/markets' +
      '?vs_currency=usd&ids=solana' +
      '&sparkline=false&price_change_percentage=7d,30d',
      { headers: { 'Accept': 'application/json' } },
    ).then((r) => r.ok ? r.json() as Promise<CoinGeckoToken[]> : Promise.reject(r.status)),
  ]);

  const eco = solanaEco.status === 'fulfilled' ? solanaEco.value : [];
  const solArr = sol.status === 'fulfilled' ? sol.value : [];

  // Merge SOL at the top, dedup
  const seen = new Set<string>();
  const merged: CoinGeckoToken[] = [];
  for (const t of [...solArr, ...eco]) {
    if (!seen.has(t.symbol.toUpperCase())) {
      seen.add(t.symbol.toUpperCase());
      merged.push(t);
    }
  }

  if (merged.length === 0) throw new Error('CoinGecko returned no tokens');
  return merged.slice(0, 20);
}

function mapToScreenerToken(cg: CoinGeckoToken): ScreenerToken {
  const sym = cg.symbol.toUpperCase();
  const meta = TOKEN_META[sym];

  return {
    id: cg.id,
    symbol: sym,
    name: cg.name,
    logo: meta?.logo ?? '●',
    price: cg.current_price ?? 0,
    marketCap: cg.market_cap ?? 0,
    volume24h: cg.total_volume ?? 0,
    change24h: Math.round((cg.price_change_percentage_24h ?? 0) * 100) / 100,
    change7d: Math.round((cg.price_change_percentage_7d_in_currency ?? 0) * 100) / 100,
    change30d: Math.round((cg.price_change_percentage_30d_in_currency ?? 0) * 100) / 100,
    txCount24h: 0,  // Not available from CoinGecko
    holders: 0,     // Not available from CoinGecko
    liquidity: 0,   // Not available from CoinGecko
    fdv: cg.fully_diluted_valuation ?? cg.market_cap ?? 0,
    ath: cg.ath ?? 0,
    athChangePercent: Math.round((cg.ath_change_percentage ?? 0) * 100) / 100,
    launchDate: meta?.launchDate ?? '2021-01-01',
    category: meta?.category ?? 'defi',
    isVerified: meta?.isVerified ?? false,
    tags: meta?.tags ?? [],
  };
}

// ─── Filters ──────────────────────────────────────────────────────────────────

function applyFilters(
  tokens: ScreenerToken[],
  category: string,
  minMcap: number,
  maxMcap: number,
  sort: SortField,
  dir: SortDir,
): ScreenerToken[] {
  let result = [...tokens];

  if (category && category !== 'all') {
    result = result.filter((t) => t.category === category);
  }
  if (minMcap > 0) result = result.filter((t) => t.marketCap >= minMcap);
  if (maxMcap > 0) result = result.filter((t) => t.marketCap <= maxMcap);

  const fieldMap: Record<SortField, keyof ScreenerToken> = {
    marketCap: 'marketCap', volume24h: 'volume24h', price: 'price',
    change24h: 'change24h', change7d: 'change7d', txCount: 'txCount24h', holders: 'holders',
  };
  const key = fieldMap[sort];
  result.sort((a, b) => {
    const av = a[key] as number;
    const bv = b[key] as number;
    return dir === 'asc' ? av - bv : bv - av;
  });

  return result;
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sort = (searchParams.get('sort') ?? 'marketCap') as SortField;
  const dir = (searchParams.get('dir') ?? 'desc') as SortDir;
  const category = searchParams.get('category') ?? 'all';
  const minMcap = Number(searchParams.get('minMcap') ?? '0');
  const maxMcap = Number(searchParams.get('maxMcap') ?? '0');

  try {
    const cgTokens = await fetchCoinGeckoTokens();
    const tokens = cgTokens.map(mapToScreenerToken);
    const filtered = applyFilters(tokens, category, minMcap, maxMcap, sort, dir);

    return NextResponse.json({
      tokens: filtered,
      totalCount: filtered.length,
      lastUpdated: new Date().toISOString(),
      source: 'live',
    } satisfies ScreenerData);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load screener data' },
      { status: 500 },
    );
  }
}
