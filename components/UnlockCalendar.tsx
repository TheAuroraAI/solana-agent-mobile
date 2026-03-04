'use client';

import { useEffect, useState, useCallback } from 'react';
import { Calendar, AlertTriangle, TrendingDown, Clock, ChevronDown, ChevronUp, FlaskConical } from 'lucide-react';
import { clsx } from 'clsx';

interface TokenUnlock {
  id: string;
  token: string;
  symbol: string;
  date: string;
  amount: number;
  amountUsd: number;
  pctSupply: number;
  category: 'team' | 'investor' | 'ecosystem' | 'community' | 'treasury';
  impact: 'high' | 'medium' | 'low';
  description: string;
}

interface UnlockStats {
  totalEvents: number;
  totalValueUsd: number;
  highImpactCount: number;
  nextUnlock: string | null;
}

function formatLargeUsd(usd: number): string {
  if (usd >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(1)}B`;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(0)}K`;
  return `$${usd.toLocaleString()}`;
}

function formatAmount(amount: number): string {
  if (amount >= 1_000_000_000_000) return `${(amount / 1_000_000_000_000).toFixed(1)}T`;
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toLocaleString();
}

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function impactBadge(impact: TokenUnlock['impact']) {
  if (impact === 'high') return { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', label: 'HIGH' };
  if (impact === 'medium') return { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', label: 'MED' };
  return { color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/20', label: 'LOW' };
}

function categoryIcon(cat: TokenUnlock['category']) {
  const icons: Record<string, string> = {
    team: '👥',
    investor: '💰',
    ecosystem: '🌐',
    community: '🎁',
    treasury: '🏦',
  };
  return icons[cat] ?? '📦';
}

function UnlockCard({ unlock }: { unlock: TokenUnlock }) {
  const [expanded, setExpanded] = useState(false);
  const days = daysUntil(unlock.date);
  const badge = impactBadge(unlock.impact);

  return (
    <div className={clsx(
      'border rounded-2xl p-3.5 transition-all',
      badge.bg
    )}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className="text-lg">{categoryIcon(unlock.category)}</div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-white text-sm font-bold">{unlock.symbol}</span>
              <span className={clsx('text-xs px-1.5 py-0.5 rounded-full font-medium border', badge.bg, badge.color)}>
                {badge.label}
              </span>
            </div>
            <p className="text-gray-400 text-xs">{unlock.token}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 justify-end">
            <Clock className="w-3 h-3 text-gray-500" />
            <span className={clsx('text-xs font-bold',
              days <= 3 ? 'text-red-400' : days <= 7 ? 'text-yellow-400' : 'text-gray-300'
            )}>
              {days === 0 ? 'TODAY' : days === 1 ? 'TOMORROW' : `${days}d`}
            </span>
          </div>
          <p className="text-gray-500 text-xs">{formatDate(unlock.date)}</p>
        </div>
      </div>

      {/* Value & Supply Impact */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center gap-1">
          <TrendingDown className="w-3 h-3 text-gray-500" />
          <span className="text-gray-300 text-xs font-medium">
            {formatAmount(unlock.amount)} tokens
          </span>
        </div>
        <span className="text-gray-600">·</span>
        <span className="text-gray-300 text-xs font-medium">
          {formatLargeUsd(unlock.amountUsd)}
        </span>
        <span className="text-gray-600">·</span>
        <span className={clsx('text-xs font-medium',
          unlock.pctSupply >= 3 ? 'text-red-400' : unlock.pctSupply >= 1.5 ? 'text-yellow-400' : 'text-gray-400'
        )}>
          {unlock.pctSupply}% supply
        </span>
      </div>

      {/* Expandable description */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {expanded ? 'Less' : 'Details'}
      </button>

      {expanded && (
        <p className="text-gray-400 text-xs mt-2 leading-relaxed">
          {unlock.description}
        </p>
      )}
    </div>
  );
}

export function UnlockCalendar() {
  const [unlocks, setUnlocks] = useState<TokenUnlock[]>([]);
  const [stats, setStats] = useState<UnlockStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const fetchUnlocks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/unlocks');
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      setUnlocks(data.unlocks ?? []);
      setStats(data.stats ?? null);
    } catch {
      // keep existing
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnlocks();
  }, [fetchUnlocks]);

  const displayed = showAll ? unlocks : unlocks.slice(0, 4);
  const hasMore = unlocks.length > 4;

  return (
    <div className="mb-4">
      {/* Simulated data banner */}
      <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
        <FlaskConical className="w-4 h-4 text-amber-400 flex-shrink-0" />
        <p className="text-amber-300 text-xs">
          Simulated data — production would use real-time feeds from token unlock APIs.
        </p>
      </div>

      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-violet-400" />
          <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wider">
            Token Unlocks
          </h2>
          {stats && stats.highImpactCount > 0 && (
            <span className="flex items-center gap-0.5 text-xs bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded-full font-medium">
              <AlertTriangle className="w-2.5 h-2.5" />
              {stats.highImpactCount} high impact
            </span>
          )}
        </div>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-gray-900/50 rounded-xl p-2.5 text-center">
            <p className="text-white text-sm font-bold">{stats.totalEvents}</p>
            <p className="text-gray-500 text-xs">Events</p>
          </div>
          <div className="bg-gray-900/50 rounded-xl p-2.5 text-center">
            <p className="text-white text-sm font-bold">{formatLargeUsd(stats.totalValueUsd)}</p>
            <p className="text-gray-500 text-xs">Total Value</p>
          </div>
          <div className="bg-gray-900/50 rounded-xl p-2.5 text-center">
            <p className={clsx('text-sm font-bold',
              stats.nextUnlock && daysUntil(stats.nextUnlock) <= 3 ? 'text-red-400' : 'text-white'
            )}>
              {stats.nextUnlock ? `${daysUntil(stats.nextUnlock)}d` : '--'}
            </p>
            <p className="text-gray-500 text-xs">Next</p>
          </div>
        </div>
      )}

      {/* Unlock cards */}
      {loading ? (
        <div className="space-y-2.5">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl bg-gray-800/40 h-24 animate-pulse" />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-center">
          <p className="text-gray-500 text-sm">No upcoming token unlocks</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {displayed.map(u => (
            <UnlockCard key={u.id} unlock={u} />
          ))}
        </div>
      )}

      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full mt-2 text-xs text-violet-400 hover:text-violet-300 py-2 transition-colors"
        >
          {showAll ? 'Show fewer' : `Show all ${unlocks.length} unlocks`}
        </button>
      )}
    </div>
  );
}
