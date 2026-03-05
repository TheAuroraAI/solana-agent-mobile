'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Filter,
  Zap,
  Star,
  Rocket,
  Shield,
  RefreshCw,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useRouter } from 'next/navigation';
import type { ScreenerToken, ScreenerData, SortField, SortDir } from '@/app/api/screener/route';

// ─── Formatters ────────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  if (price >= 0.0001) return `$${price.toFixed(6)}`;
  return `$${price.toFixed(8)}`;
}

function formatLarge(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function formatCount(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return `${n}`;
}

function pctColor(v: number): string {
  if (v >= 10) return 'text-emerald-400';
  if (v > 0) return 'text-emerald-500';
  if (v > -10) return 'text-red-500';
  return 'text-red-400';
}

function PctBadge({ value }: { value: number }) {
  const isUp = value >= 0;
  return (
    <span
      className={clsx(
        'flex items-center gap-0.5 text-xs font-semibold tabular-nums',
        isUp ? 'text-emerald-400' : 'text-red-400',
      )}
    >
      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isUp ? '+' : ''}
      {value.toFixed(2)}%
    </span>
  );
}

// ─── Category badge ─────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  defi: 'bg-blue-900/50 text-blue-300',
  meme: 'bg-yellow-900/50 text-yellow-300',
  gaming: 'bg-green-900/50 text-green-300',
  ai: 'bg-violet-900/50 text-violet-300',
  infra: 'bg-orange-900/50 text-orange-300',
  nft: 'bg-pink-900/50 text-pink-300',
};

function CategoryBadge({ cat }: { cat: string }) {
  return (
    <span
      className={clsx(
        'text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full',
        CATEGORY_COLORS[cat] ?? 'bg-gray-800 text-gray-400',
      )}
    >
      {cat}
    </span>
  );
}

// ─── Preset definitions ──────────────────────────────────────────────────────

type PresetKey = 'new-highs' | 'high-volume' | 'rising-stars' | 'blue-chips';

const PRESETS: { key: PresetKey; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    key: 'new-highs',
    label: 'New Highs',
    icon: <Star className="w-3.5 h-3.5" />,
    desc: 'Within 30% of ATH',
  },
  {
    key: 'high-volume',
    label: 'High Volume',
    icon: <Zap className="w-3.5 h-3.5" />,
    desc: 'Vol/MCap ratio > 0.5',
  },
  {
    key: 'rising-stars',
    label: 'Rising Stars',
    icon: <Rocket className="w-3.5 h-3.5" />,
    desc: '<$50M MCap, +10% 24h',
  },
  {
    key: 'blue-chips',
    label: 'Blue Chips',
    icon: <Shield className="w-3.5 h-3.5" />,
    desc: '>$1B MCap, verified',
  },
];

function applyPreset(tokens: ScreenerToken[], preset: PresetKey | null): ScreenerToken[] {
  if (!preset) return tokens;
  switch (preset) {
    case 'new-highs':
      return tokens.filter((t) => t.athChangePercent >= -30);
    case 'high-volume':
      return tokens.filter((t) => t.volume24h / t.marketCap > 0.5);
    case 'rising-stars':
      return tokens.filter((t) => t.marketCap < 50_000_000 && t.change24h > 10);
    case 'blue-chips':
      return tokens.filter((t) => t.marketCap >= 1_000_000_000 && t.isVerified);
    default:
      return tokens;
  }
}

// ─── Token Row ────────────────────────────────────────────────────────────────

