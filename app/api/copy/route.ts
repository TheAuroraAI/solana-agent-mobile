import { NextResponse } from 'next/server';

export const runtime = 'edge';

export type TraderTier = 'legendary' | 'elite' | 'pro' | 'rising';
export type CopyStatus = 'active' | 'paused' | 'stopped';

export interface Trader {
  id: string;
  handle: string;
  avatar: string;
  tier: TraderTier;
  roi30d: number;
  roi7d: number;
  winRate: number;
  totalTrades: number;
  avgHoldHours: number;
  followers: number;
  pnl30d: number;
  maxDrawdown: number;
  preferredTokens: string[];
  riskScore: number;
  isVerified: boolean;
  copiers: number;
}

export interface CopyPosition {
  id: string;
  traderId: string;
  traderHandle: string;
  token: string;
  tokenLogo: string;
  side: 'long' | 'short';
  entryPrice: number;
  currentPrice: number;
  size: number;
  pnl: number;
  pnlPct: number;
  openedAt: string;
}

export interface CopyData {
  featuredTraders: Trader[];
  myTraders: { trader: Trader; status: CopyStatus; allocatedUsd: number; pnl: number }[];
  activeCopyPositions: CopyPosition[];
  stats: { totalCopied: number; totalPnl: number; activeTraders: number; winRate: number };
  lastUpdated: string;
}

function buildTraders(): Trader[] {
  return [
    {
      id: 'trader-001',
      handle: '@SolWhisperer',
      avatar: '🐋',
      tier: 'legendary',
      roi30d: 278.4,
      roi7d: 61.2,
      winRate: 79,
      totalTrades: 1284,
      avgHoldHours: 3.2,
      followers: 42800,
      pnl30d: 418600,
      maxDrawdown: 18.4,
      preferredTokens: ['SOL', 'JUP', 'WIF', 'BONK'],
      riskScore: 7,
      isVerified: true,
      copiers: 3140,
    },
    {
      id: 'trader-002',
      handle: '@NightOwlAlpha',
      avatar: '🦉',
      tier: 'elite',
      roi30d: 142.7,
      roi7d: 28.9,
      winRate: 74,
      totalTrades: 876,
      avgHoldHours: 8.5,
      followers: 18500,
      pnl30d: 96200,
      maxDrawdown: 22.1,
      preferredTokens: ['SOL', 'PYTH', 'RNDR'],
      riskScore: 6,
      isVerified: true,
      copiers: 1870,
    },
    {
      id: 'trader-003',
      handle: '@DegenKing',
      avatar: '👑',
      tier: 'elite',
      roi30d: 198.3,
      roi7d: 44.7,
      winRate: 67,
      totalTrades: 2340,
      avgHoldHours: 1.8,
      followers: 31200,
      pnl30d: 187400,
      maxDrawdown: 38.6,
      preferredTokens: ['BONK', 'WIF', 'MYRO', 'POPCAT'],
      riskScore: 9,
      isVerified: true,
      copiers: 2410,
    },
    {
      id: 'trader-004',
      handle: '@PatienceYields',
      avatar: '🧘',
      tier: 'pro',
      roi30d: 58.2,
      roi7d: 12.1,
      winRate: 82,
      totalTrades: 321,
      avgHoldHours: 48.0,
      followers: 7600,
      pnl30d: 29800,
      maxDrawdown: 11.2,
      preferredTokens: ['SOL', 'USDC', 'JITO'],
      riskScore: 3,
      isVerified: true,
      copiers: 880,
    },
    {
      id: 'trader-005',
      handle: '@MemeSniper99',
      avatar: '🎯',
      tier: 'pro',
      roi30d: 91.5,
      roi7d: 19.8,
      winRate: 61,
      totalTrades: 1105,
      avgHoldHours: 2.4,
      followers: 12400,
      pnl30d: 54300,
      maxDrawdown: 29.8,
      preferredTokens: ['WIF', 'POPCAT', 'BONK', 'MYRO'],
      riskScore: 8,
      isVerified: false,
      copiers: 640,
    },
    {
      id: 'trader-006',
      handle: '@GreenSprout',
      avatar: '🌱',
      tier: 'rising',
      roi30d: 34.6,
      roi7d: 15.3,
      winRate: 68,
      totalTrades: 112,
      avgHoldHours: 18.0,
      followers: 2100,
      pnl30d: 8900,
      maxDrawdown: 14.5,
      preferredTokens: ['SOL', 'JUP', 'DRIFT'],
      riskScore: 4,
      isVerified: false,
      copiers: 195,
    },
  ];
}

