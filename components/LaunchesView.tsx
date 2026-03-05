'use client';

import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Star, RefreshCw, Rocket, Users, DollarSign } from 'lucide-react';
import { clsx } from 'clsx';
import type { LaunchesData, TokenLaunch, LaunchStatus } from '@/app/api/launches/route';

// ─── Filter Types ─────────────────────────────────────────────────────────────

type FilterTab = 'all' | LaunchStatus;

const FILTER_TABS: { label: string; value: FilterTab }[] = [
  { label: 'All',      value: 'all'      },
  { label: 'Live',     value: 'live'     },
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Ended',    value: 'ended'    },
];

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: LaunchStatus }) {
  if (status === 'live') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/20 text-red-400">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
        Live
      </span>
    );
  }
  if (status === 'upcoming') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-500/20 text-violet-400">
        Upcoming
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-700/60 text-gray-400">
      Ended
    </span>
  );
}

// ─── Type Badge ───────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-800 text-gray-400">
      {type}
    </span>
  );
}

// ─── Tag Pill ─────────────────────────────────────────────────────────────────

function TagPill({ tag }: { tag: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-medium bg-gray-800/80 text-gray-500">
      {tag}
    </span>
  );
}

// ─── Launch Card ─────────────────────────────────────────────────────────────

interface LaunchCardProps {
  launch: TokenLaunch;
  onToggleWatchlist: (id: string) => void;
}