function TokenRow({
  token,
  rank,
  expanded,
  onToggle,
}: {
  token: ScreenerToken;
  rank: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const dexUrl = `https://dexscreener.com/solana?q=${token.symbol}`;

  return (
    <div className="border-b border-gray-800/60 last:border-0">
      {/* Main row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-3 active:bg-gray-800/40 transition-colors text-left"
      >
        {/* Rank */}
        <span className="text-gray-600 text-xs w-4 text-right shrink-0 tabular-nums">{rank}</span>

        {/* Logo */}
        <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-lg shrink-0 select-none">
          {token.logo}
        </div>

        {/* Identity */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-white text-sm font-bold leading-none">{token.symbol}</span>
            {token.isVerified && (
              <span className="w-3 h-3 rounded-full bg-violet-500 flex items-center justify-center text-[8px] text-white shrink-0">
                ✓
              </span>
            )}
            <CategoryBadge cat={token.category} />
          </div>
          <span className="text-gray-500 text-[11px] truncate block leading-tight mt-0.5">
            {token.name}
          </span>
        </div>

        {/* Price + 24h change */}
        <div className="text-right shrink-0 min-w-[70px]">
          <div className="text-white text-sm font-semibold tabular-nums leading-none">
            {formatPrice(token.price)}
          </div>
          <div className="mt-0.5">
            <PctBadge value={token.change24h} />
          </div>
        </div>

        {/* Mcap + volume */}
        <div className="text-right shrink-0 min-w-[64px] hidden xs:block">
          <div className="text-gray-300 text-xs tabular-nums">{formatLarge(token.marketCap)}</div>
          <div className="text-gray-600 text-[10px] tabular-nums mt-0.5">
            Vol {formatLarge(token.volume24h)}
          </div>
        </div>

        {/* Expand chevron */}
        <div className="shrink-0 ml-1">
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-600" />
          )}
        </div>
      </button>

      {/* Expanded detail panel */}
      {expanded && (
        <div className="px-4 pb-4 bg-gray-900/60">
          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <StatCell label="7d Change" value={<PctBadge value={token.change7d} />} />
            <StatCell label="30d Change" value={<PctBadge value={token.change30d} />} />
            <StatCell
              label="ATH Dist."
              value={
                <span className={clsx('text-xs font-semibold tabular-nums', pctColor(token.athChangePercent))}>
                  {token.athChangePercent.toFixed(1)}%
                </span>
              }
            />
            <StatCell
              label="MCap"
              value={<span className="text-xs text-gray-200 tabular-nums">{formatLarge(token.marketCap)}</span>}
            />
            <StatCell
              label="FDV"
              value={<span className="text-xs text-gray-200 tabular-nums">{formatLarge(token.fdv)}</span>}
            />
            <StatCell
              label="Liquidity"
              value={<span className="text-xs text-gray-200 tabular-nums">{formatLarge(token.liquidity)}</span>}
            />
            <StatCell
              label="Holders"
              value={<span className="text-xs text-gray-200 tabular-nums">{formatCount(token.holders)}</span>}
            />
            <StatCell
              label="TX 24h"
              value={<span className="text-xs text-gray-200 tabular-nums">{formatCount(token.txCount24h)}</span>}
            />
            <StatCell
              label="ATH"
              value={<span className="text-xs text-gray-200 tabular-nums">{formatPrice(token.ath)}</span>}
            />
          </div>

          {/* Tags */}
          {token.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {token.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Launch date + actions */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-600">
              Launched{' '}
              {new Date(token.launchDate).toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric',
              })}
            </span>
            <a
              href={dexUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white text-xs font-semibold px-4 py-1.5 rounded-full transition-colors"
            >
              Trade
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-gray-800/50 rounded-lg px-2 py-1.5">
      <div className="text-[9px] text-gray-500 uppercase tracking-wide mb-0.5">{label}</div>
      <div>{value}</div>
    </div>
  );
}

// ─── Sort bar ─────────────────────────────────────────────────────────────────

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'marketCap', label: 'Market Cap' },
  { value: 'volume24h', label: 'Volume' },
  { value: 'price', label: 'Price' },
  { value: 'change24h', label: '24h Change' },
  { value: 'change7d', label: '7d Change' },
  { value: 'txCount', label: 'TX Count' },
  { value: 'holders', label: 'Holders' },
];

// ─── Main view ────────────────────────────────────────────────────────────────

type CategoryFilter = 'all' | 'defi' | 'meme' | 'gaming' | 'ai' | 'infra' | 'nft';
type McapFilter = 'all' | 'micro' | 'small' | 'mid' | 'large';
type ChangeFilter = 'all' | 'gainers' | 'losers';

const CATEGORY_CHIPS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'defi', label: 'DeFi' },
  { value: 'meme', label: 'Meme' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'ai', label: 'AI' },
  { value: 'infra', label: 'Infra' },
];

const MCAP_CHIPS: { value: McapFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'micro', label: '<$10M' },
  { value: 'small', label: '$10M–$100M' },
  { value: 'mid', label: '$100M–$1B' },
  { value: 'large', label: '>$1B' },
];

const CHANGE_CHIPS: { value: ChangeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'gainers', label: 'Gainers >5%' },
  { value: 'losers', label: 'Losers <-5%' },
];

function mcapRange(filter: McapFilter): [number, number] {
  switch (filter) {
    case 'micro':  return [0, 10_000_000];
    case 'small':  return [10_000_000, 100_000_000];
    case 'mid':    return [100_000_000, 1_000_000_000];
    case 'large':  return [1_000_000_000, 0];
    default:       return [0, 0];
  }
}

