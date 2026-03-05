'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Bell, ExternalLink, Zap, TrendingUp, Clock } from 'lucide-react';
import clsx from 'clsx';
import type { Airdrop, AirdropStatus, AirdropsData } from '@/app/api/airdrops/route';
import { DemoBanner } from '@/components/DemoBanner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type FilterTab = 'all' | AirdropStatus;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatUSD(value: number | null): string {
  if (value === null) return 'TBD';
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function formatTokens(amount: number | null, symbol: string): string {
  if (amount === null) return 'TBD';
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K ${symbol}`;
  return `${amount.toLocaleString()} ${symbol}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function StatusBadge({ status }: { status: AirdropStatus }) {
  const styles: Record<AirdropStatus, string> = {
    claimable: 'bg-green-500/20 text-green-400 border border-green-500/40',
    upcoming: 'bg-violet-500/20 text-violet-400 border border-violet-500/40',
    claimed: 'bg-gray-500/20 text-gray-400 border border-gray-600/40',
    expired: 'bg-red-500/20 text-red-400 border border-red-500/40',
  };
  const labels: Record<AirdropStatus, string> = {
    claimable: 'Claimable',
    upcoming: 'Upcoming',
    claimed: 'Claimed',
    expired: 'Expired',
  };
  return (
    <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', styles[status])}>
      {labels[status]}
    </span>
  );
}

function TierBadge({ tier }: { tier: Airdrop['tier'] }) {
  const styles: Record<Airdrop['tier'], string> = {
    major: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40',
    mid: 'bg-slate-400/20 text-slate-300 border border-slate-500/40',
    small: 'bg-orange-800/30 text-orange-400 border border-orange-700/40',
  };
  const labels: Record<Airdrop['tier'], string> = {
    major: 'Major',
    mid: 'Mid',
    small: 'Small',
  };
  return (
    <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', styles[tier])}>
      {labels[tier]}
    </span>
  );
}

function EligibilityBar({ score }: { score: number }) {
  const barColor =
    score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500';
  const textColor =
    score >= 70 ? 'text-green-400' : score >= 40 ? 'text-yellow-400' : 'text-red-400';
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">Eligibility Score</span>
        <span className={clsx('text-xs font-bold', textColor)}>{score}/100</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function CriteriaChips({ criteria }: { criteria: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {criteria.map((c) => (
        <span
          key={c}
          className="text-xs bg-gray-800 text-gray-400 border border-gray-700 px-2 py-0.5 rounded-md"
        >
          {c}
        </span>
      ))}
    </div>
  );
}

function AirdropCard({ airdrop }: { airdrop: Airdrop }) {
  const days = daysUntil(airdrop.claimDeadline);
  const isUrgent = days !== null && days <= 3 && airdrop.status === 'claimable';

  return (
    <div
      className={clsx(
        'bg-gray-900 rounded-2xl border p-4 space-y-1 transition-all',
        isUrgent ? 'border-red-500/50 shadow-red-900/20 shadow-lg' : 'border-gray-800',
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-xl flex-shrink-0">
            {airdrop.logo}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white text-sm">{airdrop.protocol}</span>
              <span className="text-gray-500 text-xs font-mono">{airdrop.symbol}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <StatusBadge status={airdrop.status} />
              <TierBadge tier={airdrop.tier} />
            </div>
          </div>
        </div>

        {/* Value */}
        <div className="text-right flex-shrink-0">
          <div className="text-white font-bold text-sm">
            {formatUSD(airdrop.estimatedValue)}
          </div>
          <div className="text-gray-500 text-xs mt-0.5">
            {formatTokens(airdrop.estimatedTokens, airdrop.symbol)}
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-gray-400 text-xs leading-relaxed pt-1">{airdrop.description}</p>

      {/* Eligibility bar */}
      <EligibilityBar score={airdrop.eligibilityScore} />

      {/* Criteria chips */}
      <CriteriaChips criteria={airdrop.criteria} />

      {/* Date info */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          {airdrop.status === 'claimable' && airdrop.claimDeadline ? (
            <span className={clsx(isUrgent && 'text-red-400 font-semibold')}>
              {isUrgent ? `${days}d left` : `Deadline ${formatDate(airdrop.claimDeadline)}`}
            </span>
          ) : airdrop.snapshotDate ? (
            <span>Snapshot {formatDate(airdrop.snapshotDate)}</span>
          ) : (
            <span>Snapshot TBD</span>
          )}
        </div>
        <span className="text-xs text-gray-600">{airdrop.twitterHandle}</span>
      </div>

      {/* Action buttons */}
      {airdrop.status === 'claimable' && airdrop.claimUrl && (
        <a
          href={airdrop.claimUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center justify-center gap-2 w-full bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
        >
          <Zap className="w-4 h-4" />
          Claim Now
          <ExternalLink className="w-3 h-3 opacity-70" />
        </a>
      )}

      {airdrop.status === 'upcoming' && (
        <button className="mt-3 flex items-center justify-center gap-2 w-full border border-gray-700 text-gray-300 hover:border-violet-500 hover:text-violet-400 text-sm font-medium py-2.5 rounded-xl transition-colors">
          <Bell className="w-4 h-4" />
          Set Alert
        </button>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: 'green' | 'violet' | 'yellow';
}) {
  const accentMap = {
    green: 'text-green-400',
    violet: 'text-violet-400',
    yellow: 'text-yellow-400',
  };
  return (
    <div className="flex-1 bg-gray-900 border border-gray-800 rounded-2xl p-3">
      <p className="text-gray-500 text-xs">{label}</p>
      <p className={clsx('text-lg font-bold mt-0.5', accentMap[accent])}>{value}</p>
      {sub && <p className="text-gray-600 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-800" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3 bg-gray-800 rounded w-1/3" />
          <div className="h-2.5 bg-gray-800 rounded w-1/4" />
        </div>
        <div className="h-4 bg-gray-800 rounded w-14" />
      </div>
      <div className="h-2.5 bg-gray-800 rounded w-full" />
      <div className="h-2.5 bg-gray-800 rounded w-5/6" />
      <div className="h-1.5 bg-gray-800 rounded-full w-full" />
      <div className="flex gap-2">
        <div className="h-5 bg-gray-800 rounded-md w-24" />
        <div className="h-5 bg-gray-800 rounded-md w-20" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main View
// ---------------------------------------------------------------------------
const TABS: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'claimable', label: 'Claimable' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'claimed', label: 'Claimed' },
];

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export function AirdropsView() {
  const router = useRouter();
  const [data, setData] = useState<AirdropsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch('/api/airdrops');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: AirdropsData = await res.json();
      setData(json);
      setError(null);
      setLastRefreshed(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load airdrops');
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, []);

  // Initial fetch + auto-refresh
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Filtered airdrops
  const displayed =
    data?.airdrops.filter((a) => activeTab === 'all' || a.status === activeTab) ?? [];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-md mx-auto pb-24">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-gray-950/95 backdrop-blur-sm border-b border-gray-800/60 px-4 pt-4 pb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-white leading-none">Airdrop Tracker</h1>
              {data && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Est. pending value:{' '}
                  <span className="text-violet-400 font-semibold">
                    {formatUSD(data.totalEstimatedValue)}
                  </span>
                </p>
              )}
            </div>
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="p-2 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 transition-colors disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshCw className={clsx('w-4 h-4', refreshing && 'animate-spin')} />
            </button>
          </div>
        </div>

        <DemoBanner />

        <div className="px-4 pt-4 space-y-4">
          {/* Summary cards */}
          {loading ? (
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex-1 bg-gray-900 border border-gray-800 rounded-2xl p-3 h-16 animate-pulse"
                />
              ))}
            </div>
          ) : data ? (
            <div className="flex gap-2">
              <SummaryCard
                label="Claimable"
                value={String(data.claimableCount)}
                sub="ready now"
                accent="green"
              />
              <SummaryCard
                label="Upcoming"
                value={String(data.upcomingCount)}
                sub="tracked"
                accent="violet"
              />
              <SummaryCard
                label="Total Value"
                value={formatUSD(data.totalEstimatedValue)}
                sub="est. pending"
                accent="yellow"
              />
            </div>
          ) : null}

          {/* Filter tabs */}
          <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1">
            {TABS.map((tab) => {
              const count =
                tab.id === 'all'
                  ? data?.airdrops.length
                  : data?.airdrops.filter((a) => a.status === tab.id).length;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-1 text-xs font-medium py-1.5 px-2 rounded-lg transition-colors',
                    activeTab === tab.id
                      ? 'bg-violet-600 text-white'
                      : 'text-gray-500 hover:text-gray-300',
                  )}
                >
                  {tab.label}
                  {count !== undefined && count > 0 && (
                    <span
                      className={clsx(
                        'text-xs rounded-full px-1 min-w-[16px] text-center leading-4',
                        activeTab === tab.id
                          ? 'bg-white/20 text-white'
                          : 'bg-gray-800 text-gray-500',
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Error state */}
          {error && (
            <div className="bg-red-900/20 border border-red-800/50 rounded-2xl p-4 text-center">
              <p className="text-red-400 text-sm font-medium">Failed to load airdrops</p>
              <p className="text-red-500 text-xs mt-1">{error}</p>
              <button
                onClick={() => fetchData(true)}
                className="mt-3 text-xs text-red-400 underline hover:text-red-300"
              >
                Try again
              </button>
            </div>
          )}

          {/* Loading skeletons */}
          {loading && !error && (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {/* Airdrop cards */}
          {!loading && !error && (
            <>
              {displayed.length === 0 ? (
                <div className="text-center py-12">
                  <TrendingUp className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No airdrops in this category</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {displayed.map((airdrop) => (
                    <AirdropCard key={airdrop.id} airdrop={airdrop} />
                  ))}
                </div>
              )}

              {/* Last refreshed footer */}
              {lastRefreshed && (
                <p className="text-center text-gray-700 text-xs pb-2">
                  Updated {lastRefreshed.toLocaleTimeString()} · Auto-refreshes every 5 min
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
