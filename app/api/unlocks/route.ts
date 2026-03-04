import { NextResponse } from 'next/server';

interface TokenUnlock {
  id: string;
  token: string;
  symbol: string;
  date: string;
  amount: number;
  amountUsd: number;
  pctSupply: number;
  category: 'team' | 'investor' | 'ecosystem' | 'community' | 'treasury';
  impact: 'high' | 'medium' | 'low';
  description: string;
  source: 'live' | 'enriched' | 'static';
}

// Token mint addresses for Jupiter price lookups
const TOKEN_MINTS: Record<string, string> = {
  JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  PYTH: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
  WIF: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
  RENDER: 'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  JTO: 'jtojtomepa8berK3RoB2g89rJGp8mH2e4oKo4KDQgAq',
  HNT: 'hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux',
  SOL: 'So11111111111111111111111111111111111111112',
};

// DefiLlama protocol slugs for emission schedule data
const DEFILLAMA_SLUGS: Array<{ slug: string; symbol: string; name: string }> = [
  { slug: 'jup', symbol: 'JUP', name: 'Jupiter' },
  { slug: 'pyth-network', symbol: 'PYTH', name: 'Pyth Network' },
  { slug: 'jito-staking', symbol: 'JTO', name: 'Jito' },
  { slug: 'render', symbol: 'RENDER', name: 'Render' },
  { slug: 'helium', symbol: 'HNT', name: 'Helium' },
];

