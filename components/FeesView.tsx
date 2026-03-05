'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  Zap,
  TrendingDown,
  Activity,
  AlertTriangle,
  CheckCircle,
  BarChart2,
  Wallet,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { FeesData, FeeLevel, PriorityFeeOption } from '@/app/api/fees/route';

// ─── static config ───────────────────────────────────────────────────────────

const LEVEL_CONFIG: Record<
  FeeLevel,
  { label: string; color: string; bgClass: string; borderClass: string; textClass: string }
> = {
  low: {
    label: 'Low',
    color: '#34d399',
    bgClass: 'bg-emerald-500/10',
    borderClass: 'border-emerald-500/20',
    textClass: 'text-emerald-400',
  },
  medium: {
    label: 'Medium',
    color: '#facc15',
    bgClass: 'bg-yellow-500/10',
    borderClass: 'border-yellow-500/20',
    textClass: 'text-yellow-400',
  },
  high: {
    label: 'High',
    color: '#f97316',
    bgClass: 'bg-orange-500/10',
    borderClass: 'border-orange-500/20',
    textClass: 'text-orange-400',
  },
  turbo: {
    label: 'Turbo',
    color: '#ef4444',
    bgClass: 'bg-red-500/10',
    borderClass: 'border-red-500/20',
    textClass: 'text-red-400',
  },
};

const CONGESTION_CONFIG = {
  low: {
    label: 'Low Congestion',
    bgClass: 'bg-emerald-500/10',
    borderClass: 'border-emerald-500/20',
    textClass: 'text-emerald-400',
    dotColor: '#34d399',
    description: 'Network is running smoothly. Low priority fees will land quickly.',
  },
  medium: {
    label: 'Moderate Congestion',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/20',
    textClass: 'text-amber-400',
    dotColor: '#f59e0b',
    description: 'Some activity on the network. Medium fees are recommended.',
  },
  high: {
    label: 'High Congestion',
    bgClass: 'bg-red-500/10',
    borderClass: 'border-red-500/20',
    textClass: 'text-red-400',
    dotColor: '#ef4444',
    description: 'Heavy network load. Use high or turbo fees to avoid delays.',
  },
} as const;

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatLamports(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(v);
}

// ─── sub-components ──────────────────────────────────────────────────────────

function FeeCard({
  option,
  selected,
  onSelect,
}: {
  option: PriorityFeeOption;
  selected: boolean;
  onSelect: (level: FeeLevel) => void;
}) {
  const cfg = LEVEL_CONFIG[option.level];
  return (
    <button
      onClick={() => onSelect(option.level)}
      className={clsx(
        'relative rounded-2xl p-3.5 border text-left transition-all active:scale-95',
        selected
          ? 'border-violet-500 bg-violet-500/10'
          : [cfg.bgClass, cfg.borderClass],
      )}
    >
      {option.recommended && (
        <span className="absolute top-2 right-2 text-[9px] font-bold bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded-full">
          REC
        </span>
      )}
      <p className={clsx('text-xs font-semibold mb-1', selected ? 'text-violet-300' : cfg.textClass)}>
        {cfg.label}
      </p>
      <p className="text-base font-bold text-white leading-none mb-1">
        {formatLamports(option.lamports)}<span className="text-[10px] text-gray-500 font-normal ml-0.5">lam</span>
      </p>
      <p className="text-[10px] text-gray-400 mb-0.5">{option.solCost}</p>
      <p className="text-[10px] text-gray-500 mb-2">{option.usdCost}</p>

      {/* Success rate bar */}
      <div className="flex items-center gap-1.5">
        <div className="flex-1 h-1 rounded-full bg-gray-700 overflow-hidden">
          <div
            className={clsx('h-full rounded-full transition-all', selected ? 'bg-violet-400' : 'bg-gray-500')}
            style={{ width: `${option.successRate}%` }}
          />
        </div>
        <span className="text-[9px] text-gray-500 shrink-0">{option.successRate}%</span>
      </div>
      <p className="text-[10px] text-gray-500 mt-1.5">{option.confirmTime}</p>
    </button>
  );
}