function LaunchCard({ launch, onToggleWatchlist }: LaunchCardProps) {
  const isEnded = launch.status === 'ended';

  return (
    <div
      className={clsx(
        'bg-gray-900/60 border border-gray-800/50 rounded-2xl px-4 py-3.5 space-y-2.5 transition-opacity',
        isEnded && 'opacity-60',
      )}
    >
      {/* Row 1: logo + symbol/name + status */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-xl shrink-0">
          {launch.logo}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-bold leading-tight truncate">{launch.name}</p>
          <p className="text-gray-500 text-xs font-mono">{launch.symbol}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={launch.status} />
          <button
            onClick={() => onToggleWatchlist(launch.id)}
            className={clsx(
              'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
              launch.watchlisted
                ? 'text-violet-400 bg-violet-500/20'
                : 'text-gray-600 bg-gray-800/60 hover:text-gray-400',
            )}
            aria-label={launch.watchlisted ? 'Remove from watchlist' : 'Add to watchlist'}
          >
            <Star className={clsx('w-3.5 h-3.5', launch.watchlisted && 'fill-violet-400')} />
          </button>
        </div>
      </div>

      {/* Row 2: platform, type badge, date + time */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-gray-400 text-xs font-medium">{launch.platform}</span>
        <span className="text-gray-700">·</span>
        <TypeBadge type={launch.launchType} />
        <span className="text-gray-700">·</span>
        <span className="text-gray-500 text-xs">{launch.date}</span>
        <span className="text-gray-500 text-xs font-mono">{launch.time}</span>
      </div>

      {/* Row 3: price, raise, participants */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <DollarSign className="w-3 h-3 text-gray-600" />
          <div>
            <p className="text-[10px] text-gray-600 uppercase tracking-wide leading-none mb-0.5">Price</p>
            <p className="text-white text-xs font-semibold font-mono">{launch.price}</p>
          </div>
        </div>
        <div>
          <p className="text-[10px] text-gray-600 uppercase tracking-wide leading-none mb-0.5">Raise</p>
          <p className="text-white text-xs font-semibold font-mono">{launch.raise}</p>
        </div>
        {launch.participants !== undefined && (
          <div className="flex items-center gap-1 ml-auto">
            <Users className="w-3 h-3 text-gray-600" />
            <p className="text-gray-400 text-xs font-mono">
              {launch.participants.toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Allocation (if present) */}
      {launch.allocation !== undefined && (
        <p className="text-[11px] text-gray-500">
          <span className="text-gray-600">Allocation: </span>
          {launch.allocation}
        </p>
      )}

      {/* Description */}
      <p className="text-gray-500 text-xs leading-relaxed">{launch.description}</p>

      {/* Tags */}
      {launch.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {launch.tags.map((tag) => (
            <TagPill key={tag} tag={tag} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Live Now Banner ──────────────────────────────────────────────────────────

function LiveBanner({ count }: { count: number }) {
  return (
    <div className="mx-4 mb-3 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 flex items-center gap-3">
      <div className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse shrink-0" />
      <div>
        <p className="text-red-400 text-sm font-semibold">
          {count === 1 ? '1 launch is live now' : `${count} launches are live now`}
        </p>
        <p className="text-red-400/60 text-xs">Join before allocation fills</p>
      </div>
      <Rocket className="w-4 h-4 text-red-400/60 ml-auto shrink-0" />
    </div>
  );
}

// ─── Filter Chips ─────────────────────────────────────────────────────────────

interface FilterChipsProps {
  active: FilterTab;
  onChange: (tab: FilterTab) => void;
  liveCount: number;
}

function FilterChips({ active, onChange, liveCount }: FilterChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-0.5 px-4 scrollbar-none">
      {FILTER_TABS.map(({ label, value }) => {
        const isLive = value === 'live';
        return (
          <button
            key={value}
            onClick={() => onChange(value)}
            className={clsx(
              'shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all',
              active === value
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bg-gray-800/70 text-gray-400 hover:text-gray-200',
            )}
          >
            {isLive && liveCount > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            )}
            {label}
            {isLive && liveCount > 0 && (
              <span
                className={clsx(
                  'text-[10px] font-bold px-1 rounded-full',
                  active === value ? 'bg-white/20 text-white' : 'bg-red-500/20 text-red-400',
                )}
              >
                {liveCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-gray-900/60 border border-gray-800/50 rounded-2xl px-4 py-3.5 space-y-2.5 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-800" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 bg-gray-800 rounded w-28" />
          <div className="h-3 bg-gray-800/70 rounded w-16" />
        </div>
        <div className="h-5 bg-gray-800 rounded-full w-16" />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-3 bg-gray-800 rounded w-16" />
        <div className="h-4 bg-gray-800 rounded-full w-20" />
        <div className="h-3 bg-gray-800 rounded w-24" />
      </div>
      <div className="flex gap-4">
        <div className="h-8 bg-gray-800 rounded w-16" />
        <div className="h-8 bg-gray-800 rounded w-16" />
        <div className="h-4 bg-gray-800 rounded w-20 ml-auto" />
      </div>
      <div className="h-3 bg-gray-800/70 rounded w-full" />
      <div className="flex gap-1.5">
        <div className="h-4 bg-gray-800 rounded-lg w-12" />
        <div className="h-4 bg-gray-800 rounded-lg w-14" />
        <div className="h-4 bg-gray-800 rounded-lg w-10" />
      </div>
    </div>
  );
}

function LaunchesSkeleton() {
  return (
    <div className="px-4 space-y-3 mt-3">
      {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function LaunchesView() {
  const [data, setData] = useState<LaunchesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>('all');
  // Local watchlist state to support toggling without a round-trip
  const [watchlisted, setWatchlisted] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/launches');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as LaunchesData;
      setData(json);
      // Seed watchlist from API data
      const wl = new Set(
        json.launches.filter((l) => l.watchlisted).map((l) => l.id),
      );
      setWatchlisted(wl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load launches');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleWatchlist = useCallback((id: string) => {
    setWatchlisted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Build the display list: merge watchlist state + apply filter + sort by date
  const displayLaunches: TokenLaunch[] = (() => {
    if (!data) return [];

    const STATUS_ORDER: Record<LaunchStatus, number> = { live: 0, upcoming: 1, ended: 2 };

    return data.launches
      .filter((l) => filter === 'all' || l.status === filter)
      .map((l) => ({ ...l, watchlisted: watchlisted.has(l.id) }))
      .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
  })();

  return (
    <div className="min-h-screen bg-gray-950 pb-8">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center gap-3">
        <button
          onClick={() => window.history.back()}
          className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-colors shrink-0"
          aria-label="Go back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-white text-xl font-bold leading-tight">Launches</h1>
          <p className="text-gray-500 text-xs mt-0.5">Solana Token Calendar</p>
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

      {/* Live Now Banner */}
      {data && data.liveCount > 0 && <LiveBanner count={data.liveCount} />}

      {/* Filter Chips */}
      {data && (
        <div className="mb-3">
          <FilterChips
            active={filter}
            onChange={setFilter}
            liveCount={data.liveCount}
          />
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !data && <LaunchesSkeleton />}

      {/* Error state */}
      {error && (
        <div className="mx-4 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Launch List */}
      {data && (
        <div className="px-4 space-y-3">
          {displayLaunches.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-sm">No launches in this category</p>
            </div>
          ) : (
            displayLaunches.map((launch) => (
              <LaunchCard
                key={launch.id}
                launch={launch}
                onToggleWatchlist={toggleWatchlist}
              />
            ))
          )}

          {/* Footer count */}
          {displayLaunches.length > 0 && (
            <p className="text-center text-gray-700 text-[10px] pt-2">
              {displayLaunches.length} launch{displayLaunches.length !== 1 ? 'es' : ''} shown
              {data.upcomingCount > 0 && ` · ${data.upcomingCount} upcoming`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
