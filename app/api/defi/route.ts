import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const revalidate = 60;

// ─── Exported Types ───────────────────────────────────────────────────────────

export interface DefiToken {
  symbol: string;
  supplyApy: number;   // e.g. 4.2
  borrowApy: number;   // e.g. 8.5
  utilization: number; // 0-100 percent
  liquidity: string;   // "$12.4M"
}

export interface DefiProtocol {
  id: string;
  name: string;   // "Marginfi", "Kamino", etc.
  logo: string;   // emoji
  tvl: string;    // "$420M"
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
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const PROTOCOLS: DefiProtocol[] = [
  {
    id: 'marginfi',
    name: 'Marginfi',
    logo: '🏦',
    tvl: '$628M',
    type: 'lending',
    tokens: [
      { symbol: 'SOL',  supplyApy: 7.14, borrowApy: 9.82,  utilization: 72, liquidity: '$182M' },
      { symbol: 'USDC', supplyApy: 5.91, borrowApy: 8.43,  utilization: 84, liquidity: '$95M'  },
      { symbol: 'USDT', supplyApy: 5.62, borrowApy: 8.10,  utilization: 79, liquidity: '$61M'  },
      { symbol: 'JUP',  supplyApy: 2.38, borrowApy: 11.70, utilization: 43, liquidity: '$12M'  },
    ],
  },
  {
    id: 'kamino',
    name: 'Kamino',
    logo: '🌀',
    tvl: '$1.04B',
    type: 'yield',
    tokens: [
      { symbol: 'SOL',  supplyApy: 8.30, borrowApy: 10.55, utilization: 68, liquidity: '$310M' },
      { symbol: 'USDC', supplyApy: 6.72, borrowApy: 9.01,  utilization: 88, liquidity: '$178M' },
      { symbol: 'USDT', supplyApy: 6.44, borrowApy: 8.80,  utilization: 82, liquidity: '$112M' },
      { symbol: 'JUP',  supplyApy: 3.15, borrowApy: 12.40, utilization: 38, liquidity: '$22M'  },
    ],
  },
  {
    id: 'solend',
    name: 'Solend',
    logo: '💧',
    tvl: '$420M',
    type: 'lending',
    tokens: [
      { symbol: 'SOL',  supplyApy: 6.88, borrowApy: 9.31,  utilization: 65, liquidity: '$134M' },
      { symbol: 'USDC', supplyApy: 5.40, borrowApy: 7.90,  utilization: 81, liquidity: '$84M'  },
      { symbol: 'USDT', supplyApy: 5.10, borrowApy: 7.60,  utilization: 76, liquidity: '$52M'  },
    ],
  },
  {
    id: 'drift',
    name: 'Drift',
    logo: '🌊',
    tvl: '$287M',
    type: 'perps',
    tokens: [
      { symbol: 'SOL',  supplyApy: 4.20, borrowApy: 7.15,  utilization: 58, liquidity: '$92M'  },
      { symbol: 'USDC', supplyApy: 4.85, borrowApy: 6.90,  utilization: 74, liquidity: '$63M'  },
      { symbol: 'JUP',  supplyApy: 1.95, borrowApy: 9.80,  utilization: 31, liquidity: '$8.4M' },
    ],
  },
  {
    id: 'tulip',
    name: 'Tulip',
    logo: '🌷',
    tvl: '$94M',
    type: 'yield',
    tokens: [
      { symbol: 'SOL',  supplyApy: 5.60, borrowApy: 8.20,  utilization: 61, liquidity: '$28M'  },
      { symbol: 'USDC', supplyApy: 4.95, borrowApy: 7.10,  utilization: 70, liquidity: '$19M'  },
      { symbol: 'USDT', supplyApy: 4.70, borrowApy: 6.85,  utilization: 67, liquidity: '$14M'  },
    ],
  },
];

function computeBestRates(protocols: DefiProtocol[]): {
  bestSupply: BestRate;
  bestBorrow: BestRate;
} {
  let bestSupply: BestRate = { symbol: '', apy: 0, protocol: '' };
  let bestBorrow: BestRate = { symbol: '', apy: Infinity, protocol: '' };

  for (const p of protocols) {
    for (const t of p.tokens) {
      if (t.supplyApy > bestSupply.apy) {
        bestSupply = { symbol: t.symbol, apy: t.supplyApy, protocol: p.name };
      }
      if (t.borrowApy < bestBorrow.apy) {
        bestBorrow = { symbol: t.symbol, apy: t.borrowApy, protocol: p.name };
      }
    }
  }

  return { bestSupply, bestBorrow };
}

// ─── GET Handler ──────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const { bestSupply, bestBorrow } = computeBestRates(PROTOCOLS);

    const data: DefiRatesData = {
      protocols: PROTOCOLS,
      bestSupply,
      bestBorrow,
      totalTvl: '$2.47B',
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load DeFi rates' },
      { status: 500 },
    );
  }
}
