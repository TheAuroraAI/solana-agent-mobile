'use client';

import { useEffect, useState } from 'react';
import { Sparkles, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { clsx } from 'clsx';
import type { BriefingData } from '@/app/api/briefing/route';

function timeLabel(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return 'today';
}

export function BriefingCard({ demo = false }: { demo?: boolean }) {
  const [data, setData] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBriefing = async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    try {
      const url = forceRefresh ? '/api/briefing?refresh=1' : '/api/briefing';
      const res = await fetch(url, { cache: forceRefresh ? 'no-store' : 'default' });
      if (res.ok) {
        const d: BriefingData = await res.json();
        setData(d);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBriefing();
  }, []);

  const solUp = (data?.solChange24h ?? 0) >= 0;

  return (
    <div className="mb-4">
      <div className="glass rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">Aurora's Briefing</p>
              {data && (
                <p className="text-gray-600 text-[10px]">
                  {data.source === 'live' ? '✦ AI-generated' : '✦ Market data'} · {timeLabel(data.generatedAt)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {data && (
              <div className={clsx(
                'flex items-center gap-0.5 text-xs font-medium',
                solUp ? 'text-emerald-400' : 'text-red-400'
              )}>
                {solUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>${data.solPrice.toFixed(2)}</span>
                <span className="text-[10px] opacity-70">
                  {solUp ? '+' : ''}{data.solChange24h.toFixed(1)}%
                </span>
              </div>
            )}
            <button
              onClick={() => !demo && fetchBriefing(true)}
              disabled={refreshing || demo}
              className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors disabled:opacity-40"
              title="Refresh briefing"
            >
              <RefreshCw className={clsx('w-3 h-3 text-gray-500', refreshing && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pb-4">
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="flex gap-2.5 items-start">
                  <div className="w-5 h-5 rounded bg-gray-800 animate-pulse flex-shrink-0 mt-0.5" />
                  <div className={clsx(
                    'h-4 rounded bg-gray-800 animate-pulse',
                    i === 0 ? 'w-full' : i === 1 ? 'w-5/6' : 'w-4/5'
                  )} />
                </div>
              ))}
            </div>
          ) : data ? (
            <div className="space-y-2.5">
              {data.points.map((point, i) => (
                <div key={i} className="flex gap-2.5 items-start">
                  <span className="text-base leading-none flex-shrink-0 mt-0.5">{point.emoji}</span>
                  <p className="text-gray-300 text-xs leading-relaxed">{point.text}</p>
                </div>
              ))}
              {(data.topGainer || data.topLoser) && (
                <div className="flex gap-2 pt-1">
                  {data.topGainer && (
                    <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full">
                      <TrendingUp className="w-2.5 h-2.5" />
                      {data.topGainer.symbol} +{data.topGainer.change.toFixed(1)}%
                    </span>
                  )}
                  {data.topLoser && (
                    <span className="flex items-center gap-1 bg-red-500/10 text-red-400 text-[10px] px-2 py-0.5 rounded-full">
                      <TrendingDown className="w-2.5 h-2.5" />
                      {data.topLoser.symbol} {data.topLoser.change.toFixed(1)}%
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-600 text-xs">Market data unavailable</p>
          )}
        </div>
      </div>
    </div>
  );
}
