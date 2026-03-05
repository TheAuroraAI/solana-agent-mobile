import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const revalidate = 300; // Cache 5 min

// ─── Exported Types ───────────────────────────────────────────────────────────

export interface DefiToken {
  symbol: string;
  supplyApy: number;
  borrowApy: number;
  utilization: number;
  liquidity: string;
}

export interface DefiProtocol {
  id: string;
  name: string;
  logo: string;
  tvl: string;
  type: 'lending' | 'yield' | 'perps';
  tokens: DefiToken[];
}

export interface BestRate {
  symbol: string;
  apy: number;
  protocol: string;
}

export interface DefiRatesData {
  protocols: DefiProtocol[];
  bestSupply: BestRate;
  bestBorrow: BestRate;
  totalTvl: string;
  lastUpdated: string;
  source: 'live' | 'estimated';
}

// ─── Protocol metadata ────────────────────────────────────────────────────────

const PROTOCOL_META: Record<string, { id: string; name: string; logo: string; type: 'lending' | 'yield' | 'perps' }> = {
  'kamino-lend':           { id: 'kamino',    name: 'Kamino',    logo: '🌀', type: 'lending' },
  'kamino-liquidity':      { id: 'kamino',    name: 'Kamino',    logo: '🌀', type: 'yield'   },
  'jupiter-lend':          { id: 'jupiter',   name: 'Jupiter Lend', logo: '♃', type: 'lending' },
  'marginfi':              { id: 'marginfi',  name: 'Marginfi',  logo: '🏦', type: 'lending' },
  'marginfi-lst':          { id: 'marginfi',  name: 'Marginfi',  logo: '🏦', type: 'lending' },
  'save':                  { id: 'save',      name: 'Save',      logo: '💾', type: 'lending' },
  'drift-staked-sol':      { id: 'drift',     name: 'Drift',     logo: '🌊', type: 'yield'   },
  'loopscale':             { id: 'loopscale', name: 'Loopscale', logo: '🔄', type: 'lending' },
};

const KNOWN_TOKENS = new Set(['SOL', 'USDC', 'USDT', 'JUP', 'ETH', 'BTC', 'WSOL', 'MSOL', 'JITOSOL', 'WBTC', 'BONK', 'DSOL', 'JLP', 'CBBTC']);

function fmtTvl(usd: number): string {
  if (usd >= 1e9) return `$${(usd / 1e9).toFixed(2)}B`;
  if (usd >= 1e6) return `$${(usd / 1e6).toFixed(1)}M`;
  return `$${(usd / 1e3).toFixed(0)}K`;
}

// ─── Live Data Fetch ──────────────────────────────────────────────────────────

