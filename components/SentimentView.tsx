'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  MessageCircle,
  Hash,
  AlertTriangle,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { SentimentData, TokenSentiment } from '@/app/api/sentiment/route';

/* ---------- sentiment colour helpers ---------- */

const SENTIMENT_COLORS = {
  very_bearish: {
    text: 'text-red-500',
    bg: 'bg-red-500/15',
    border: 'border-red-500/30',
    dot: 'bg-red-500',
    hex: '#ef4444',
    label: 'Very Bearish',
  },
  bearish: {
    text: 'text-orange-500',
    bg: 'bg-orange-500/15',
    border: 'border-orange-500/30',
    dot: 'bg-orange-500',
    hex: '#f97316',
    label: 'Bearish',
  },
  neutral: {
    text: 'text-gray-400',
    bg: 'bg-gray-400/15',
    border: 'border-gray-400/30',
    dot: 'bg-gray-400',
    hex: '#9ca3af',
    label: 'Neutral',
  },
  bullish: {
    text: 'text-emerald-500',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-500',
    hex: '#10b981',
    label: 'Bullish',
  },
  very_bullish: {
    text: 'text-emerald-400',
    bg: 'bg-emerald-400/15',
    border: 'border-emerald-400/30',
    dot: 'bg-emerald-400',
    hex: '#34d399',
    label: 'Very Bullish',
  },
} as const;

const FEAR_GREED_COLORS: Record<
  SentimentData['fearGreedIndex']['label'],
  { hex: string; text: string }
> = {
  'Extreme Fear': { hex: '#ef4444', text: 'text-red-500' },
  Fear: { hex: '#f97316', text: 'text-orange-500' },
  Neutral: { hex: '#facc15', text: 'text-yellow-400' },
  Greed: { hex: '#34d399', text: 'text-emerald-400' },
  'Extreme Greed': { hex: '#10b981', text: 'text-emerald-500' },
};

const SOURCE_ICONS: Record<string, string> = {
  X: '/icons/x.svg',
  Reddit: '/icons/reddit.svg',
  Discord: '/icons/discord.svg',
};

/* ---------- helpers ---------- */

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/** Map a sentiment score (-100..100) to a percentage (0..100) for the bar. */
function scoreToPercent(score: number): number {
  return ((score + 100) / 200) * 100;
}

/** Interpolate a colour along red-yellow-green for a -100..100 score. */
function scoreBarGradient(score: number): string {
  const pct = scoreToPercent(score);
  // Three-stop gradient: red 0%, yellow 50%, green 100%
  return `linear-gradient(90deg, #ef4444 0%, #facc15 50%, #34d399 100%)`;
}

/* ---------- Fear & Greed Gauge (semicircle via CSS) ---------- */

function FearGreedGauge({
  value,
  label,
}: {
  value: number;
  label: SentimentData['fearGreedIndex']['label'];
}) {
  const colorCfg = FEAR_GREED_COLORS[label];
  // Rotation: 0 = far left (-90deg from top), 100 = far right (90deg)
  // Map 0..100 to -90..90 degrees
  const needleAngle = -90 + (value / 100) * 180;

  return (
    <div className="flex flex-col items-center">
      {/* Semicircle container */}
      <div className="relative w-48 h-24 overflow-hidden">
        {/* Arc background */}
        <div
          className="absolute inset-0 rounded-t-full border-[6px] border-b-0 border-gray-700"
          style={{ borderTopColor: 'transparent' }}
        />
        {/* Coloured arc (conic gradient) */}
        <div
          className="absolute inset-0 rounded-t-full overflow-hidden"
          style={{
            background:
              'conic-gradient(from 180deg at 50% 100%, #ef4444 0deg, #f97316 36deg, #facc15 72deg, #a3e635 108deg, #34d399 144deg, #10b981 180deg, transparent 180deg)',
            maskImage:
              'radial-gradient(circle at 50% 100%, transparent 58%, black 59%, black 100%)',
            WebkitMaskImage:
              'radial-gradient(circle at 50% 100%, transparent 58%, black 59%, black 100%)',
          }}
        />
        {/* Needle */}
        <div
          className="absolute bottom-0 left-1/2 origin-bottom"
          style={{
            width: '2px',
            height: '80px',
            marginLeft: '-1px',
            transform: `rotate(${needleAngle}deg)`,
            transition: 'transform 0.6s ease-out',
          }}
        >
          <div
            className="w-2 h-2 rounded-full -ml-[3px]"
            style={{ backgroundColor: colorCfg.hex }}
          />
          <div
            className="w-[2px] h-[76px] mx-auto"
            style={{
              background: `linear-gradient(to bottom, ${colorCfg.hex}, transparent)`,
            }}
          />
        </div>
        {/* Center dot */}
        <div
          className="absolute bottom-0 left-1/2 w-3 h-3 rounded-full -ml-1.5 -mb-1.5 border-2 border-black"
          style={{ backgroundColor: colorCfg.hex }}
        />
      </div>

      {/* Value + label */}
      <p
        className={clsx('text-3xl font-bold mt-2', colorCfg.text)}
      >
        {value}
      </p>
      <p className={clsx('text-sm font-semibold', colorCfg.text)}>{label}</p>
    </div>
  );
}

