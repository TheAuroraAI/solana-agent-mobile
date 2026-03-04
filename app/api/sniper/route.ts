export const runtime = 'nodejs';

interface DexPair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { address: string; symbol: string };
  priceNative: string;
  priceUsd?: string;
  txns: { h24: { buys: number; sells: number }; h1?: { buys: number; sells: number } };
  volume: { h24: number; h6?: number; h1?: number };
  priceChange: { h24: number; h6?: number; h1?: number };
  liquidity?: { usd?: number; base?: number; quote?: number };
  pairCreatedAt?: number;
  info?: { imageUrl?: string; websites?: Array<{ url: string }>; socials?: Array<{ type: string; url: string }> };
  boosts?: { active: number };
}

interface SniperPair {
  address: string;
  name: string;
  symbol: string;
  pairAddress: string;
  dex: string;
  priceUsd: number;
  change1h: number;
  change24h: number;
  volume1h: number;
  volume24h: number;
  liquidityUsd: number;
  buys1h: number;
  sells1h: number;
  ageMinutes: number;
  imageUrl: string | null;
  hasWebsite: boolean;
  hasTwitter: boolean;
  boosted: boolean;
}

let _cache: { pairs: SniperPair[]; ts: number } | null = null;
const CACHE_TTL = 60 * 1000; // 1 minute

function safeNum(v: unknown): number {
  const n = Number(v);
  return isFinite(n) ? n : 0;
}

function fetchWithTimeout(url: string, ms = 8000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(t));
}

async function fetchNewPairs(): Promise<SniperPair[]> {
  const now = Date.now();

  // DexScreener: latest Solana token profiles (boosted/promoted tokens)
  // + search for new pairs created in last 24h on Solana
  const results: SniperPair[] = [];

  try {
    // Fetch latest token boosts — these are actively promoted new tokens
    const [boostsRes, profilesRes] = await Promise.allSettled([
      fetchWithTimeout('https://api.dexscreener.com/token-boosts/latest/v1'),
      fetchWithTimeout('https://api.dexscreener.com/token-profiles/latest/v1'),
    ]);

    const boostAddresses: string[] = [];
    if (boostsRes.status === 'fulfilled' && boostsRes.value.ok) {
      const boostData = await boostsRes.value.json() as Array<{ tokenAddress?: string; chainId?: string }>;
      const solanaBoosts = (Array.isArray(boostData) ? boostData : [])
        .filter(b => b.chainId === 'solana' && b.tokenAddress)
        .slice(0, 15)
        .map(b => b.tokenAddress!);
      boostAddresses.push(...solanaBoosts);
    }

    const profileAddresses: string[] = [];
    if (profilesRes.status === 'fulfilled' && profilesRes.value.ok) {
      const profData = await profilesRes.value.json() as Array<{ tokenAddress?: string; chainId?: string }>;
      const solanaProfiles = (Array.isArray(profData) ? profData : [])
        .filter(p => p.chainId === 'solana' && p.tokenAddress)
        .slice(0, 10)
        .map(p => p.tokenAddress!);
      profileAddresses.push(...solanaProfiles);
    }

    // Deduplicate and batch-fetch pair data
    const allAddresses = [...new Set([...boostAddresses, ...profileAddresses])].slice(0, 20);

    if (allAddresses.length > 0) {
      const batchSize = 10;
      for (let i = 0; i < allAddresses.length; i += batchSize) {
        const batch = allAddresses.slice(i, i + batchSize);
        try {
          const res = await fetchWithTimeout(
            `https://api.dexscreener.com/latest/dex/tokens/${batch.join(',')}`,
            10000
          );
          if (!res.ok) continue;
          const data = await res.json() as { pairs?: DexPair[] };
          const pairs = (data?.pairs ?? []).filter(p => p.chainId === 'solana');

          for (const pair of pairs) {
            // Only include pairs with meaningful liquidity
            const liq = safeNum(pair.liquidity?.usd);
            if (liq < 1000) continue;

            const ageMs = pair.pairCreatedAt ? (now - pair.pairCreatedAt) : 0;
            const ageMinutes = Math.round(ageMs / 60000);

            results.push({
              address: pair.baseToken.address,
              name: pair.baseToken.name,
              symbol: pair.baseToken.symbol,
              pairAddress: pair.pairAddress,
              dex: pair.dexId,
              priceUsd: safeNum(pair.priceUsd),
              change1h: safeNum(pair.priceChange?.h1),
              change24h: safeNum(pair.priceChange?.h24),
              volume1h: safeNum(pair.volume?.h1),
              volume24h: safeNum(pair.volume?.h24),
              liquidityUsd: liq,
              buys1h: safeNum(pair.txns?.h1?.buys),
              sells1h: safeNum(pair.txns?.h1?.sells),
              ageMinutes,
              imageUrl: pair.info?.imageUrl ?? null,
              hasWebsite: (pair.info?.websites?.length ?? 0) > 0,
              hasTwitter: (pair.info?.socials ?? []).some(s => s.type === 'twitter'),
              boosted: (pair.boosts?.active ?? 0) > 0,
            });
          }
        } catch {
          // skip batch on error
        }
      }
    }
  } catch {
    // return empty on failure
  }

  // Deduplicate by address, sort by volume1h desc
  const seen = new Set<string>();
  return results
    .filter(p => {
      if (seen.has(p.address)) return false;
      seen.add(p.address);
      return true;
    })
    .sort((a, b) => b.volume1h - a.volume1h)
    .slice(0, 30);
}

export async function GET() {
  if (_cache && Date.now() - _cache.ts < CACHE_TTL) {
    return Response.json({ pairs: _cache.pairs, cached: true, lastUpdated: new Date(_cache.ts).toISOString() });
  }

  const pairs = await fetchNewPairs();
  _cache = { pairs, ts: Date.now() };

  return Response.json({ pairs, cached: false, lastUpdated: new Date().toISOString() });
}