async function fetchDefiLlamaPools(): Promise<DefiProtocol[]> {
  const res = await fetch('https://yields.llama.fi/pools', {
    headers: { 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error(`DefiLlama pools API ${res.status}`);

  const data = await res.json() as { data: Record<string, unknown>[] };

  // Filter for Solana, known protocols, major tokens, meaningful TVL
  const relevant = data.data.filter((p) => {
    const project = p.project as string;
    const chain = p.chain as string;
    const symbol = ((p.symbol as string) ?? '').toUpperCase().split('-')[0];
    const tvl = (p.tvlUsd as number) ?? 0;
    return (
      chain === 'Solana' &&
      PROTOCOL_META[project] &&
      KNOWN_TOKENS.has(symbol) &&
      tvl > 500_000
    );
  });

  // Group by protocol
  const byProtocol = new Map<string, Record<string, unknown>[]>();
  for (const pool of relevant) {
    const project = pool.project as string;
    if (!byProtocol.has(project)) byProtocol.set(project, []);
    byProtocol.get(project)!.push(pool);
  }

  // Dedupe: use first protocol meta key found per id
  const seenIds = new Set<string>();
  const protocols: DefiProtocol[] = [];

  for (const [project, pools] of byProtocol) {
    const meta = PROTOCOL_META[project];
    if (seenIds.has(meta.id)) continue;
    seenIds.add(meta.id);

    const totalTvl = pools.reduce((s, p) => s + ((p.tvlUsd as number) || 0), 0);

    const tokens: DefiToken[] = pools
      .sort((a, b) => ((b.tvlUsd as number) || 0) - ((a.tvlUsd as number) || 0))
      .slice(0, 4)
      .map((p) => {
        const supplyApy = Math.round(
          (((p.apyBase as number) || 0) + ((p.apyReward as number) || 0)) * 100,
        ) / 100;
        const borrowRaw = (p.apyBaseBorrow as number) || 0;
        const borrowApy = Math.round(
          (borrowRaw > 0 ? borrowRaw : supplyApy * 1.4) * 100,
        ) / 100;
        const utilization = Math.round(((p.utilization as number) || 0.65) * 100);
        const symbol = ((p.symbol as string) || '').toUpperCase().split('-')[0];
        return {
          symbol,
          supplyApy,
          borrowApy,
          utilization,
          liquidity: fmtTvl((p.tvlUsd as number) || 0),
        };
      });

    if (tokens.length === 0) continue;

    protocols.push({
      id: meta.id,
      name: meta.name,
      logo: meta.logo,
      tvl: fmtTvl(totalTvl),
      type: meta.type,
      tokens,
    });
  }

  return protocols;
}

function computeBestRates(protocols: DefiProtocol[]): { bestSupply: BestRate; bestBorrow: BestRate } {
  let bestSupply: BestRate = { symbol: '', apy: 0, protocol: '' };
  let bestBorrow: BestRate = { symbol: '', apy: Infinity, protocol: '' };

  for (const p of protocols) {
    for (const t of p.tokens) {
      if (t.supplyApy > bestSupply.apy) bestSupply = { symbol: t.symbol, apy: t.supplyApy, protocol: p.name };
      if (t.borrowApy > 0 && t.borrowApy < bestBorrow.apy) bestBorrow = { symbol: t.symbol, apy: t.borrowApy, protocol: p.name };
    }
  }

  if (bestBorrow.apy === Infinity) bestBorrow = { symbol: 'USDC', apy: 0, protocol: '' };
  return { bestSupply, bestBorrow };
}

// ─── Fallback Data ────────────────────────────────────────────────────────────

const FALLBACK_PROTOCOLS: DefiProtocol[] = [
  {
    id: 'kamino',
    name: 'Kamino',
    logo: '🌀',
    tvl: '$1.2B',
    type: 'lending',
    tokens: [
      { symbol: 'USDC', supplyApy: 1.30, borrowApy: 2.60, utilization: 72, liquidity: '$420M' },
      { symbol: 'SOL',  supplyApy: 4.50, borrowApy: 7.20, utilization: 68, liquidity: '$380M' },
      { symbol: 'USDT', supplyApy: 1.10, borrowApy: 2.40, utilization: 65, liquidity: '$180M' },
    ],
  },
  {
    id: 'marginfi',
    name: 'Marginfi',
    logo: '🏦',
    tvl: '$890M',
    type: 'lending',
    tokens: [
      { symbol: 'USDC', supplyApy: 1.80, borrowApy: 3.10, utilization: 75, liquidity: '$310M' },
      { symbol: 'SOL',  supplyApy: 5.20, borrowApy: 8.10, utilization: 70, liquidity: '$290M' },
      { symbol: 'ETH',  supplyApy: 2.10, borrowApy: 3.80, utilization: 62, liquidity: '$95M'  },
    ],
  },
  {
    id: 'jupiter',
    name: 'Jupiter Lend',
    logo: '♃',
    tvl: '$551M',
    type: 'lending',
    tokens: [
      { symbol: 'USDC', supplyApy: 4.20, borrowApy: 6.50, utilization: 80, liquidity: '$320M' },
      { symbol: 'SOL',  supplyApy: 5.80, borrowApy: 9.10, utilization: 74, liquidity: '$180M' },
    ],
  },
  {
    id: 'drift',
    name: 'Drift',
    logo: '🌊',
    tvl: '$340M',
    type: 'yield',
    tokens: [
      { symbol: 'SOL',  supplyApy: 5.80, borrowApy: 0,    utilization: 100, liquidity: '$340M' },
      { symbol: 'USDC', supplyApy: 2.40, borrowApy: 4.20, utilization: 68,  liquidity: '$85M'  },
    ],
  },
  {
    id: 'save',
    name: 'Save',
    logo: '💾',
    tvl: '$210M',
    type: 'lending',
    tokens: [
      { symbol: 'USDC', supplyApy: 1.60, borrowApy: 2.90, utilization: 70, liquidity: '$120M' },
      { symbol: 'SOL',  supplyApy: 3.80, borrowApy: 6.10, utilization: 65, liquidity: '$75M'  },
    ],
  },
];

// ─── GET Handler ──────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const protocols = await Promise.race([
      fetchDefiLlamaPools(),
      new Promise<DefiProtocol[]>((_, reject) =>
        setTimeout(() => reject(new Error('DefiLlama timeout')), 10_000),
      ),
    ]);

    const live = protocols.length > 0 ? protocols : FALLBACK_PROTOCOLS;
    const source: 'live' | 'estimated' = protocols.length > 0 ? 'live' : 'estimated';

    const { bestSupply, bestBorrow } = computeBestRates(live);
    const totalTvlRaw = live.reduce((s, p) => {
      const n = parseFloat(p.tvl.replace(/[$BMK]/g, ''));
      const mult = p.tvl.endsWith('B') ? 1e9 : p.tvl.endsWith('M') ? 1e6 : 1e3;
      return s + n * mult;
    }, 0);

    return NextResponse.json({
      protocols: live,
      bestSupply,
      bestBorrow,
      totalTvl: fmtTvl(totalTvlRaw),
      lastUpdated: new Date().toISOString(),
      source,
    } satisfies DefiRatesData);
  } catch {
    // Final fallback — always return 200
    const { bestSupply, bestBorrow } = computeBestRates(FALLBACK_PROTOCOLS);
    return NextResponse.json({
      protocols: FALLBACK_PROTOCOLS,
      bestSupply,
      bestBorrow,
      totalTvl: '$3.2B',
      lastUpdated: new Date().toISOString(),
      source: 'estimated',
    } satisfies DefiRatesData);
  }
}
