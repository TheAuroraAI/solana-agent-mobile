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

// ─── GET Handler ──────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const protocols = await fetchDefiLlamaPools();

    if (protocols.length === 0) throw new Error('No Solana pools returned');

    const { bestSupply, bestBorrow } = computeBestRates(protocols);
    const totalTvlRaw = protocols.reduce((s, p) => {
      const n = parseFloat(p.tvl.replace(/[$BMK]/g, ''));
      const mult = p.tvl.endsWith('B') ? 1e9 : p.tvl.endsWith('M') ? 1e6 : 1e3;
      return s + n * mult;
    }, 0);

    return NextResponse.json({
      protocols,
      bestSupply,
      bestBorrow,
      totalTvl: fmtTvl(totalTvlRaw),
      lastUpdated: new Date().toISOString(),
      source: 'live',
    } satisfies DefiRatesData);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load DeFi rates' },
      { status: 500 },
    );
  }
}