// Fetch live token prices from Jupiter
async function fetchJupiterPrices(): Promise<Record<string, number>> {
  try {
    const mints = Object.values(TOKEN_MINTS).join(',');
    const res = await fetch(`https://api.jup.ag/price/v2?ids=${mints}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return {};
    const data = await res.json() as { data: Record<string, { price: string }> };
    
    const prices: Record<string, number> = {};
    for (const [sym, mint] of Object.entries(TOKEN_MINTS)) {
      const price = data.data[mint]?.price;
      if (price) prices[sym] = parseFloat(price);
    }
    return prices;
  } catch {
    return {};
  }
}

// Try to fetch upcoming unlock events from DefiLlama emission API
async function fetchDefiLlamaUnlocks(
  slug: string,
  symbol: string,
  name: string,
  prices: Record<string, number>,
): Promise<TokenUnlock[]> {
  try {
    const res = await fetch(`https://api.llama.fi/emission/${slug}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    
    type EmissionEvent = {
      timestamp: number;
      noOfTokens?: number[];
      description?: string;
      category?: string;
    };
    const data = await res.json() as { events?: EmissionEvent[] };
    const events = data.events ?? [];
    const now = Math.floor(Date.now() / 1000);
    const price = prices[symbol] ?? 0;
    
    return events
      .filter((e) => e.timestamp > now && e.timestamp < now + 30 * 86400)
      .slice(0, 2)
      .map((e, i): TokenUnlock => {
        const amount = (e.noOfTokens ?? [0]).reduce((a: number, b: number) => a + b, 0);
        const category = (e.category?.toLowerCase() ?? 'ecosystem') as TokenUnlock['category'];
        const validCategories: TokenUnlock['category'][] = ['team', 'investor', 'ecosystem', 'community', 'treasury'];
        const safeCategory: TokenUnlock['category'] = validCategories.includes(category) ? category : 'ecosystem';
        const amountUsd = amount * price;
        return {
          id: `${slug}-live-${i}`,
          token: name,
          symbol,
          date: new Date(e.timestamp * 1000).toISOString(),
          amount,
          amountUsd,
          pctSupply: 0,
          category: safeCategory,
          impact: amountUsd >= 50_000_000 ? 'high' : amountUsd >= 10_000_000 ? 'medium' : 'low',
          description: e.description ?? `${name} scheduled token unlock.`,
          source: 'live',
        };
      });
  } catch {
    return [];
  }
}

// Static schedule enriched with live prices
function getEnrichedStaticUnlocks(prices: Record<string, number>): TokenUnlock[] {
  const now = new Date();
  const p = prices;

  const raw = [
    {
      id: 'jup-1',
      token: 'Jupiter', symbol: 'JUP',
      date: new Date(now.getTime() + 4 * 86400000).toISOString(),
      amount: 125_000_000, pctSupply: 1.8,
      category: 'team' as const, impact: 'high' as const,
      description: 'Team & advisor vesting unlock. 125M JUP entering circulation.',
    },
    {
      id: 'pyth-1',
      token: 'Pyth Network', symbol: 'PYTH',
      date: new Date(now.getTime() + 7 * 86400000).toISOString(),
      amount: 250_000_000, pctSupply: 1.6,
      category: 'ecosystem' as const, impact: 'medium' as const,
      description: 'Publisher rewards & ecosystem grants unlock.',
    },
    {
      id: 'wif-1',
      token: 'dogwifhat', symbol: 'WIF',
      date: new Date(now.getTime() + 9 * 86400000).toISOString(),
      amount: 50_000_000, pctSupply: 5.1,
      category: 'community' as const, impact: 'high' as const,
      description: 'Community airdrop claim window opens. 5.1% of supply.',
    },
    {
      id: 'render-1',
      token: 'Render', symbol: 'RENDER',
      date: new Date(now.getTime() + 12 * 86400000).toISOString(),
      amount: 8_000_000, pctSupply: 1.5,
      category: 'investor' as const, impact: 'medium' as const,
      description: 'Series B investor tokens vest. 6-month cliff completed.',
    },
    {
      id: 'bonk-1',
      token: 'BONK', symbol: 'BONK',
      date: new Date(now.getTime() + 17 * 86400000).toISOString(),
      amount: 2_000_000_000_000, pctSupply: 2.9,
      category: 'treasury' as const, impact: 'low' as const,
      description: 'DAO treasury allocation for ecosystem incentives.',
    },
    {
      id: 'jto-1',
      token: 'Jito', symbol: 'JTO',
      date: new Date(now.getTime() + 19 * 86400000).toISOString(),
      amount: 15_000_000, pctSupply: 1.3,
      category: 'team' as const, impact: 'medium' as const,
      description: 'Core contributor vesting. Quarterly unlock schedule.',
    },
    {
      id: 'hnt-1',
      token: 'Helium', symbol: 'HNT',
      date: new Date(now.getTime() + 22 * 86400000).toISOString(),
      amount: 3_000_000, pctSupply: 1.9,
      category: 'ecosystem' as const, impact: 'low' as const,
      description: 'Network emissions & hotspot rewards distribution.',
    },
    {
      id: 'sol-1',
      token: 'Solana', symbol: 'SOL',
      date: new Date(now.getTime() + 29 * 86400000).toISOString(),
      amount: 5_000_000, pctSupply: 0.8,
      category: 'investor' as const, impact: 'high' as const,
      description: 'Foundation + early investor unlock. Major supply event.',
    },
  ];

  const STATIC_PRICES: Record<string, number> = { JUP: 0.90, PYTH: 0.35, WIF: 2.10, RENDER: 7.00, BONK: 0.000021, JTO: 3.00, HNT: 6.00, SOL: 160.00 };

  return raw.map(u => ({
    ...u,
    amountUsd: u.amount * (p[u.symbol] ?? STATIC_PRICES[u.symbol] ?? 0),
    source: 'enriched' as const,
  }));
}

export const revalidate = 3600;

export async function GET() {
  // Fetch live prices in parallel with DefiLlama unlock data
  const prices = await fetchJupiterPrices();
  
  const liveUnlockResults = await Promise.all(
    DEFILLAMA_SLUGS.map(({ slug, symbol, name }) =>
      fetchDefiLlamaUnlocks(slug, symbol, name, prices)
    )
  );

  const liveUnlocks = liveUnlockResults.flat();
  const hasLiveData = liveUnlocks.length >= 3;

  // If we have enough live unlock events, use those; otherwise use enriched static
  const unlocks = hasLiveData
    ? liveUnlocks.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : getEnrichedStaticUnlocks(prices).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const totalValueLocked = unlocks.reduce((s, u) => s + u.amountUsd, 0);
  const highImpact = unlocks.filter(u => u.impact === 'high').length;
  const source = hasLiveData ? 'defillama' : (Object.keys(prices).length > 0 ? 'enriched' : 'static');

  return NextResponse.json({
    unlocks,
    stats: {
      totalEvents: unlocks.length,
      totalValueUsd: totalValueLocked,
      highImpactCount: highImpact,
      nextUnlock: unlocks[0]?.date ?? null,
    },
    source,
    fetchedAt: new Date().toISOString(),
  });
}