/* ---------- Sentiment score bar ---------- */

function SentimentBar({ score }: { score: number }) {
  const pct = scoreToPercent(score);

  return (
    <div className="relative h-2 rounded-full overflow-hidden bg-gray-800">
      {/* Full gradient track */}
      <div
        className="absolute inset-0 rounded-full opacity-30"
        style={{ background: scoreBarGradient(score) }}
      />
      {/* Filled portion */}
      <div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{
          width: `${pct}%`,
          background: scoreBarGradient(score),
          transition: 'width 0.5s ease-out',
        }}
      />
      {/* Needle marker */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white rounded-full"
        style={{
          left: `${pct}%`,
          transform: 'translateX(-50%)',
          boxShadow: '0 0 4px rgba(255,255,255,0.6)',
        }}
      />
    </div>
  );
}

/* ---------- Token Card ---------- */

function TokenCard({ token }: { token: TokenSentiment }) {
  const cfg = SENTIMENT_COLORS[token.sentiment];
  const isChangePositive = token.mentionChange >= 0;

  return (
    <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
      {/* Header: symbol + sentiment badge */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-white text-base font-bold">{token.symbol}</span>
          <span className="text-gray-500 text-xs ml-2">{token.name}</span>
        </div>
        <span
          className={clsx(
            'text-[10px] font-semibold px-2 py-0.5 rounded-full',
            cfg.bg,
            cfg.text,
          )}
        >
          {cfg.label}
        </span>
      </div>

      {/* Score bar */}
      <div className="mb-1">
        <SentimentBar score={token.sentimentScore} />
      </div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-600 text-[10px]">-100</span>
        <span className={clsx('text-xs font-bold', cfg.text)}>
          {token.sentimentScore > 0 ? '+' : ''}
          {token.sentimentScore}
        </span>
        <span className="text-gray-600 text-[10px]">+100</span>
      </div>

      {/* Mentions */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <MessageCircle className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-gray-300 text-xs">
            {formatCount(token.mentions24h)} mentions
          </span>
        </div>
        <div
          className={clsx(
            'flex items-center gap-0.5 text-xs font-medium',
            isChangePositive ? 'text-emerald-400' : 'text-red-400',
          )}
        >
          {isChangePositive ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          {isChangePositive ? '+' : ''}
          {token.mentionChange.toFixed(1)}%
        </div>
      </div>

      {/* Top sources */}
      <div className="flex items-center gap-3 mb-3">
        {token.topSources.map((source) => (
          <div key={source.platform} className="flex items-center gap-1">
            {SOURCE_ICONS[source.platform] ? (
              <img
                src={SOURCE_ICONS[source.platform]}
                alt={source.platform}
                className="w-3.5 h-3.5 opacity-60"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : null}
            <span className="text-gray-500 text-[10px]">{source.platform}</span>
            <span className="text-gray-400 text-[10px] font-medium">
              {formatCount(source.count)}
            </span>
          </div>
        ))}
      </div>

      {/* Trending topics */}
      <div className="flex flex-wrap gap-1.5">
        {token.trendingTopics.map((topic) => (
          <span
            key={topic}
            className="text-[10px] text-gray-400 bg-gray-800 rounded-full px-2 py-0.5"
          >
            <Hash className="w-2.5 h-2.5 inline-block mr-0.5 -mt-px text-gray-600" />
            {topic}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- Loading skeleton ---------- */

function SentimentSkeleton() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="sticky top-0 z-50 bg-black/95 backdrop-blur-xl border-b border-gray-800/50 px-4 py-3 flex items-center gap-3 safe-top">
        <div className="w-8 h-8 rounded-full bg-gray-800 animate-pulse" />
        <div className="h-5 bg-gray-800 rounded animate-pulse w-28" />
      </div>
      <div className="p-4 space-y-4 animate-pulse">
        {/* Gauge placeholder */}
        <div className="bg-gray-900 rounded-2xl p-6 flex flex-col items-center">
          <div className="w-48 h-24 rounded-t-full bg-gray-800" />
          <div className="h-8 bg-gray-800 rounded w-12 mt-3" />
          <div className="h-4 bg-gray-800 rounded w-24 mt-2" />
        </div>
        {/* Token cards */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-gray-900 rounded-2xl p-4 border border-gray-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 bg-gray-800 rounded w-24" />
              <div className="h-4 bg-gray-800 rounded-full w-16" />
            </div>
            <div className="h-2 bg-gray-800 rounded-full" />
            <div className="flex items-center justify-between">
              <div className="h-3 bg-gray-800 rounded w-28" />
              <div className="h-3 bg-gray-800 rounded w-12" />
            </div>
            <div className="flex gap-3">
              <div className="h-3 bg-gray-800 rounded w-16" />
              <div className="h-3 bg-gray-800 rounded w-16" />
              <div className="h-3 bg-gray-800 rounded w-16" />
            </div>
            <div className="flex gap-1.5">
              <div className="h-5 bg-gray-800 rounded-full w-20" />
              <div className="h-5 bg-gray-800 rounded-full w-16" />
              <div className="h-5 bg-gray-800 rounded-full w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Main component ---------- */

export function SentimentView() {
  const [data, setData] = useState<SentimentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/sentiment');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? `Error ${res.status}`,
        );
      }
      const json: SentimentData = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sentiment data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 60s
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      fetchData(true);
    }, 60_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  /* --- loading --- */
  if (loading && !data) {
    return <SentimentSkeleton />;
  }

  /* --- aggregate trending topics --- */
  const topicCounts = new Map<string, number>();
  if (data) {
    for (const token of data.tokens) {
      for (const topic of token.trendingTopics) {
        topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
      }
    }
  }
  const aggregateTopics = [...topicCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  const marketCfg = data
    ? SENTIMENT_COLORS[data.overallMarketSentiment.label]
    : SENTIMENT_COLORS.neutral;

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
            <MessageCircle className="w-4 h-4 text-violet-400" />
            Social Pulse
          </h1>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center active:scale-95 transition-transform"
        >
          <RefreshCw
            className={clsx(
              'w-4 h-4 text-gray-300',
              refreshing && 'animate-spin',
            )}
          />
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
            {/* Market Mood Card */}
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <h2 className="text-white text-sm font-semibold text-center mb-4">
                Market Mood
              </h2>

              {/* Fear & Greed Gauge */}
              <FearGreedGauge
                value={data.fearGreedIndex.value}
                label={data.fearGreedIndex.label}
              />

              {/* Overall sentiment */}
              <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between">
                <span className="text-gray-500 text-xs">
                  Overall Sentiment
                </span>
                <div className="flex items-center gap-2">
                  <div
                    className={clsx(
                      'w-2 h-2 rounded-full',
                      marketCfg.dot,
                    )}
                  />
                  <span className={clsx('text-sm font-bold', marketCfg.text)}>
                    {data.overallMarketSentiment.score > 0 ? '+' : ''}
                    {data.overallMarketSentiment.score}
                  </span>
                  <span
                    className={clsx(
                      'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                      marketCfg.bg,
                      marketCfg.text,
                    )}
                  >
                    {marketCfg.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Trending Topics (aggregate) */}
            {aggregateTopics.length > 0 && (
              <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
                <h2 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
                  <Hash className="w-4 h-4 text-violet-400" />
                  Trending Topics
                </h2>
                <div className="flex flex-wrap gap-2">
                  {aggregateTopics.map(([topic, count]) => (
                    <span
                      key={topic}
                      className="text-xs text-gray-300 bg-gray-800 rounded-full px-3 py-1 flex items-center gap-1"
                    >
                      {topic}
                      <span className="text-gray-600 text-[10px]">
                        {count > 1 ? `(${count})` : ''}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Token Sentiment Cards */}
            <div className="space-y-3">
              {data.tokens.map((token) => (
                <TokenCard key={token.symbol} token={token} />
              ))}
            </div>

            {/* Source tag */}
            <div className="flex items-center justify-center gap-1 py-2">
              <span className="text-gray-700 text-[10px]">
                Social sentiment -- demo data
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
