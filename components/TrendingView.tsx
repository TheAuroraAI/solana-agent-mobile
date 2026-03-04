'use client';

import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, BarChart2, Award, RefreshCw, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';
import { PullToRefresh } from './PullToRefresh';
import type { TrendingToken, TrendingData } from '@/app/api/trending/route';

function formatPrice(price: number): string {
  if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.001) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(8)}`;
}

function formatVolume(vol: number): string {
  if (vol >= 1e9) return `$${(vol / 1e9).toFixed(1)}B`;
  if (vol >= 1e6) return `$${(vol / 1e6).toFixed(1)}M`;
  if (vol >= 1e3) return `$${(vol / 1e3).toFixed(0)}K`;
  return `$${vol.toFixed(0)}`;
}

function TokenRow({ token, rank }: { token: TrendingToken; rank: number }) {
  const change = token.price_change_percentage_24h ?? 0;
  const isUp = change >= 0;
  const dexUrl = `https://dexscreener.com/solana?q=${token.symbol}`;

  return (
    <a
      href={dexUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 px-4 py-3 active:bg-gray-800/60 transition-colors"
    >
      {/* Rank */}
      <span className="text-gray-600 text-xs w-5 text-right shrink-0">{rank}</span>

      {/* Token icon */}
      <div className="relative shrink-0">
        {token.image ? (
          <img
            src={token.image}
            alt={token.symbol}
            width={36}
            height={36}
            className="w-9 h-9 rounded-full bg-gray-800"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-violet-900/50 flex items-center justify-center text-violet-400 text-sm font-bold">
            {token.symbol.slice(0, 2)}
          </div>
        )}
      </div>

      {/* Name + volume */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-white text-sm font-semibold truncate">{token.symbol.toUpperCase()}</span>
          <ExternalLink className="w-3 h-3 text-gray-600 shrink-0" />
        </div>
        <span className="text-gray-500 text-xs truncate block">{token.name}</span>
        <span className="text-gray-600 text-[10px]">Vol {formatVolume(token.total_volume)}</span>
      </div>

      {/* Price + change */}
      <div className="text-right shrink-0">
        <div className="text-white text-sm font-medium">{formatPrice(token.current_price)}</div>
        <div className={clsx('flex items-center justify-end gap-0.5 text-xs font-medium', isUp ? 'text-emerald-400' : 'text-red-400')}>
          {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {isUp ? '+' : ''}{change.toFixed(2)}%
        </div>
      </div>
    </a>
  );
}

const TABS = [
  { key: 'gainers', label: 'Gainers', icon: TrendingUp },
  { key: 'losers', label: 'Losers', icon: TrendingDown },
  { key: 'volume', label: 'Volume', icon: BarChart2 },
  { key: 'mcap', label: 'Large Cap', icon: Award },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export function TrendingView() {
  const [activeTab, setActiveTab] = useState<TabKey>('gainers');
  const [data, setData] = useState<TrendingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/trending');
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const json: TrendingData = await res.json();
      setData(json);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const tokens: TrendingToken[] = data?.tabs[activeTab]?.tokens ?? [];

  return (
    <PullToRefresh onRefresh={fetchData}>
      <div className="min-h-screen pb-24">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur border-b border-gray-800 px-4 pt-4 pb-0">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-white text-xl font-bold">Trending</h1>
            <div className="flex items-center gap-2">
              {lastRefresh && (
                <span className="text-gray-600 text-[10px]">
                  {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <button
                onClick={fetchData}
                disabled={loading}
                aria-label="Refresh"
                className="p-1.5 rounded-lg bg-gray-800 text-gray-400 active:bg-gray-700 disabled:opacity-40"
              >
                <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 overflow-x-auto no-scrollbar pb-0">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-xs font-medium whitespace-nowrap border-b-2 transition-colors',
                  activeTab === key
                    ? 'text-violet-400 border-violet-500 bg-violet-500/5'
                    : 'text-gray-500 border-transparent hover:text-gray-300'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading && !data ? (
          <div className="divide-y divide-gray-800/50">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="w-5 h-3 bg-gray-800 rounded animate-pulse" />
                <div className="w-9 h-9 rounded-full bg-gray-800 animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-gray-800 rounded animate-pulse w-20" />
                  <div className="h-2.5 bg-gray-800 rounded animate-pulse w-28" />
                </div>
                <div className="text-right space-y-1.5">
                  <div className="h-3.5 bg-gray-800 rounded animate-pulse w-16" />
                  <div className="h-2.5 bg-gray-800 rounded animate-pulse w-12 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="text-red-400 text-sm">{error}</p>
            <button onClick={fetchData} className="text-violet-400 text-sm font-medium">Retry</button>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-800/50">
              {tokens.map((token, i) => (
                <TokenRow key={token.id} token={token} rank={i + 1} />
              ))}
            </div>

            {/* Source tag */}
            <div className="flex items-center justify-center gap-1 py-4">
              <span className="text-gray-700 text-[10px]">Solana ecosystem · CoinGecko</span>
            </div>
          </>
        )}
      </div>
    </PullToRefresh>
  );
}
