'use client';

import { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, Shield, TrendingUp, Percent, Users, Zap, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import type { ValidatorsData, Validator } from '@/app/api/validators/route';

// ─── Sort types ───────────────────────────────────────────────────────────────

type SortKey = 'apy' | 'commission' | 'stake';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseStake(stake: string): number {
  // "12.4M SOL" -> 12.4e6, "388K SOL" -> 388e3
  const match = /^([\d.]+)([MKB]?)/.exec(stake);
  if (!match) return 0;
  const num = parseFloat(match[1] ?? '0');
  const suffix = match[2] ?? '';
  if (suffix === 'B') return num * 1e9;
  if (suffix === 'M') return num * 1e6;
  if (suffix === 'K') return num * 1e3;
  return num;
}

function sortValidators(validators: Validator[], key: SortKey): Validator[] {
  return [...validators].sort((a, b) => {
    if (key === 'apy') return b.apy - a.apy;
    if (key === 'commission') return a.commission - b.commission;
    if (key === 'stake') return parseStake(b.stake) - parseStake(a.stake);
    return 0;
  });
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('bg-gray-800/60 animate-pulse rounded-xl', className)} />;
}

function ValidatorsSkeleton() {
  return (
    <div className="px-4 pb-6 space-y-4">
      <div className="grid grid-cols-3 gap-3 mt-1">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-10 w-full" />
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-44" />
      ))}
    </div>
  );
}

// ─── Summary Stat Card ────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  valueColor?: string;
}

function StatCard({ label, value, icon, iconBg, valueColor }: StatCardProps) {
  return (
    <div className="bg-gray-900/60 border border-gray-800/50 rounded-2xl p-3 flex flex-col gap-1.5">
      <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center', iconBg)}>
        {icon}
      </div>
      <p className={clsx('text-base font-bold font-mono leading-tight', valueColor ?? 'text-white')}>
        {value}
      </p>
      <p className="text-gray-500 text-[11px] font-medium leading-tight">{label}</p>
    </div>
  );
}

// ─── Sort Tabs ────────────────────────────────────────────────────────────────

const SORT_OPTIONS: { label: string; value: SortKey }[] = [
  { label: 'Best APY', value: 'apy' },
  { label: 'Lowest Commission', value: 'commission' },
  { label: 'Most Stake', value: 'stake' },
];

