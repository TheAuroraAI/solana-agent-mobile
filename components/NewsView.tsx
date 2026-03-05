'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Newspaper, TrendingUp } from 'lucide-react';
import clsx from 'clsx';
import type { NewsArticle, NewsCategory, NewsData } from '@/app/api/news/route';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type CategoryFilter = 'All' | NewsCategory;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const CATEGORY_FILTERS: CategoryFilter[] = [
  'All',
  'Protocol',
  'Market',
  'DeFi',
  'NFT',
  'Gaming',
];

const CATEGORY_COLORS: Record<NewsCategory, string> = {
  Protocol: 'text-violet-400 bg-violet-500/10',
  Market:   'text-blue-400   bg-blue-500/10',
  DeFi:     'text-emerald-400 bg-emerald-500/10',
  NFT:      'text-pink-400   bg-pink-500/10',
  Gaming:   'text-orange-400 bg-orange-500/10',
  Regulation: 'text-yellow-400 bg-yellow-500/10',
  Dev:      'text-cyan-400   bg-cyan-500/10',
};

const SENTIMENT_DOT: Record<NewsArticle['sentiment'], string> = {
  bullish: 'bg-emerald-400',
  bearish: 'bg-red-400',
  neutral: 'bg-gray-400',
};

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function CategoryBadge({ category }: { category: NewsCategory }) {
  return (
    <span
      className={clsx(
        'text-[10px] font-semibold rounded-full px-2 py-0.5',
        CATEGORY_COLORS[category],
      )}
    >
      {category}
    </span>
  );
}

function SentimentDot({ sentiment }: { sentiment: NewsArticle['sentiment'] }) {
  return (
    <span
      className={clsx('inline-block w-1.5 h-1.5 rounded-full flex-shrink-0', SENTIMENT_DOT[sentiment])}
      title={sentiment}
    />
  );
}

function FeaturedCard({ article }: { article: NewsArticle }) {
  return (
    <div className="bg-gradient-to-br from-violet-900/30 to-purple-900/20 border border-violet-500/30 rounded-2xl p-4 space-y-3">
      {/* Top row: emoji + category + featured badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="w-14 h-14 rounded-xl bg-gray-800/60 flex items-center justify-center text-3xl flex-shrink-0">
          {article.imageEmoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
            <span className="text-[10px] font-bold text-violet-300 bg-violet-500/20 border border-violet-500/30 rounded-full px-2 py-0.5 uppercase tracking-wide">
              Top Story
            </span>
            <CategoryBadge category={article.category} />
          </div>
          <h2 className="text-white font-bold text-sm leading-snug line-clamp-3">
            {article.title}
          </h2>
        </div>
      </div>

      {/* Summary */}
      <p className="text-gray-300 text-xs leading-relaxed">{article.summary}</p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {article.tags.map((tag) => (
          <span
            key={tag}
            className="text-[10px] bg-gray-800/80 text-gray-400 border border-gray-700/60 px-2 py-0.5 rounded-full"
          >
            #{tag}
          </span>
        ))}
      </div>

      {/* Footer: source / time / read + sentiment */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1.5 text-xs text-gray-400 min-w-0">
          <SentimentDot sentiment={article.sentiment} />
          <span className="font-medium text-gray-300 truncate">{article.source}</span>
          <span className="text-gray-600">·</span>
          <span className="text-gray-500">{article.timeAgo}</span>
          <span className="text-gray-600">·</span>
          <span className="text-gray-500">{article.readTime}</span>
        </div>
      </div>
    </div>
  );
}

function ArticleCard({ article }: { article: NewsArticle }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3 flex gap-3 items-start transition-colors hover:border-gray-700">
      {/* Left: emoji square */}
      <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center text-2xl flex-shrink-0 relative">
        {article.imageEmoji}
        {/* Category badge overlaid at bottom */}
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2">
          <CategoryBadge category={article.category} />
        </div>
      </div>

      {/* Right: content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <h3 className="text-white font-bold text-xs leading-snug line-clamp-2 mb-1">
          {article.title}
        </h3>
        <p className="text-gray-400 text-xs leading-relaxed line-clamp-2 mb-2">
          {article.summary}
        </p>
        {/* Meta row */}
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 flex-wrap">
          <SentimentDot sentiment={article.sentiment} />
          <span className="text-gray-400 font-medium">{article.source}</span>
          <span className="text-gray-700">·</span>
          <span>{article.timeAgo}</span>
          <span className="text-gray-700">·</span>
          <span>{article.readTime}</span>
        </div>
      </div>
    </div>
  );
}

