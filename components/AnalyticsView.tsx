'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  TrendingUp, TrendingDown, BarChart2, Zap,
  RefreshCw, ArrowUpRight, ArrowDownRight,
  Award, AlertTriangle, Target, Layers,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { AnalyticsData, Period, PerformancePoint, TokenPerf } from '@/app/api/analytics/route';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt$(n: number, compact = false): string {
  if (compact && Math.abs(n) >= 1000) {
    return `$${(n / 1000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtPct(n: number, sign = true): string {
  const s = sign && n > 0 ? '+' : '';
  return `${s}${n.toFixed(1)}%`;
}

function pnlColor(n: number): string {
  return n >= 0 ? 'text-emerald-400' : 'text-red-400';
}

function pnlBg(n: number): string {
  return n >= 0 ? 'bg-emerald-500/15' : 'bg-red-500/15';
}

// ─── Period Selector ─────────────────────────────────────────────────────────

const PERIODS: { label: string; value: Period }[] = [
  { label: '7D',  value: '7d'  },
  { label: '30D', value: '30d' },
  { label: '90D', value: '90d' },
  { label: '1Y',  value: '1y'  },
];

function PeriodTabs({ active, onChange }: { active: Period; onChange: (p: Period) => void }) {
  return (
    <div className="flex gap-1 bg-gray-800/70 rounded-xl p-1">
      {PERIODS.map(({ label, value }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={clsx(
            'flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all',
            active === value
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-gray-400 hover:text-gray-200',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
  icon: React.ReactNode;
  iconBg: string;
}

function KpiCard({ label, value, sub, subColor, icon, iconBg }: KpiCardProps) {
  return (
    <div className="bg-gray-900 rounded-2xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-gray-500 text-xs font-medium">{label}</span>
        <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center', iconBg)}>
          {icon}
        </div>
      </div>
      <p className="text-white text-lg font-bold font-mono leading-tight">{value}</p>
      {sub && (
        <p className={clsx('text-xs font-medium', subColor ?? 'text-gray-500')}>{sub}</p>
      )}
    </div>
  );
}

// ─── SVG Line Chart ───────────────────────────────────────────────────────────

const CHART_W = 340;
const CHART_H = 180;
const PAD_L   = 52;  // left padding for Y labels
const PAD_R   = 8;
const PAD_T   = 12;
const PAD_B   = 32;  // bottom padding for X labels

const INNER_W = CHART_W - PAD_L - PAD_R;
const INNER_H = CHART_H - PAD_T - PAD_B;

function PerfChart({ points, isUp }: { points: PerformancePoint[]; isUp: boolean }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (points.length < 2) {
    return <div className="h-44 bg-gray-800/40 animate-pulse rounded-xl" />;
  }

  const values = points.map((p) => p.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range  = maxVal - minVal || 1;

  const toX = (i: number) =>
    PAD_L + (i / (points.length - 1)) * INNER_W;
  const toY = (v: number) =>
    PAD_T + (1 - (v - minVal) / range) * INNER_H;

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(p.value).toFixed(1)}`)
    .join(' ');

  const lastX = toX(points.length - 1).toFixed(1);
  const firstX = toX(0).toFixed(1);
  const bottomY = (PAD_T + INNER_H).toFixed(1);
  const fillD = `${pathD} L${lastX},${bottomY} L${firstX},${bottomY} Z`;

  const color     = isUp ? '#10b981' : '#ef4444';
  const fillColor = isUp ? '#10b98122' : '#ef444422';

  // Y-axis: 4 nice labels
  const ySteps = 4;
  const yLabels = Array.from({ length: ySteps + 1 }, (_, i) => {
    const v = minVal + (i / ySteps) * range;
    return { y: toY(v), label: fmt$(v, true) };
  }).reverse();

  // X-axis: show every ~5th label
  const xStep = Math.max(1, Math.floor(points.length / 6));
  const xLabels = points
    .map((p, i) => ({ i, date: p.date }))
    .filter(({ i }) => i % xStep === 0 || i === points.length - 1);

  // Hover interaction
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgX = (clientX / rect.width) * CHART_W;
    let closest = 0;
    let minDist = Infinity;
    points.forEach((_, i) => {
      const dist = Math.abs(toX(i) - svgX);
      if (dist < minDist) { minDist = dist; closest = i; }
    });
    setHoverIdx(closest);
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = touch.clientX - rect.left;
    const svgX = (clientX / rect.width) * CHART_W;
    let closest = 0;
    let minDist = Infinity;
    points.forEach((_, i) => {
      const dist = Math.abs(toX(i) - svgX);
      if (dist < minDist) { minDist = dist; closest = i; }
    });
    setHoverIdx(closest);
  };

  const hPoint = hoverIdx !== null ? points[hoverIdx] : null;
  const hX = hoverIdx !== null ? toX(hoverIdx) : 0;
  const hY = hoverIdx !== null ? toY(points[hoverIdx].value) : 0;

  const tooltipOnRight = hoverIdx !== null && hoverIdx < points.length / 2;

  return (
    <div className="relative w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="w-full"
        style={{ height: CHART_H }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="analyticsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor} stopOpacity="1" />
            <stop offset="100%" stopColor={fillColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y-axis grid lines */}
        {yLabels.map(({ y, label }) => (
          <g key={label}>
            <line
              x1={PAD_L} y1={y.toFixed(1)}
              x2={CHART_W - PAD_R} y2={y.toFixed(1)}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="1"
            />
            <text
              x={PAD_L - 6}
              y={y + 4}
              textAnchor="end"
              fontSize="9"
              fill="rgba(156,163,175,0.7)"
            >
              {label}
            </text>
          </g>
        ))}

        {/* Filled area */}
        <path d={fillD} fill="url(#analyticsGrad)" />

        {/* Line */}
        <path
          d={pathD}
          stroke={color}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* X-axis labels */}
        {xLabels.map(({ i, date }) => (
          <text
            key={i}
            x={toX(i).toFixed(1)}
            y={CHART_H - 8}
            textAnchor="middle"
            fontSize="9"
            fill="rgba(156,163,175,0.7)"
          >
            {date}
          </text>
        ))}

        {/* Hover crosshair */}
        {hPoint && (
          <>
            <line
              x1={hX} y1={PAD_T}
              x2={hX} y2={PAD_T + INNER_H}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
            <circle
              cx={hX} cy={hY} r="4"
              fill={color}
              stroke="white"
              strokeWidth="1.5"
            />
          </>
        )}
      </svg>

      {/* Hover tooltip */}
      {hPoint && (
        <div
          className={clsx(
            'absolute top-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2',
            'pointer-events-none text-xs shadow-xl z-10',
            tooltipOnRight ? 'left-12' : 'right-2',
          )}
        >
          <p className="text-white font-bold">{fmt$(hPoint.value)}</p>
          <p className={clsx('font-medium', pnlColor(hPoint.pnl))}>
            {hPoint.pnl >= 0 ? '+' : ''}{fmt$(hPoint.pnl)} today
          </p>
          <p className="text-gray-500 mt-0.5">{hPoint.date}</p>
        </div>
      )}
    </div>
  );
}

