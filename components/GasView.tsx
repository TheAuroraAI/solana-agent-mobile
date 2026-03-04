'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  RefreshCw,
  Zap,
  Fuel,
  TrendingUp,
  TrendingDown,
  Activity,
  Info,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { GasData } from '@/app/api/gas/route';

const TIER_CONFIG = [
  {
    label: 'Low',
    color: '#34d399',
    bgClass: 'bg-emerald-500/10',
    borderClass: 'border-emerald-500/20',
    textClass: 'text-emerald-400',
    icon: Zap,
    useCase: 'Low priority, no rush',
  },
  {
    label: 'Medium',
    color: '#facc15',
    bgClass: 'bg-yellow-500/10',
    borderClass: 'border-yellow-500/20',
    textClass: 'text-yellow-400',
    icon: Zap,
    useCase: 'Standard transactions',
  },
  {
    label: 'High',
    color: '#f97316',
    bgClass: 'bg-orange-500/10',
    borderClass: 'border-orange-500/20',
    textClass: 'text-orange-400',
    icon: Zap,
    useCase: 'Fast confirmation needed',
  },
  {
    label: 'Very High',
    color: '#ef4444',
    bgClass: 'bg-red-500/10',
    borderClass: 'border-red-500/20',
    textClass: 'text-red-400',
    icon: AlertTriangle,
    useCase: 'Time-critical, competing txs',
  },
] as const;

const CONGESTION_CONFIG = {
  low: {
    label: 'Low Congestion',
    color: '#34d399',
    bgClass: 'bg-emerald-500/15',
    borderClass: 'border-emerald-500/30',
    textClass: 'text-emerald-400',
    description: 'Network is running smoothly. Low fees recommended.',
  },
  medium: {
    label: 'Moderate Congestion',
    color: '#facc15',
    bgClass: 'bg-yellow-500/15',
    borderClass: 'border-yellow-500/30',
    textClass: 'text-yellow-400',
    description: 'Some activity on the network. Medium fees should work.',
  },
  high: {
    label: 'High Congestion',
    color: '#f97316',
    bgClass: 'bg-orange-500/15',
    borderClass: 'border-orange-500/30',
    textClass: 'text-orange-400',
    description: 'Heavy network load. Consider higher priority fees.',
  },
  extreme: {
    label: 'Extreme Congestion',
    color: '#ef4444',
    bgClass: 'bg-red-500/15',
    borderClass: 'border-red-500/30',
    textClass: 'text-red-400',
    description: 'Network is very busy. High fees strongly recommended.',
  },
} as const;

const TIPS = [
  'Priority fees are priced in microlamports per compute unit (CU). A typical transaction uses ~200,000 CU.',
  'Setting a priority fee of 0 is valid but your transaction may be delayed during congestion.',
  'Jito tips are separate from priority fees. Use Jito bundles for MEV-protected transactions.',
  'During NFT mints or high-demand events, priority fees can spike by 100x or more.',
  'You only pay priority fees when a transaction lands on-chain. Failed transactions still pay base fees.',
  'Use "Medium" tier for most DeFi swaps. Reserve "Very High" for time-sensitive arbitrage or liquidations.',
];

