import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const revalidate = 60;

// ─── Exported Types ──────────────────────────────────────────────────────────

export type Period = '7d' | '30d' | '90d' | '1y';

export interface PerformancePoint {
  date: string; // e.g. "Mar 1"
  value: number; // portfolio value in USD
  pnl: number;   // that day's P&L in USD
}

export interface TokenPerf {
  symbol: string;
  logo: string;       // emoji
  pnl: number;        // USD
  pnlPct: number;
  trades: number;
  winRate: number;    // 0-100
  avgHoldDays: number;
}

export interface AnalyticsData {
  period: Period;
  portfolioValue: number;
  totalPnl: number;
  totalPnlPct: number;
  realizedPnl: number;
  unrealizedPnl: number;
  winRate: number;       // 0-100
  totalTrades: number;
  avgTradeSize: number;
  bestTrade: { symbol: string; pnl: number; pct: number };
  worstTrade: { symbol: string; pnl: number; pct: number };
  sharpeRatio: number;
  maxDrawdown: number;   // percentage
  performanceHistory: PerformancePoint[];
  topTokens: TokenPerf[];
  lastUpdated: string;
}

// ─── Data Generation ─────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatDate(d: Date): string {
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}

/**
 * Seeded pseudo-random — deterministic per period so the chart doesn't
 * jump on every refresh, while still looking realistic.
 */
function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return ((s >>> 0) / 0xffffffff);
  };
}

function buildHistory(days: number, seed: number): PerformancePoint[] {
  const rng = seededRng(seed);
  const points: PerformancePoint[] = [];
  const now = new Date();

  // Starting portfolio value ~$12,000
  let value = 12_000 + rng() * 1_200;

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);

    // Daily drift: slight upward bias (+0.15%) with ±2.5% volatility
    const drift = 0.0015;
    const vol = 0.025;
    const dailyReturn = drift + (rng() - 0.5) * 2 * vol;

    // Occasional bigger moves (simulates news-driven spikes)
    const shock = rng() < 0.08 ? (rng() - 0.4) * 0.08 : 0;

    const pnl = value * (dailyReturn + shock);
    value = Math.max(8_000, value + pnl);

    points.push({
      date: formatDate(d),
      value: Math.round(value),
      pnl: Math.round(pnl),
    });
  }

  return points;
}

function buildTopTokens(): TokenPerf[] {
  return [
    {
      symbol: 'SOL',
      logo: '◎',
      pnl: 1_842,
      pnlPct: 18.4,
      trades: 34,
      winRate: 68,
      avgHoldDays: 4.2,
    },
    {
      symbol: 'JUP',
      logo: '🪐',
      pnl: 623,
      pnlPct: 41.2,
      trades: 18,
      winRate: 72,
      avgHoldDays: 2.8,
    },
    {
      symbol: 'BONK',
      logo: '🐶',
      pnl: -314,
      pnlPct: -22.7,
      trades: 27,
      winRate: 41,
      avgHoldDays: 1.1,
    },
    {
      symbol: 'WIF',
      logo: '🎩',
      pnl: 287,
      pnlPct: 14.3,
      trades: 15,
      winRate: 60,
      avgHoldDays: 3.5,
    },
    {
      symbol: 'RAY',
      logo: '⚡',
      pnl: -98,
      pnlPct: -8.1,
      trades: 9,
      winRate: 44,
      avgHoldDays: 5.0,
    },
    {
      symbol: 'PYTH',
      logo: '🔮',
      pnl: 412,
      pnlPct: 27.6,
      trades: 12,
      winRate: 67,
      avgHoldDays: 6.1,
    },
  ];
}

function periodToDays(period: Period): number {
  switch (period) {
    case '7d':  return 7;
    case '30d': return 30;
    case '90d': return 90;
    case '1y':  return 365;
  }
}

function buildData(period: Period): AnalyticsData {
  const days = periodToDays(period);

  // Different seed per period for consistent but distinct charts
  const seedMap: Record<Period, number> = {
    '7d': 42,
    '30d': 137,
    '90d': 299,
    '1y': 512,
  };

  const history = buildHistory(days, seedMap[period]);
  const topTokens = buildTopTokens();

  const firstValue = history[0].value;
  const lastValue  = history[history.length - 1].value;
  const totalPnl   = lastValue - firstValue;
  const totalPnlPct = (totalPnl / firstValue) * 100;

  // Realized/unrealized split: 60% realized, 40% unrealized
  const realizedPnl   = Math.round(totalPnl * 0.62);
  const unrealizedPnl = totalPnl - realizedPnl;

  // Scale trade count and avg size by period length
  const tradeFactor = Math.max(1, days / 30);
  const totalTrades  = Math.round(115 * tradeFactor);
  const avgTradeSize = Math.round(680 + (days * 2.3));

  return {
    period,
    portfolioValue: lastValue,
    totalPnl: Math.round(totalPnl),
    totalPnlPct: Math.round(totalPnlPct * 10) / 10,
    realizedPnl,
    unrealizedPnl,
    winRate: 58,
    totalTrades,
    avgTradeSize,
    bestTrade:  { symbol: 'JUP',  pnl: 623,  pct: 41.2  },
    worstTrade: { symbol: 'BONK', pnl: -314, pct: -22.7 },
    sharpeRatio: 1.4,
    maxDrawdown: 18.3,
    performanceHistory: history,
    topTokens,
    lastUpdated: new Date().toISOString(),
  };
}

// ─── GET Handler ─────────────────────────────────────────────────────────────

const VALID_PERIODS = new Set<Period>(['7d', '30d', '90d', '1y']);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const raw = searchParams.get('period') ?? '30d';
    const period: Period = VALID_PERIODS.has(raw as Period) ? (raw as Period) : '30d';

    const data = buildData(period);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to build analytics data' },
      { status: 500 },
    );
  }
}