function SortTabs({ active, onChange }: { active: SortKey; onChange: (k: SortKey) => void }) {
  return (
    <div className="flex gap-1 bg-gray-800/70 rounded-xl p-1">
      {SORT_OPTIONS.map(({ label, value }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={clsx(
            'flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all whitespace-nowrap',
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

// ─── Validator Card ───────────────────────────────────────────────────────────

function ValidatorCard({ validator }: { validator: Validator }) {
  const skipBarWidth = Math.min((validator.skipRate / 5) * 100, 100);

  return (
    <div
      className={clsx(
        'bg-gray-900/60 border border-gray-800/50 rounded-2xl p-4',
        validator.delinquent && 'opacity-50',
      )}
    >
      {/* Top row: identity + featured badge */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-xl shrink-0">
            {validator.logo}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-white text-sm font-semibold leading-tight truncate">
                {validator.name}
              </p>
              {validator.delinquent && (
                <span className="text-[10px] font-semibold bg-red-500/15 text-red-400 border border-red-500/20 rounded-md px-1.5 py-0.5 shrink-0">
                  Delinquent
                </span>
              )}
            </div>
            <p className="text-gray-600 text-xs font-mono mt-0.5">{validator.voteAccount}</p>
          </div>
        </div>

        {validator.featured && (
          <span className="text-[10px] font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-md px-2 py-0.5 shrink-0 mt-0.5">
            Featured
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-gray-500 text-xs leading-relaxed mb-3">{validator.description}</p>

      {/* Stats row */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1 bg-gray-800/60 rounded-xl p-2.5 text-center">
          <p className="text-amber-400 text-sm font-bold font-mono leading-tight">
            {validator.commission}%
          </p>
          <p className="text-gray-600 text-[10px] mt-0.5">Commission</p>
        </div>
        <div className="flex-1 bg-gray-800/60 rounded-xl p-2.5 text-center">
          <p className="text-emerald-400 text-sm font-bold font-mono leading-tight">
            {validator.apy}%
          </p>
          <p className="text-gray-600 text-[10px] mt-0.5">APY</p>
        </div>
        <div className="flex-1 bg-gray-800/60 rounded-xl p-2.5 text-center">
          <p className="text-blue-400 text-sm font-bold font-mono leading-tight">
            {validator.uptime.toFixed(2)}%
          </p>
          <p className="text-gray-600 text-[10px] mt-0.5">Uptime</p>
        </div>
      </div>

      {/* Skip rate bar */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-gray-600 text-[10px] uppercase tracking-wider">Skip Rate</span>
          <span
            className={clsx(
              'text-[10px] font-semibold font-mono',
              validator.skipRate <= 1 ? 'text-emerald-400' : validator.skipRate <= 3 ? 'text-amber-400' : 'text-red-400',
            )}
          >
            {validator.skipRate.toFixed(1)}%
          </span>
        </div>
        <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={clsx(
              'h-full rounded-full transition-all duration-700',
              validator.skipRate <= 1 ? 'bg-emerald-500' : validator.skipRate <= 3 ? 'bg-amber-500' : 'bg-red-500',
            )}
            style={{ width: `${skipBarWidth.toFixed(1)}%` }}
          />
        </div>
      </div>

      {/* Bottom row: stakers + stake + AVS badge + button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3 text-gray-600" />
            <span className="text-gray-500 text-xs font-mono">
              {validator.stakers.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-gray-600" />
            <span className="text-gray-500 text-xs font-mono">{validator.stake}</span>
          </div>
          {validator.avsSupported && (
            <span className="text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-md px-1.5 py-0.5">
              AVS
            </span>
          )}
        </div>

        <button
          className="text-[11px] font-semibold text-violet-400 border border-violet-500/30 rounded-xl px-3 py-1.5 hover:bg-violet-500/10 transition-colors shrink-0"
          onClick={() => {}}
        >
          Stake with
        </button>
      </div>
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function ValidatorsView() {
  const [data, setData] = useState<ValidatorsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('apy');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/validators');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as ValidatorsData;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load validators');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sorted = data ? sortValidators(data.validators, sortKey) : [];

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center gap-3">
        <button
          onClick={() => window.history.back()}
          className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-colors shrink-0"
          aria-label="Go back"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-white text-xl font-bold leading-tight">Validators</h1>
          <p className="text-gray-500 text-xs mt-0.5">Compare Solana Validators</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Loading skeleton */}
      {loading && !data && <ValidatorsSkeleton />}

      {/* Error state */}
      {error && (
        <div className="mx-4 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Content */}
      {data && (
        <div className="px-4 pb-6 space-y-4">
          {/* Summary stat cards */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              label="Total Stake"
              value={data.totalStake}
              icon={<Shield className="w-3.5 h-3.5 text-blue-400" />}
              iconBg="bg-blue-500/15"
            />
            <StatCard
              label="Avg APY"
              value={`${data.avgApy}%`}
              icon={<TrendingUp className="w-3.5 h-3.5 text-emerald-400" />}
              iconBg="bg-emerald-500/15"
              valueColor="text-emerald-400"
            />
            <StatCard
              label="Avg Commission"
              value={`${data.avgCommission}%`}
              icon={<Percent className="w-3.5 h-3.5 text-amber-400" />}
              iconBg="bg-amber-500/15"
              valueColor="text-amber-400"
            />
          </div>

          {/* Sort tabs */}
          <SortTabs active={sortKey} onChange={setSortKey} />

          {/* Validator cards */}
          {sorted.map((validator) => (
            <ValidatorCard key={validator.id} validator={validator} />
          ))}
        </div>
      )}
    </div>
  );
}