// ─── Realized vs Unrealized Split ────────────────────────────────────────────

function PnlSplit({
  realized,
  unrealized,
  total,
}: {
  realized: number;
  unrealized: number;
  total: number;
}) {
  const absTotal = Math.abs(realized) + Math.abs(unrealized);
  const realizedPct = absTotal > 0 ? (Math.abs(realized) / absTotal) * 100 : 50;
  const unrealizedPct = 100 - realizedPct;

  return (
    <div className="bg-gray-900 rounded-2xl p-4">
      <p className="text-gray-500 text-xs font-medium mb-3">P&L Breakdown</p>
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">Realized</span>
            <span className={clsx('font-mono font-semibold', pnlColor(realized))}>
              {realized >= 0 ? '+' : ''}{fmt$(realized)}
            </span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={clsx(
                'h-full rounded-full transition-all duration-700',
                realized >= 0 ? 'bg-emerald-500' : 'bg-red-500',
              )}
              style={{ width: `${realizedPct.toFixed(1)}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">Unrealized</span>
            <span className={clsx('font-mono font-semibold', pnlColor(unrealized))}>
              {unrealized >= 0 ? '+' : ''}{fmt$(unrealized)}
            </span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={clsx(
                'h-full rounded-full transition-all duration-700',
                unrealized >= 0 ? 'bg-violet-500' : 'bg-orange-500',
              )}
              style={{ width: `${unrealizedPct.toFixed(1)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Best / Worst Trade Cards ─────────────────────────────────────────────────

function TradeCard({
  label,
  symbol,
  pnl,
  pct,
  variant,
}: {
  label: string;
  symbol: string;
  pnl: number;
  pct: number;
  variant: 'best' | 'worst';
}) {
  const isBest = variant === 'best';
  return (
    <div
      className={clsx(
        'flex-1 rounded-2xl p-4 border',
        isBest
          ? 'bg-emerald-500/10 border-emerald-500/20'
          : 'bg-red-500/10 border-red-500/20',
      )}
    >
      <div className="flex items-center gap-1.5 mb-2">
        {isBest
          ? <Award className="w-3.5 h-3.5 text-emerald-400" />
          : <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
        }
        <span className="text-gray-400 text-xs">{label}</span>
      </div>
      <p className="text-white font-bold text-sm">{symbol}</p>
      <p className={clsx('text-base font-bold font-mono', isBest ? 'text-emerald-400' : 'text-red-400')}>
        {pnl >= 0 ? '+' : ''}{fmt$(pnl)}
      </p>
      <p className={clsx('text-xs font-semibold', isBest ? 'text-emerald-500' : 'text-red-500')}>
        {fmtPct(pct)}
      </p>
    </div>
  );
}

// ─── Token Table ──────────────────────────────────────────────────────────────

function TokenRow({ token }: { token: TokenPerf }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-800/60 last:border-0">
      {/* Logo + symbol */}
      <div className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center text-base shrink-0">
        {token.logo}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold">{token.symbol}</p>
        <p className="text-gray-500 text-xs">{token.trades} trades · {token.avgHoldDays}d avg</p>
      </div>

      {/* P&L */}
      <div className="text-right shrink-0 w-20">
        <p className={clsx('text-sm font-bold font-mono', pnlColor(token.pnl))}>
          {token.pnl >= 0 ? '+' : ''}{fmt$(token.pnl, true)}
        </p>
        <p className={clsx('text-xs font-semibold', pnlColor(token.pnlPct))}>
          {fmtPct(token.pnlPct)}
        </p>
      </div>

      {/* Win rate bar + label */}
      <div className="shrink-0 w-16">
        <p className="text-gray-400 text-[10px] text-right mb-1">{token.winRate}%</p>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={clsx(
              'h-full rounded-full',
              token.winRate >= 60 ? 'bg-emerald-500'
              : token.winRate >= 45 ? 'bg-amber-500'
              : 'bg-red-500',
            )}
            style={{ width: `${token.winRate}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={clsx('bg-gray-800/60 animate-pulse rounded-xl', className)} />
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-9 w-full" />
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <Skeleton className="h-52" />
      <Skeleton className="h-28" />
      <div className="flex gap-3">
        <Skeleton className="h-24 flex-1" />
        <Skeleton className="h-24 flex-1" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function AnalyticsView() {
  const [period, setPeriod] = useState<Period>('30d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: Period) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics?period=${p}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as AnalyticsData;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(period);
  }, [period, load]);

  const handlePeriod = (p: Period) => {
    setPeriod(p);
  };

  const isUp = data ? data.totalPnl >= 0 : true;

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl font-bold">Analytics</h1>
          <p className="text-gray-500 text-xs mt-0.5">Portfolio performance & insights</p>
        </div>
        <button
          onClick={() => load(period)}
          disabled={loading}
          className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Period Selector */}
      <div className="px-4 mb-4">
        <PeriodTabs active={period} onChange={handlePeriod} />
      </div>

      {loading && !data && <AnalyticsSkeleton />}

      {error && (
        <div className="mx-4 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {data && (
        <div className="px-4 pb-6 space-y-4">

          {/* KPI Cards — 2×2 grid */}
          <div className="grid grid-cols-2 gap-3">
            <KpiCard
              label="Total P&L"
              value={`${data.totalPnl >= 0 ? '+' : ''}${fmt$(data.totalPnl, true)}`}
              sub={fmtPct(data.totalPnlPct)}
              subColor={pnlColor(data.totalPnl)}
              icon={
                data.totalPnl >= 0
                  ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  : <TrendingDown className="w-3.5 h-3.5 text-red-400" />
              }
              iconBg={data.totalPnl >= 0 ? 'bg-emerald-500/15' : 'bg-red-500/15'}
            />
            <KpiCard
              label="Win Rate"
              value={`${data.winRate}%`}
              sub={`${data.totalTrades} total trades`}
              icon={<Target className="w-3.5 h-3.5 text-violet-400" />}
              iconBg="bg-violet-500/15"
            />
            <KpiCard
              label="Total Trades"
              value={data.totalTrades.toLocaleString()}
              sub={`Avg ${fmt$(data.avgTradeSize, true)} / trade`}
              icon={<BarChart2 className="w-3.5 h-3.5 text-blue-400" />}
              iconBg="bg-blue-500/15"
            />
            <KpiCard
              label="Sharpe Ratio"
              value={data.sharpeRatio.toFixed(2)}
              sub={data.sharpeRatio >= 1 ? 'Good risk-adj. return' : 'Below benchmark'}
              subColor={data.sharpeRatio >= 1 ? 'text-emerald-500' : 'text-amber-500'}
              icon={<Zap className="w-3.5 h-3.5 text-amber-400" />}
              iconBg="bg-amber-500/15"
            />
          </div>

          {/* Portfolio Value chart */}
          <div className="bg-gray-900 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Portfolio Value</p>
                <p className="text-white text-2xl font-bold font-mono mt-0.5">
                  {fmt$(data.portfolioValue)}
                </p>
              </div>
              <div className={clsx(
                'px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-sm font-semibold',
                pnlBg(data.totalPnl),
                pnlColor(data.totalPnl),
              )}>
                {isUp
                  ? <ArrowUpRight className="w-4 h-4" />
                  : <ArrowDownRight className="w-4 h-4" />
                }
                {fmtPct(data.totalPnlPct)}
              </div>
            </div>
            <PerfChart points={data.performanceHistory} isUp={isUp} />
          </div>

          {/* Realized vs Unrealized */}
          <PnlSplit
            realized={data.realizedPnl}
            unrealized={data.unrealizedPnl}
            total={data.totalPnl}
          />

          {/* Best / Worst Trade */}
          <div className="flex gap-3">
            <TradeCard
              label="Best Trade"
              symbol={data.bestTrade.symbol}
              pnl={data.bestTrade.pnl}
              pct={data.bestTrade.pct}
              variant="best"
            />
            <TradeCard
              label="Worst Trade"
              symbol={data.worstTrade.symbol}
              pnl={data.worstTrade.pnl}
              pct={data.worstTrade.pct}
              variant="worst"
            />
          </div>

          {/* Max Drawdown + Avg Trade Size stat row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-900 rounded-2xl p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <Layers className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-gray-500 text-xs">Max Drawdown</span>
              </div>
              <p className="text-red-400 text-xl font-bold font-mono">
                -{data.maxDrawdown.toFixed(1)}%
              </p>
              <p className="text-gray-600 text-[10px] mt-1">Peak-to-trough loss</p>
            </div>
            <div className="bg-gray-900 rounded-2xl p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <BarChart2 className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-gray-500 text-xs">Avg Trade Size</span>
              </div>
              <p className="text-white text-xl font-bold font-mono">
                {fmt$(data.avgTradeSize, true)}
              </p>
              <p className="text-gray-600 text-[10px] mt-1">Per executed trade</p>
            </div>
          </div>

          {/* Top Tokens Table */}
          <div className="bg-gray-900 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-white text-sm font-semibold">Token Performance</p>
              <span className="text-gray-600 text-xs">{data.topTokens.length} tokens</span>
            </div>

            {/* Column headers */}
            <div className="flex items-center gap-3 pb-2 border-b border-gray-800/60">
              <div className="w-8 shrink-0" />
              <div className="flex-1">
                <span className="text-gray-600 text-[10px] uppercase tracking-wider">Token</span>
              </div>
              <div className="w-20 text-right">
                <span className="text-gray-600 text-[10px] uppercase tracking-wider">P&L</span>
              </div>
              <div className="w-16 text-right">
                <span className="text-gray-600 text-[10px] uppercase tracking-wider">Win %</span>
              </div>
            </div>

            {data.topTokens.map((token) => (
              <TokenRow key={token.symbol} token={token} />
            ))}
          </div>

          {/* Last updated footer */}
          <p className="text-center text-gray-700 text-[10px]">
            Updated {new Date(data.lastUpdated).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      )}
    </div>
  );
}
