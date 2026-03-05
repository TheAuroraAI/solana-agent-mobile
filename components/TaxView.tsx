'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  RefreshCw,
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Download,
  AlertTriangle,
  ChevronRight,
  Zap,
} from 'lucide-react';
import clsx from 'clsx';
import type { TaxData, TaxEvent, TaxEventType } from '@/app/api/tax/route';
import { DemoBanner } from '@/components/DemoBanner';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const YEARS = [2023, 2024, 2025] as const;
type Year = (typeof YEARS)[number];

type EventFilter = 'all' | 'sales' | 'income' | 'airdrops';

const EVENT_FILTER_LABELS: Record<EventFilter, string> = {
  all: 'All',
  sales: 'Sales',
  income: 'Income',
  airdrops: 'Airdrops',
};

const EVENT_TYPE_LABEL: Record<TaxEventType, string> = {
  sale: 'Sale',
  purchase: 'Purchase',
  defi_income: 'DeFi',
  airdrop: 'Airdrop',
  staking_reward: 'Staking',
  transfer: 'Transfer',
};

const EVENT_TYPE_COLORS: Record<TaxEventType, string> = {
  sale: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  purchase: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  defi_income: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  airdrop: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  staking_reward: 'bg-green-500/20 text-green-300 border-green-500/30',
  transfer: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtUSD(v: number, showSign = false): string {
  const abs = Math.abs(v);
  let str: string;
  if (abs >= 1000) {
    str = `$${(abs / 1000).toFixed(2)}K`;
  } else {
    str = `$${abs.toFixed(2)}`;
  }
  if (showSign && v > 0) return `+${str}`;
  if (v < 0) return `-${str}`;
  return str;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function filterEvents(events: TaxEvent[], filter: EventFilter): TaxEvent[] {
  if (filter === 'all') return events;
  if (filter === 'sales') return events.filter((e) => e.type === 'sale' || e.type === 'purchase');
  if (filter === 'income')
    return events.filter((e) => e.type === 'defi_income' || e.type === 'staking_reward');
  if (filter === 'airdrops') return events.filter((e) => e.type === 'airdrop');
  return events;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SummaryCard({
  label,
  value,
  colorClass,
  icon: Icon,
  sub,
}: {
  label: string;
  value: string;
  colorClass: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  sub?: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
        <Icon size={13} />
        <span>{label}</span>
      </div>
      <span className={clsx('text-xl font-bold tracking-tight', colorClass)}>{value}</span>
      {sub && <span className="text-xs text-gray-500">{sub}</span>}
    </div>
  );
}

function EventTypeBadge({ type }: { type: TaxEventType }) {
  return (
    <span
      className={clsx(
        'text-[10px] font-semibold px-1.5 py-0.5 rounded border',
        EVENT_TYPE_COLORS[type],
      )}
    >
      {EVENT_TYPE_LABEL[type]}
    </span>
  );
}

function TokenLogo({ logo, symbol }: { logo: string; symbol: string }) {
  const [errored, setErrored] = useState(false);
  if (errored) {
    return (
      <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-300 shrink-0">
        {symbol.slice(0, 2)}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logo}
      alt={symbol}
      className="w-7 h-7 rounded-full object-cover shrink-0 bg-gray-800"
      onError={() => setErrored(true)}
    />
  );
}

function ExportButton({
  label,
  icon,
  onTap,
}: {
  label: string;
  icon: React.ReactNode;
  onTap: () => void;
}) {
  return (
    <button
      onClick={onTap}
      className="flex flex-col items-center gap-1.5 bg-gray-900 border border-gray-800 hover:border-violet-500/50 hover:bg-gray-800 rounded-xl p-3 transition-colors active:scale-95 flex-1"
    >
      <div className="text-violet-400">{icon}</div>
      <span className="text-xs text-gray-300 font-medium">{label}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-800 border border-violet-500/40 text-gray-100 text-sm px-4 py-2.5 rounded-xl shadow-lg animate-fade-in-up whitespace-nowrap">
      <Zap size={14} className="text-violet-400 shrink-0" />
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function TaxView() {
  const router = useRouter();
  const [year, setYear] = useState<Year>(2025);
  const [data, setData] = useState<TaxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventFilter, setEventFilter] = useState<EventFilter>('all');
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(
    async (y: Year) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/tax?year=${y}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: TaxData = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tax data');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    load(year);
  }, [year, load]);

  function handleYearChange(y: Year) {
    setYear(y);
    setEventFilter('all');
  }

  function handleExport(label: string) {
    setToast(`Pro feature — upgrade to export ${label}`);
  }

  const s = data?.summary;

  // Bar widths for breakdown chart
  const totalBar = s
    ? Math.abs(s.netShortTerm) + Math.abs(s.netLongTerm) + s.defiIncome + s.stakingRewards + s.airdrops || 1
    : 1;
  const stGainsPct = s ? (Math.max(0, s.netShortTerm) / totalBar) * 100 : 0;
  const ltGainsPct = s ? (Math.max(0, s.netLongTerm) / totalBar) * 100 : 0;
  const incomePct = s ? ((s.defiIncome + s.stakingRewards + s.airdrops) / totalBar) * 100 : 0;

  const filteredEvents = data ? filterEvents(data.events, eventFilter) : [];
  const sortedByToken = data
    ? [...data.byToken].sort((a, b) => Math.abs(b.netGain) - Math.abs(a.netGain))
    : [];

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-32">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-gray-950/95 backdrop-blur border-b border-gray-800/60 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={20} className="text-gray-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold leading-tight">Tax Report</h1>
          <p className="text-xs text-gray-500">
            {year} Summary{s ? ` · ${s.eventCount} events` : ''}
          </p>
        </div>
        <button
          onClick={() => load(year)}
          disabled={loading}
          className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-40"
          aria-label="Refresh"
        >
          <RefreshCw size={16} className={clsx('text-gray-400', loading && 'animate-spin')} />
        </button>
      </div>

      <DemoBanner />

      <div className="px-4 pt-4 space-y-5">
        {/* Year selector */}
        <div className="flex gap-2">
          {YEARS.map((y) => (
            <button
              key={y}
              onClick={() => handleYearChange(y)}
              className={clsx(
                'flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors',
                year === y
                  ? 'bg-violet-600 border-violet-500 text-white'
                  : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-600',
              )}
            >
              {y}
            </button>
          ))}
        </div>

        {/* Error state */}
        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !data && (
          <div className="space-y-4 animate-pulse">
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-800 rounded-xl" />
              ))}
            </div>
            <div className="h-40 bg-gray-800 rounded-xl" />
            <div className="h-48 bg-gray-800 rounded-xl" />
          </div>
        )}

        {/* Content */}
        {data && s && (
          <>
            {/* Summary cards 2x2 */}
            <div className="grid grid-cols-2 gap-3">
              <SummaryCard
                label="Short-Term Net"
                value={fmtUSD(s.netShortTerm, true)}
                colorClass={s.netShortTerm >= 0 ? 'text-green-400' : 'text-red-400'}
                icon={s.netShortTerm >= 0 ? TrendingUp : TrendingDown}
                sub="< 1 year held"
              />
              <SummaryCard
                label="Long-Term Net"
                value={fmtUSD(s.netLongTerm, true)}
                colorClass={s.netLongTerm >= 0 ? 'text-green-400' : 'text-red-400'}
                icon={s.netLongTerm >= 0 ? TrendingUp : TrendingDown}
                sub="> 1 year held"
              />
              <SummaryCard
                label="DeFi Income"
                value={fmtUSD(s.defiIncome + s.stakingRewards + s.airdrops)}
                colorClass="text-yellow-400"
                icon={Zap}
                sub="Staking + airdrops"
              />
              <SummaryCard
                label="Est. Tax Owed"
                value={fmtUSD(s.estimatedTaxOwed)}
                colorClass="text-orange-400"
                icon={DollarSign}
                sub="~25% effective rate"
              />
            </div>

            {/* Tax Breakdown card */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
              <h2 className="text-sm font-semibold text-gray-200">Tax Breakdown</h2>

              {/* Horizontal stacked bar */}
              <div className="space-y-1.5">
                <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                  <div
                    className="bg-violet-500 rounded-l-full transition-all"
                    style={{ width: `${stGainsPct}%` }}
                  />
                  <div
                    className="bg-green-500 transition-all"
                    style={{ width: `${ltGainsPct}%` }}
                  />
                  <div
                    className="bg-yellow-500 rounded-r-full transition-all"
                    style={{ width: `${incomePct}%` }}
                  />
                </div>
                <div className="flex gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />
                    ST Gains
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                    LT Gains
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />
                    Income
                  </span>
                </div>
              </div>

              {/* Breakdown rows */}
              <div className="space-y-2 pt-1 border-t border-gray-800">
                {[
                  { label: 'Short-term gains', val: s.shortTermGains, color: 'text-green-400' },
                  { label: 'Short-term losses', val: -s.shortTermLosses, color: 'text-red-400' },
                  { label: 'Long-term gains', val: s.longTermGains, color: 'text-green-400' },
                  { label: 'Long-term losses', val: -s.longTermLosses, color: 'text-red-400' },
                  { label: 'DeFi income', val: s.defiIncome, color: 'text-yellow-400' },
                  { label: 'Staking rewards', val: s.stakingRewards, color: 'text-yellow-400' },
                  { label: 'Airdrops', val: s.airdrops, color: 'text-cyan-400' },
                ].map(({ label, val, color }) => (
                  <div key={label} className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">{label}</span>
                    <span className={clsx('font-medium', color)}>{fmtUSD(val, true)}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-gray-700 pt-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 font-medium text-sm">Total taxable income</span>
                  <span
                    className={clsx(
                      'text-2xl font-bold',
                      s.totalTaxableIncome >= 0 ? 'text-green-400' : 'text-red-400',
                    )}
                  >
                    {fmtUSD(s.totalTaxableIncome, true)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Estimated tax owed</span>
                  <span className="text-orange-400 font-semibold text-base">
                    {fmtUSD(s.estimatedTaxOwed)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{data.taxBracketNote}</p>
              </div>
            </div>

            {/* By Token table */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-200">By Token</h2>
                <span className="text-xs text-gray-500">{sortedByToken.length} tokens</span>
              </div>
              <div className="divide-y divide-gray-800">
                {sortedByToken.map((row) => (
                  <div key={row.token} className="flex items-center gap-3 px-4 py-3">
                    <TokenLogo logo={row.logo} symbol={row.token} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-gray-100">{row.token}</span>
                    </div>
                    <div className="text-right">
                      <p
                        className={clsx(
                          'text-sm font-semibold',
                          row.netGain >= 0 ? 'text-green-400' : 'text-red-400',
                        )}
                      >
                        {fmtUSD(row.netGain, true)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {row.eventCount} event{row.eventCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <ChevronRight size={14} className="text-gray-600 shrink-0" />
                  </div>
                ))}
              </div>
            </div>

            {/* Events list */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-200 px-0.5">Transaction Events</h2>

              {/* Filter tabs */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {(Object.keys(EVENT_FILTER_LABELS) as EventFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setEventFilter(f)}
                    className={clsx(
                      'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-colors shrink-0',
                      eventFilter === f
                        ? 'bg-violet-600 border-violet-500 text-white'
                        : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-600',
                    )}
                  >
                    {EVENT_FILTER_LABELS[f]}
                    {f === 'all' && (
                      <span className="ml-1 text-gray-500">({data.events.length})</span>
                    )}
                    {f !== 'all' && (
                      <span className="ml-1 text-gray-500">
                        ({filterEvents(data.events, f).length})
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Events */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                {filteredEvents.length === 0 ? (
                  <div className="py-10 text-center text-gray-500 text-sm">
                    No events for this filter.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-800">
                    {filteredEvents.map((ev) => (
                      <div key={ev.id} className="flex items-center gap-3 px-4 py-3">
                        <TokenLogo logo={ev.logo} symbol={ev.token} />
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-semibold text-gray-100">{ev.token}</span>
                            <EventTypeBadge type={ev.type} />
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{fmtDate(ev.date)}</span>
                            <span>·</span>
                            <span className="truncate font-mono">{ev.txHash}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p
                            className={clsx(
                              'text-sm font-semibold',
                              ev.gainLoss >= 0 ? 'text-green-400' : 'text-red-400',
                            )}
                          >
                            {fmtUSD(ev.gainLoss, true)}
                          </p>
                          <p className="text-xs text-gray-500">{fmtUSD(ev.proceeds)} proceeds</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Export section */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Download size={15} className="text-violet-400" />
                <h2 className="text-sm font-semibold text-gray-200">Export Report</h2>
                <span className="ml-auto text-xs bg-violet-600/30 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full font-medium">
                  Pro
                </span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Export your {year} tax data in multiple formats. Upgrade to Pro to unlock exports.
              </p>
              <div className="flex gap-2">
                <ExportButton
                  label="CSV"
                  icon={<FileText size={18} />}
                  onTap={() => handleExport('CSV')}
                />
                <ExportButton
                  label="PDF"
                  icon={<FileText size={18} />}
                  onTap={() => handleExport('PDF')}
                />
                <ExportButton
                  label="TurboTax"
                  icon={<Download size={18} />}
                  onTap={() => handleExport('TurboTax')}
                />
                <ExportButton
                  label="Koinly"
                  icon={<Download size={18} />}
                  onTap={() => handleExport('Koinly')}
                />
              </div>
            </div>

            {/* Disclaimer */}
            <div className="flex gap-2 bg-gray-900/50 border border-gray-800 rounded-xl p-4">
              <AlertTriangle size={14} className="text-yellow-500 shrink-0 mt-0.5" />
              <p className="text-xs text-gray-500 leading-relaxed">{data.disclaimer}</p>
            </div>
          </>
        )}
      </div>

      {/* Toast */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