function formatMicrolamports(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

function formatSolCost(sol: number): string {
  if (sol === 0) return '0 SOL';
  if (sol < 0.000001) return `< 0.000001 SOL`;
  if (sol < 0.001) return `${sol.toFixed(6)} SOL`;
  return `${sol.toFixed(4)} SOL`;
}

export function GasView() {
  const [data, setData] = useState<GasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tipsOpen, setTipsOpen] = useState(false);
  const router = useRouter();

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/gas');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Error ${res.status}`);
      }
      const json: GasData = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch gas data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(true);
    }, 15_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Loading skeleton
  if (loading && !data) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="sticky top-0 z-50 bg-black/95 backdrop-blur-xl border-b border-gray-800/50 px-4 py-3 flex items-center gap-3 safe-top">
          <div className="w-8 h-8 rounded-full bg-gray-800 animate-pulse" />
          <div className="h-5 bg-gray-800 rounded animate-pulse w-28" />
        </div>
        <div className="p-4 space-y-4 animate-pulse">
          <div className="h-24 bg-gray-900 rounded-2xl" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-36 bg-gray-900 rounded-2xl" />
            <div className="h-36 bg-gray-900 rounded-2xl" />
            <div className="h-36 bg-gray-900 rounded-2xl" />
            <div className="h-36 bg-gray-900 rounded-2xl" />
          </div>
          <div className="h-48 bg-gray-900 rounded-2xl" />
          <div className="h-24 bg-gray-900 rounded-2xl" />
        </div>
      </div>
    );
  }

  const congestion = data ? CONGESTION_CONFIG[data.congestionLevel] : CONGESTION_CONFIG.low;
  const maxHistoryFee = data ? Math.max(...data.feeHistory.map((h) => h.fee), 1) : 1;

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/95 backdrop-blur-xl border-b border-gray-800/50 px-4 py-3 flex items-center gap-3 safe-top">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-4 h-4 text-gray-300" />
        </button>
        <div className="flex-1">
          <h1 className="text-white font-semibold text-base flex items-center gap-2">
            <Fuel className="w-4 h-4 text-violet-400" />
            Gas Station
          </h1>
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
        {/* Error state */}
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

        {data && (
          <>
            {/* Congestion Badge */}
            <div className={clsx(
              'rounded-2xl p-4 border text-center',
              congestion.bgClass,
              congestion.borderClass,
            )}>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Activity className="w-5 h-5" style={{ color: congestion.color }} />
                <span className={clsx('text-lg font-bold', congestion.textClass)}>
                  {congestion.label}
                </span>
              </div>
              <p className="text-gray-400 text-xs">{congestion.description}</p>
              <div className="flex items-center justify-center gap-1 mt-2">
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: congestion.color }}
                />
                <span className="text-gray-500 text-[10px]">
                  Updated {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            </div>

            {/* Fee Tier Cards - 2x2 grid */}
            <div className="grid grid-cols-2 gap-3">
              {data.tiers.map((tier, i) => {
                const config = TIER_CONFIG[i];
                const Icon = config.icon;
                return (
                  <div
                    key={tier.label}
                    className={clsx(
                      'rounded-2xl p-4 border',
                      config.bgClass,
                      config.borderClass,
                    )}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <Icon className="w-3.5 h-3.5" style={{ color: config.color }} />
                      <span className={clsx('text-xs font-semibold', config.textClass)}>
                        {tier.label}
                      </span>
                    </div>
                    <p className="text-xl font-bold text-white mb-0.5">
                      {formatMicrolamports(tier.microlamports)}
                    </p>
                    <p className="text-gray-500 text-[10px] mb-2">microlamports/CU</p>
                    <p className="text-gray-400 text-[10px] mb-1.5">
                      ~{formatSolCost(tier.estimatedCostSol)}
                    </p>
                    <p className="text-gray-600 text-[10px] leading-tight">{config.useCase}</p>
                  </div>
                );
              })}
            </div>

            {/* Fee History Chart */}
            <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-violet-400" />
                  <span className="text-sm font-semibold text-white">Fee Trend</span>
                </div>
                <span className="text-gray-500 text-[10px]">Last {data.feeHistory.length} slots</span>
              </div>

              {/* Bar chart */}
              <div className="flex items-end gap-[3px] h-24">
                {data.feeHistory.map((entry, i) => {
                  const heightPct = maxHistoryFee > 0
                    ? Math.max((entry.fee / maxHistoryFee) * 100, 2)
                    : 2;
                  const isLast = i === data.feeHistory.length - 1;
                  return (
                    <div
                      key={entry.slot}
                      className="flex-1 rounded-t transition-all"
                      style={{
                        height: `${heightPct}%`,
                        backgroundColor: isLast ? '#8b5cf6' : '#374151',
                        minWidth: '4px',
                      }}
                      title={`Slot ${entry.slot}: ${entry.fee} microlamports`}
                    />
                  );
                })}
              </div>

              {/* Min/Max labels */}
              <div className="flex items-center justify-between mt-2 text-[10px] text-gray-500">
                <span>Min: {formatMicrolamports(Math.min(...data.feeHistory.map((h) => h.fee)))}</span>
                <span>Max: {formatMicrolamports(Math.max(...data.feeHistory.map((h) => h.fee)))}</span>
              </div>
            </div>

            {/* Statistics Section */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gray-900 rounded-2xl p-3 border border-gray-800 text-center">
                <TrendingUp className="w-4 h-4 text-violet-400 mx-auto mb-1.5" />
                <p className="text-sm font-bold text-white">{formatMicrolamports(data.avgFee)}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Avg Fee</p>
              </div>
              <div className="bg-gray-900 rounded-2xl p-3 border border-gray-800 text-center">
                <Activity className="w-4 h-4 text-blue-400 mx-auto mb-1.5" />
                <p className="text-sm font-bold text-white">{formatMicrolamports(data.medianFee)}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Median Fee</p>
              </div>
              <div className="bg-gray-900 rounded-2xl p-3 border border-gray-800 text-center">
                <TrendingDown className="w-4 h-4 text-emerald-400 mx-auto mb-1.5" />
                <p className="text-sm font-bold text-white">
                  {formatMicrolamports(
                    data.tiers.length >= 4
                      ? data.tiers[3].microlamports - data.tiers[0].microlamports
                      : 0,
                  )}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">Fee Range</p>
              </div>
            </div>

            {/* Tips Section */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              <button
                onClick={() => setTipsOpen(!tipsOpen)}
                className="w-full flex items-center justify-between p-4 active:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-violet-400" />
                  <span className="text-sm font-semibold text-white">Priority Fee Tips</span>
                </div>
                {tipsOpen ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              {tipsOpen && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-800/50 pt-3">
                  {TIPS.map((tip, i) => (
                    <div key={i} className="flex gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-violet-500/15 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-violet-400 text-[10px] font-bold">{i + 1}</span>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Source tag */}
            <div className="flex items-center justify-center gap-1 py-2">
              <span className="text-gray-700 text-[10px]">
                Solana Mainnet RPC -- getRecentPrioritizationFees
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