function buildMyTraders(traders: Trader[]) {
  return [
    {
      trader: traders[0],
      status: 'active' as CopyStatus,
      allocatedUsd: 200,
      pnl: 52.4,
    },
    {
      trader: traders[3],
      status: 'paused' as CopyStatus,
      allocatedUsd: 100,
      pnl: 11.8,
    },
  ];
}

function buildPositions(traders: Trader[]): CopyPosition[] {
  const now = Date.now();
  const H = 3600000;
  return [
    {
      id: 'pos-001',
      traderId: traders[0].id,
      traderHandle: traders[0].handle,
      token: 'SOL/USDC',
      tokenLogo: '◎',
      side: 'long',
      entryPrice: 168.40,
      currentPrice: 176.82,
      size: 140,
      pnl: 7.01,
      pnlPct: 5.00,
      openedAt: new Date(now - 2.5 * H).toISOString(),
    },
    {
      id: 'pos-002',
      traderId: traders[0].id,
      traderHandle: traders[0].handle,
      token: 'WIF/USDC',
      tokenLogo: '🐕',
      side: 'long',
      entryPrice: 2.14,
      currentPrice: 2.31,
      size: 60,
      pnl: 4.77,
      pnlPct: 7.94,
      openedAt: new Date(now - 1.1 * H).toISOString(),
    },
    {
      id: 'pos-003',
      traderId: traders[1].id,
      traderHandle: traders[1].handle,
      token: 'PYTH/USDC',
      tokenLogo: '🔮',
      side: 'short',
      entryPrice: 0.428,
      currentPrice: 0.411,
      size: 85,
      pnl: 3.37,
      pnlPct: 3.97,
      openedAt: new Date(now - 5.8 * H).toISOString(),
    },
  ];
}

async function fetchLivePrices(): Promise<Record<string, number>> {
  const addrs = [
    'So11111111111111111111111111111111111111112', // SOL
    'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', // WIF
    'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', // JUP
  ].join(',');
  const res = await fetch(
    `https://api.dexscreener.com/latest/dex/tokens/${addrs}`,
    { signal: AbortSignal.timeout(4000) },
  );
  if (!res.ok) return {};
  const data = await res.json() as { pairs?: Array<{ baseToken?: { symbol?: string }; priceUsd?: string }> };
  const prices: Record<string, number> = {};
  for (const pair of data.pairs ?? []) {
    const sym = pair.baseToken?.symbol;
    if (sym && pair.priceUsd && !(sym in prices)) {
      prices[sym] = parseFloat(pair.priceUsd);
    }
  }
  return prices;
}

export async function GET() {
  try {
    const [traders, prices] = await Promise.all([
      Promise.resolve(buildTraders()),
      fetchLivePrices().catch(() => ({} as Record<string, number>)),
    ]);
    const myTraders = buildMyTraders(traders);
    const activeCopyPositions = buildPositions(traders).map(pos => ({
      ...pos,
      currentPrice: prices[pos.token] ?? pos.currentPrice,
      pnl: prices[pos.token]
        ? (prices[pos.token] - pos.entryPrice) * pos.size * (pos.side === 'long' ? 1 : -1)
        : pos.pnl,
      pnlPct: prices[pos.token]
        ? ((prices[pos.token] - pos.entryPrice) / pos.entryPrice) * 100 * (pos.side === 'long' ? 1 : -1)
        : pos.pnlPct,
    }));

    const totalCopied = myTraders.reduce((s, m) => s + m.allocatedUsd, 0);
    const totalPnl = myTraders.reduce((s, m) => s + m.pnl, 0);
    const activeTraders = myTraders.filter(m => m.status === 'active').length;
    const winRate = 72;

    const data: CopyData & { source: string } = {
      featuredTraders: traders,
      myTraders,
      activeCopyPositions,
      stats: { totalCopied, totalPnl, activeTraders, winRate },
      lastUpdated: new Date().toISOString(),
      source: Object.keys(prices).length > 0 ? 'live-prices' : 'estimated',
    };

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch copy trading data' },
      { status: 500 },
    );
  }
}
