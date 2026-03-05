import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const revalidate = 300; // Cache 5 min

// ─── Exported Types ──────────────────────────────────────────────────────────

export type Period = '7d' | '30d' | '90d' | '1y';

export interface PerformancePoint {
  date: string;
  value: number;
  pnl: number;
}

export interface TokenPerf {
  symbol: string;
  logo: string;
  pnl: number;
  pnlPct: number;
  trades: number;
  winRate: number;
  avgHoldDays: number;
}

export interface AnalyticsData {
  period: Period;
  portfolioValue: number | null;
  totalPnl: number | null;
  totalPnlPct: number | null;
  realizedPnl: number | null;
  unrealizedPnl: number | null;
  winRate: number | null;
  totalTrades: number | null;
  avgTradeSize: number | null;
  bestTrade: { symbol: string; pnl: number; pct: number } | null;
  worstTrade: { symbol: string; pnl: number; pct: number } | null;
  sharpeRatio: number | null;
  maxDrawdown: number | null;
  performanceHistory: PerformancePoint[];
  topTokens: TokenPerf[];
  lastUpdated: string;
  source: 'live' | 'market_only' | 'empty';
  requiresWallet: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(d: Date): string {
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}

function periodToDays(p: Period): number {
  return p === '7d' ? 7 : p === '30d' ? 30 : p === '90d' ? 90 : 365;
}

function periodToInterval(p: Period): string {
  return p === '7d' ? 'h1' : p === '30d' || p === '90d' ? 'd1' : 'd1';
}

// ─── Real SOL price history ───────────────────────────────────────────────────

async function fetchSolPriceHistory(period: Period): Promise<PerformancePoint[]> {
  const days = periodToDays(period);
  const now = Date.now();
  const start = now - days * 86_400_000;
  const interval = periodToInterval(period);

  // CoinGecko free API — market chart endpoint, no auth required
  const cgDays = period === '7d' ? '7' : period === '30d' ? '30' : period === '90d' ? '90' : '365';
  const cgInterval = period === '7d' ? 'hourly' : 'daily';
  const url = `https://api.coingecko.com/api/v3/coins/solana/market_chart?vs_currency=usd&days=${cgDays}&interval=${cgInterval}`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);

  const data = await res.json() as { prices: [number, number][] };
  // Convert CoinGecko format to { priceUsd, time } structure
  const rawPrices: { priceUsd: string; time: number }[] = (data.prices ?? []).map(
    ([ms, price]: [number, number]) => ({ priceUsd: String(price), time: ms })
  );
  const raw = rawPrices;

  if (raw.length === 0) throw new Error('No price history returned');

  // Downsample to max 90 points for performance
  const step = Math.max(1, Math.floor(raw.length / 90));
  const sampled = raw.filter((_, i) => i % step === 0);

  const firstPrice = parseFloat(sampled[0].priceUsd);

  return sampled.map((point, i) => {
    const price = parseFloat(point.priceUsd);
    const prevPrice = i > 0 ? parseFloat(sampled[i - 1].priceUsd) : firstPrice;
    return {
      date: formatDate(new Date(point.time)),
      value: Math.round(price * 100) / 100,
      pnl: Math.round((price - prevPrice) * 100) / 100,
    };
  });
}

// ─── Real wallet analytics (basic — from Solana RPC) ─────────────────────────

async function fetchWalletStats(wallet: string, period: Period): Promise<{
  totalTrades: number;
  firstTxDate: string | null;
}> {
  const rpc = 'https://api.mainnet-beta.solana.com';
  const days = periodToDays(period);
  const sinceTs = Math.floor((Date.now() - days * 86_400_000) / 1000);

  const res = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1,
      method: 'getSignaturesForAddress',
      params: [wallet, { limit: 1000 }],
    }),
  });

  if (!res.ok) return { totalTrades: 0, firstTxDate: null };
  const data = await res.json() as {
    result: { blockTime?: number; err: null | object }[];
  };

  const sigs = data.result ?? [];
  const inPeriod = sigs.filter(
    (s) => s.err === null && (s.blockTime ?? 0) >= sinceTs,
  );

  const oldest = sigs[sigs.length - 1];
  const firstTxDate = oldest?.blockTime
    ? new Date(oldest.blockTime * 1000).toISOString()
    : null;

  return { totalTrades: inPeriod.length, firstTxDate };
}

// ─── GET Handler ─────────────────────────────────────────────────────────────

const VALID_PERIODS = new Set<Period>(['7d', '30d', '90d', '1y']);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get('period') ?? '30d';
  const period: Period = VALID_PERIODS.has(raw as Period) ? (raw as Period) : '30d';
  const wallet = searchParams.get('wallet')?.trim();

  try {
    const [history, walletStats] = await Promise.all([
      fetchSolPriceHistory(period),
      wallet ? fetchWalletStats(wallet, period) : Promise.resolve({ totalTrades: 0, firstTxDate: null }),
    ]);

    const firstVal = history[0]?.value ?? 0;
    const lastVal = history[history.length - 1]?.value ?? 0;
    const solPricePnlPct = firstVal > 0 ? Math.round(((lastVal - firstVal) / firstVal) * 1000) / 10 : 0;
    const solPricePnl = Math.round((lastVal - firstVal) * 100) / 100;

    if (!wallet) {
      // No wallet: show SOL market performance as context only
      return NextResponse.json({
        period,
        portfolioValue: null,
        totalPnl: null,
        totalPnlPct: null,
        realizedPnl: null,
        unrealizedPnl: null,
        winRate: null,
        totalTrades: null,
        avgTradeSize: null,
        bestTrade: null,
        worstTrade: null,
        sharpeRatio: null,
        maxDrawdown: null,
        performanceHistory: history,  // SOL price history
        topTokens: [],
        lastUpdated: new Date().toISOString(),
        source: 'market_only',
        requiresWallet: true,
      } satisfies AnalyticsData);
    }

    // With wallet: show real transaction count + SOL price performance
    // Full PnL calculation requires a transaction indexer with historical prices
    return NextResponse.json({
      period,
      portfolioValue: null,
      totalPnl: solPricePnl,
      totalPnlPct: solPricePnlPct,
      realizedPnl: null,
      unrealizedPnl: null,
      winRate: null,
      totalTrades: walletStats.totalTrades,
      avgTradeSize: null,
      bestTrade: null,
      worstTrade: null,
      sharpeRatio: null,
      maxDrawdown: null,
      performanceHistory: history,
      topTokens: [],
      lastUpdated: new Date().toISOString(),
      source: 'live',
      requiresWallet: false,
    } satisfies AnalyticsData);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load analytics' },
      { status: 500 },
    );
  }
}