export function ScreenerView() {
  const router = useRouter();

  // Remote data
  const [allTokens, setAllTokens] = useState<ScreenerToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [mcapFilter, setMcapFilter] = useState<McapFilter>('all');
  const [changeFilter, setChangeFilter] = useState<ChangeFilter>('all');
  const [preset, setPreset] = useState<PresetKey | null>(null);

  // Sort state
  const [sortField, setSortField] = useState<SortField>('marketCap');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // UI state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [min, max] = mcapRange(mcapFilter);
      const params = new URLSearchParams({
        sort: sortField,
        dir: sortDir,
        category: categoryFilter,
        minMcap: String(min),
        maxMcap: String(max),
      });
      const res = await fetch(`/api/screener?${params.toString()}`);
      const data: ScreenerData = await res.json();
      setAllTokens(data.tokens);
      setLastUpdated(data.lastUpdated);
    } catch {
      // keep stale data on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sortField, sortDir, categoryFilter, mcapFilter]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Client-side filter: change filter + preset (applied after server-sort)
  const displayTokens = useMemo(() => {
    let tokens = [...allTokens];

    if (changeFilter === 'gainers') tokens = tokens.filter((t) => t.change24h > 5);
    if (changeFilter === 'losers') tokens = tokens.filter((t) => t.change24h < -5);

    tokens = applyPreset(tokens, preset);

    return tokens;
  }, [allTokens, changeFilter, preset]);

  const toggleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
    setShowSortDropdown(false);
  };

  const handlePreset = (key: PresetKey) => {
    if (preset === key) {
      setPreset(null);
    } else {
      setPreset(key);
      // Reset conflicting filters when a preset is active
      setCategoryFilter('all');
      setMcapFilter('all');
      setChangeFilter('all');
    }
  };

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sortField)?.label ?? 'Sort';

  return (
    <div className="min-h-screen bg-gray-950">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-gray-950/95 backdrop-blur-sm border-b border-gray-800/60">
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center active:bg-gray-700 transition-colors shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4 text-gray-300" />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-white font-bold text-lg leading-none">Token Screener</h1>
            <p className="text-gray-500 text-[11px] mt-0.5">
              {loading ? 'Loading…' : `${displayTokens.length} tokens`}
              {lastUpdated && !loading && (
                <span className="ml-2 text-gray-600">
                  · {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center active:bg-gray-700 transition-colors shrink-0 disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw className={clsx('w-4 h-4 text-gray-300', refreshing && 'animate-spin')} />
          </button>
        </div>

        {/* ── Preset screens ────────────────────────────────────── */}
        <div className="flex gap-2 px-4 pb-2 overflow-x-auto scrollbar-hide">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => handlePreset(p.key)}
              className={clsx(
                'flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 border',
                preset === p.key
                  ? 'bg-violet-600 border-violet-500 text-white'
                  : 'bg-gray-800/60 border-gray-700/60 text-gray-400 active:bg-gray-700',
              )}
            >
              <span className={clsx(preset === p.key ? 'text-white' : 'text-violet-400')}>
                {p.icon}
              </span>
              {p.label}
            </button>
          ))}
        </div>

        {/* ── Category chips ─────────────────────────────────────── */}
        <div className="flex gap-2 px-4 pb-2 overflow-x-auto scrollbar-hide">
          {CATEGORY_CHIPS.map((chip) => (
            <button
              key={chip.value}
              onClick={() => {
                setCategoryFilter(chip.value);
                setPreset(null);
              }}
              className={clsx(
                'whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0',
                categoryFilter === chip.value && !preset
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-800/60 text-gray-400 active:bg-gray-700',
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* ── MCap + Change chips ────────────────────────────────── */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {MCAP_CHIPS.map((chip) => (
            <button
              key={chip.value}
              onClick={() => {
                setMcapFilter(chip.value);
                setPreset(null);
              }}
              className={clsx(
                'whitespace-nowrap px-3 py-1 rounded-full text-[11px] font-medium transition-all shrink-0 border',
                mcapFilter === chip.value && !preset
                  ? 'bg-blue-600/30 border-blue-500/60 text-blue-300'
                  : 'bg-gray-800/40 border-gray-700/50 text-gray-500 active:bg-gray-700',
              )}
            >
              {chip.label}
            </button>
          ))}
          <div className="w-px bg-gray-700/50 shrink-0" />
          {CHANGE_CHIPS.map((chip) => (
            <button
              key={chip.value}
              onClick={() => {
                setChangeFilter(chip.value);
                setPreset(null);
              }}
              className={clsx(
                'whitespace-nowrap px-3 py-1 rounded-full text-[11px] font-medium transition-all shrink-0 border',
                changeFilter === chip.value && !preset
                  ? chip.value === 'gainers'
                    ? 'bg-emerald-600/30 border-emerald-500/60 text-emerald-300'
                    : 'bg-red-600/30 border-red-500/60 text-red-300'
                  : 'bg-gray-800/40 border-gray-700/50 text-gray-500 active:bg-gray-700',
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* ── Sort bar ──────────────────────────────────────────── */}
        <div className="flex items-center gap-2 px-4 pb-3">
          <Filter className="w-3.5 h-3.5 text-gray-600 shrink-0" />
          <span className="text-gray-500 text-xs shrink-0">Sort:</span>

          {/* Sort field dropdown trigger */}
          <div className="relative">
            <button
              onClick={() => setShowSortDropdown((v) => !v)}
              className="flex items-center gap-1 bg-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-200 font-medium active:bg-gray-700 transition-colors"
            >
              {currentSortLabel}
              <ChevronsUpDown className="w-3 h-3 text-gray-500" />
            </button>

            {showSortDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-30 min-w-[160px] py-1">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => toggleSort(opt.value)}
                    className={clsx(
                      'w-full text-left px-3 py-2 text-xs font-medium transition-colors flex items-center justify-between',
                      sortField === opt.value
                        ? 'text-violet-300 bg-violet-900/40'
                        : 'text-gray-300 active:bg-gray-700',
                    )}
                  >
                    {opt.label}
                    {sortField === opt.value && (
                      sortDir === 'desc'
                        ? <ChevronDown className="w-3 h-3" />
                        : <ChevronUp className="w-3 h-3" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ASC / DESC toggle */}
          <button
            onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
            className={clsx(
              'flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
              sortDir === 'desc'
                ? 'bg-violet-900/50 text-violet-300'
                : 'bg-gray-800 text-gray-300 active:bg-gray-700',
            )}
          >
            {sortDir === 'desc' ? (
              <>
                <ChevronDown className="w-3 h-3" /> DESC
              </>
            ) : (
              <>
                <ChevronUp className="w-3 h-3" /> ASC
              </>
            )}
          </button>
        </div>
      </div>

      {/* Backdrop for sort dropdown */}
      {showSortDropdown && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setShowSortDropdown(false)}
        />
      )}

      {/* ── Token list ────────────────────────────────────────────── */}
      <div className="relative">
        {loading ? (
          <div className="px-4 pt-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-4 h-3 bg-gray-800 rounded" />
                <div className="w-8 h-8 bg-gray-800 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-gray-800 rounded w-20" />
                  <div className="h-2.5 bg-gray-800/60 rounded w-28" />
                </div>
                <div className="space-y-1.5 text-right">
                  <div className="h-3 bg-gray-800 rounded w-16" />
                  <div className="h-2.5 bg-gray-800/60 rounded w-12 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        ) : displayTokens.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-gray-400 font-medium">No tokens match</p>
            <p className="text-gray-600 text-sm mt-1">Try adjusting your filters</p>
            <button
              onClick={() => {
                setCategoryFilter('all');
                setMcapFilter('all');
                setChangeFilter('all');
                setPreset(null);
              }}
              className="mt-4 text-violet-400 text-sm font-medium underline underline-offset-2"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/0">
            {displayTokens.map((token, idx) => (
              <TokenRow
                key={token.id}
                token={token}
                rank={idx + 1}
                expanded={expandedId === token.id}
                onToggle={() =>
                  setExpandedId((prev) => (prev === token.id ? null : token.id))
                }
              />
            ))}
          </div>
        )}

        {/* Active preset indicator */}
        {preset && !loading && (
          <div className="sticky bottom-4 flex justify-center mt-4 pb-2">
            <div className="bg-violet-900/80 border border-violet-700/60 backdrop-blur-sm rounded-full px-4 py-1.5 flex items-center gap-2 text-violet-200 text-xs font-medium shadow-lg">
              <span>{PRESETS.find((p) => p.key === preset)?.icon}</span>
              <span>{PRESETS.find((p) => p.key === preset)?.label}</span>
              <span className="text-violet-400">·</span>
              <span>{PRESETS.find((p) => p.key === preset)?.desc}</span>
              <button
                onClick={() => setPreset(null)}
                className="ml-1 text-violet-400 hover:text-white"
                aria-label="Clear preset"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