function FeeHistoryChart({ history }: { history: FeesData['history'] }) {
  const maxFee = Math.max(...history.map((h) => h.avgFee), 1);

  return (
    <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
      <div className="flex items-center gap-2 mb-3">
        <BarChart2 className="w-4 h-4 text-violet-400" />
        <span className="text-sm font-semibold text-white">Fee History</span>
        <span className="text-gray-600 text-[10px] ml-auto">12h avg lamports</span>
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-[3px] h-20">
        {history.map((point, i) => {
          const heightPct = Math.max((point.avgFee / maxFee) * 100, 3);
          const isLast = i === history.length - 1;
          return (
            <div
              key={point.time}
              className="flex-1 rounded-t transition-all"
              style={{
                height: `${heightPct}%`,
                backgroundColor: isLast ? '#8b5cf6' : '#374151',
                minWidth: '4px',
              }}
              title={`${point.time}: ${formatLamports(point.avgFee)} lamports (${point.txCount} txs)`}
            />
          );
        })}
      </div>

      {/* X-axis labels — show every 3rd */}
      <div className="flex justify-between mt-1.5">
        {history
          .filter((_, i) => i % 3 === 0 || i === history.length - 1)
          .map((p) => (
            <span key={p.time} className="text-[9px] text-gray-600">
              {p.time}
            </span>
          ))}
      </div>

      <div className="flex items-center justify-between mt-1 text-[10px] text-gray-600">
        <span>Min: {formatLamports(Math.min(...history.map((h) => h.avgFee)))}</span>
        <span>Max: {formatLamports(Math.max(...history.map((h) => h.avgFee)))}</span>
      </div>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export function FeesView() {
  const [data, setData] = useState<FeesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<FeeLevel>('medium');
  const [applied, setApplied] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/fees');
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Error ${res.status}`);
      }
      const json = await res.json() as FeesData;
      setData(json);
      // Default selection = whatever the API marks as current
      setSelectedLevel(json.currentFee.level);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch fee data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 30 s
  useEffect(() => {
    const id = setInterval(() => fetchData(true), 30_000);
    return () => clearInterval(id);
  }, [fetchData]);

  function handleApply() {
    setApplied(true);
    setTimeout(() => setApplied(false), 2500);
  }

  // ── Loading skeleton ──
  if (loading && !data) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="sticky top-0 z-50 bg-black/95 backdrop-blur-xl border-b border-gray-800/50 px-4 py-3 flex items-center gap-3 safe-top">
          <div className="w-8 h-8 rounded-full bg-gray-800 animate-pulse" />
          <div className="h-5 bg-gray-800 rounded animate-pulse w-32" />
        </div>
        <div className="p-4 space-y-4 animate-pulse">
          <div className="h-20 bg-gray-900 rounded-2xl" />
          <div className="h-28 bg-gray-900 rounded-2xl" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-36 bg-gray-900 rounded-2xl" />
            <div className="h-36 bg-gray-900 rounded-2xl" />
            <div className="h-36 bg-gray-900 rounded-2xl" />
            <div className="h-36 bg-gray-900 rounded-2xl" />
          </div>
          <div className="h-44 bg-gray-900 rounded-2xl" />
          <div className="h-40 bg-gray-900 rounded-2xl" />
        </div>
      </div>
    );
  }

  const congestion = data ? CONGESTION_CONFIG[data.networkCongestion] : CONGESTION_CONFIG.low;
  const selectedOption = data?.options.find((o) => o.level === selectedLevel) ?? data?.options[1];

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      {/* ── Header ── */}
      <div className="sticky top-0 z-50 bg-black/95 backdrop-blur-xl border-b border-gray-800/50 px-4 py-3 flex items-center gap-3 safe-top">
        <button
          onClick={() => window.history.back()}
          className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-4 h-4 text-gray-300" />
        </button>
        <div className="flex-1">
          <h1 className="text-white font-semibold text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-violet-400" />
            Fee Optimizer
          </h1>
          <p className="text-gray-500 text-[10px] leading-none mt-0.5">
            Minimize transaction costs
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center active:scale-95 transition-transform"
        >
          <RefreshCw className={clsx('w-4 h-4 text-gray-300', refreshing && 'animate-spin')} />
        </button>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* ── Error state ── */}
        {error && !data && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex flex-col items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-red-400" />
            <p className="text-red-400 text-sm text-center">{error}</p>
            <button
              onClick={() => fetchData()}
              className="text-violet-400 text-sm font-medium active:scale-95 transition-transform"
            >
              Retry
            </button>
          </div>
        )}

        {data && selectedOption && (
          <>
            {/* ── Congestion banner ── */}
            <div
              className={clsx(
                'rounded-2xl p-4 border flex items-start gap-3',
                congestion.bgClass,
                congestion.borderClass,
              )}
            >
              <Activity className="w-5 h-5 mt-0.5 shrink-0" style={{ color: congestion.dotColor }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={clsx('text-sm font-bold', congestion.textClass)}>
                    {congestion.label}
                  </span>
                  <div
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ backgroundColor: congestion.dotColor }}
                  />
                </div>
                <p className="text-gray-400 text-xs leading-relaxed">{congestion.description}</p>
              </div>
            </div>

            {/* ── Current recommended fee card ── */}
            <div className="bg-violet-500/10 border border-violet-500/30 rounded-2xl p-5">
              <p className="text-violet-400 text-xs font-semibold uppercase tracking-wide mb-2">
                Current Recommendation
              </p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-white">
                    {formatLamports(data.currentFee.lamports)}
                    <span className="text-sm text-gray-400 font-normal ml-1">lamports</span>
                  </p>
                  <p className="text-gray-400 text-sm mt-0.5">{data.currentFee.solCost}</p>
                  <p className="text-gray-500 text-xs">{data.currentFee.usdCost}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block bg-violet-500/20 text-violet-300 text-xs font-semibold px-2.5 py-1 rounded-full capitalize">
                    {data.currentFee.level}
                  </span>
                  <p className="text-gray-400 text-xs mt-1.5">{data.currentFee.confirmTime}</p>
                  <p className="text-gray-500 text-[10px]">{data.currentFee.successRate}% success</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-violet-500/20 flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-[10px] text-gray-500">
                  Base fee: {formatLamports(data.baseFee)} lamports
                </span>
              </div>
            </div>

            {/* ── Priority fee selector ── */}
            <div>
              <p className="text-xs text-gray-500 font-medium mb-2 uppercase tracking-wide">
                Select Priority
              </p>
              <div className="grid grid-cols-2 gap-3">
                {data.options.map((option) => (
                  <FeeCard
                    key={option.level}
                    option={option}
                    selected={selectedLevel === option.level}
                    onSelect={setSelectedLevel}
                  />
                ))}
              </div>
            </div>

            {/* ── Fee history chart ── */}
            <FeeHistoryChart history={data.history} />

            {/* ── Wallet fee stats ── */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Wallet className="w-4 h-4 text-violet-400" />
                <span className="text-sm font-semibold text-white">Your Fee Stats</span>
                <span className="text-gray-600 text-[10px] ml-auto">Last 30 days</span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-black/40 rounded-xl p-3">
                  <p className="text-gray-500 text-[10px] mb-1">Total Fees Paid</p>
                  <p className="text-white font-bold text-sm">{data.walletStats.totalFeesSol}</p>
                  <p className="text-gray-500 text-[10px]">{data.walletStats.totalFeesUsd}</p>
                </div>
                <div className="bg-black/40 rounded-xl p-3">
                  <p className="text-gray-500 text-[10px] mb-1">Avg Fee / Tx</p>
                  <p className="text-white font-bold text-sm">{data.walletStats.avgFeePerTx}</p>
                  <p className="text-gray-500 text-[10px]">{data.walletStats.totalTxs} transactions</p>
                </div>
              </div>

              {/* Savings opportunity */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-start gap-2.5 mb-3">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-emerald-400 text-xs font-semibold">
                    {data.walletStats.savingsOpportunity} potential savings
                  </p>
                  <p className="text-gray-500 text-[10px] mt-0.5">
                    Switch to &ldquo;Low&rdquo; during off-peak hours to reduce costs
                  </p>
                </div>
              </div>

              {/* Top costly action */}
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-xs">Top cost driver</span>
                <span className="text-xs font-semibold bg-gray-800 text-gray-300 px-2.5 py-1 rounded-full">
                  {data.walletStats.topCostlyAction}
                </span>
              </div>
            </div>

            {/* ── Apply button ── */}
            <button
              onClick={handleApply}
              className={clsx(
                'w-full py-4 rounded-2xl font-semibold text-sm transition-all active:scale-95',
                applied
                  ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                  : 'bg-violet-600 text-white hover:bg-violet-500',
              )}
            >
              {applied ? (
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Fee Setting Applied
                </span>
              ) : (
                `Apply ${LEVEL_CONFIG[selectedLevel].label} Fee Setting`
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