function SkeletonFeatured() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3 animate-pulse">
      <div className="flex gap-3">
        <div className="w-14 h-14 bg-gray-800 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-gray-800 rounded w-1/3" />
          <div className="h-4 bg-gray-800 rounded w-full" />
          <div className="h-4 bg-gray-800 rounded w-5/6" />
        </div>
      </div>
      <div className="h-3 bg-gray-800 rounded w-full" />
      <div className="h-3 bg-gray-800 rounded w-4/5" />
      <div className="flex gap-2">
        <div className="h-4 bg-gray-800 rounded-full w-16" />
        <div className="h-4 bg-gray-800 rounded-full w-20" />
      </div>
    </div>
  );
}

function SkeletonArticle() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3 flex gap-3 animate-pulse">
      <div className="w-12 h-12 bg-gray-800 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2 pt-0.5">
        <div className="h-3 bg-gray-800 rounded w-full" />
        <div className="h-3 bg-gray-800 rounded w-4/5" />
        <div className="h-2.5 bg-gray-800 rounded w-full" />
        <div className="h-2.5 bg-gray-800 rounded w-3/4" />
        <div className="flex gap-2 pt-1">
          <div className="h-2.5 bg-gray-800 rounded w-20" />
          <div className="h-2.5 bg-gray-800 rounded w-10" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main View
// ---------------------------------------------------------------------------
export function NewsView() {
  const router = useRouter();
  const [data, setData] = useState<NewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('All');
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch('/api/news');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: NewsData = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load news');
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  const featured = data?.articles.find((a) => a.featured) ?? null;

  const regularArticles = data?.articles.filter((a) => {
    if (a.featured) return false;
    if (activeFilter === 'All') return true;
    return a.category === activeFilter;
  }) ?? [];

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
              <h1 className="text-lg font-bold text-white leading-none">News</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                {/* Live indicator dot */}
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                <p className="text-xs text-gray-500">Solana Ecosystem</p>
              </div>
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

        <div className="px-4 pt-4 space-y-4">
          {/* Trending pills */}
          {data && data.trending.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Trending
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {data.trending.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => {
                      const match = CATEGORY_FILTERS.find(
                        (f) => f.toLowerCase() === topic.toLowerCase(),
                      );
                      if (match) setActiveFilter(match);
                    }}
                    className="flex-shrink-0 text-xs bg-gray-900 border border-gray-700 text-gray-300 hover:border-violet-500 hover:text-violet-300 rounded-full px-3 py-1 transition-colors"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Featured article */}
          {loading && !error && <SkeletonFeatured />}
          {!loading && featured && <FeaturedCard article={featured} />}

          {/* Category filter chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORY_FILTERS.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={clsx(
                  'flex-shrink-0 text-xs font-medium rounded-full px-3 py-1 transition-colors',
                  activeFilter === filter
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-gray-300 hover:border-gray-700',
                )}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Error state */}
          {error && (
            <div className="bg-red-900/20 border border-red-800/50 rounded-2xl p-4 text-center">
              <p className="text-red-400 text-sm font-medium">Failed to load news</p>
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
              {[0, 1, 2, 3].map((i) => (
                <SkeletonArticle key={i} />
              ))}
            </div>
          )}

          {/* Regular article list */}
          {!loading && !error && (
            <>
              {regularArticles.length === 0 ? (
                <div className="text-center py-12">
                  <Newspaper className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No articles in this category</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {regularArticles.map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
              )}

              {/* Footer */}
              <p className="text-center text-gray-700 text-xs pb-2">
                Powered by AI curation · Updates every 5 min
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
