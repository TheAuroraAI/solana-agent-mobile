'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, ArrowUpDown, ExternalLink, TrendingUp, TrendingDown } from 'lucide-react';
import { clsx } from 'clsx';
import type { SearchToken } from '@/app/api/search/route';

function formatPrice(price: number | null): string {
  if (price == null) return '—';
  if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.001) return `$${price.toFixed(4)}`;
  if (price >= 0.0000001) return `$${price.toFixed(8)}`;
  return `<$0.000001`;
}

function formatVolume(vol: number | null): string {
  if (vol == null) return '';
  if (vol >= 1e9) return `$${(vol / 1e9).toFixed(1)}B vol`;
  if (vol >= 1e6) return `$${(vol / 1e6).toFixed(1)}M vol`;
  if (vol >= 1e3) return `$${(vol / 1e3).toFixed(0)}K vol`;
  return '';
}

function TokenResult({ token }: { token: SearchToken }) {
  const isUp = (token.change24h ?? 0) >= 0;
  const jupUrl = `https://jup.ag/swap/SOL-${token.mint}`;
  const solscanUrl = `https://solscan.io/token/${token.mint}`;

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800/50 last:border-0">
      {/* Token icon */}
      <div className="shrink-0">
        {token.logoURI ? (
          <img
            src={token.logoURI}
            alt={token.symbol}
            width={40}
            height={40}
            className="w-10 h-10 rounded-full bg-gray-800"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-violet-900/50 flex items-center justify-center text-violet-400 text-sm font-bold">
            {token.symbol.slice(0, 2)}
          </div>
        )}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-white text-sm font-semibold">{token.symbol}</span>
          <a
            href={solscanUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-gray-700 active:text-gray-400"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <p className="text-gray-500 text-xs truncate">{token.name}</p>
        <p className="text-gray-700 text-[10px]">{formatVolume(token.volume24h)}</p>
      </div>

      {/* Price + change + swap */}
      <div className="text-right shrink-0 flex flex-col items-end gap-1">
        <span className="text-white text-sm font-medium">{formatPrice(token.price)}</span>
        {token.change24h != null && (
          <span className={clsx('flex items-center gap-0.5 text-xs', isUp ? 'text-emerald-400' : 'text-red-400')}>
            {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {isUp ? '+' : ''}{token.change24h.toFixed(2)}%
          </span>
        )}
        <a
          href={jupUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[10px] bg-violet-600/20 text-violet-400 px-2 py-0.5 rounded-md active:bg-violet-600/40"
        >
          <ArrowUpDown className="w-2.5 h-2.5" />
          Swap
        </a>
      </div>
    </div>
  );
}

export function TokenSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q || q.length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setResults(data.results ?? []);
      setHasSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  // Popular tokens to show before search
  const popularMints = [
    'SOL', 'USDC', 'JUP', 'BONK', 'WIF', 'RAY',
  ];

  return (
    <div className="min-h-screen pb-24">
      {/* Search header */}
      <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur px-4 pt-4 pb-3">
        <h1 className="text-white text-xl font-bold mb-3">Token Search</h1>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, symbol, or mint address…"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="w-full bg-gray-800/80 border border-gray-700/50 rounded-2xl pl-10 pr-10 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-violet-500/60 focus:bg-gray-800"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults([]); setHasSearched(false); inputRef.current?.focus(); }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 active:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && error && (
        <div className="text-center py-12">
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={() => search(query)} className="mt-2 text-violet-400 text-sm">Retry</button>
        </div>
      )}

      {!loading && !error && hasSearched && results.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-500 text-sm">No tokens found for &ldquo;{query}&rdquo;</p>
          <p className="text-gray-700 text-xs mt-1">Try a symbol like SOL, JUP, or BONK</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden mx-4 mt-2">
          {results.map((token) => (
            <TokenResult key={token.mint} token={token} />
          ))}
        </div>
      )}

      {!hasSearched && !query && (
        <div className="px-4 mt-2">
          <p className="text-gray-600 text-xs uppercase font-medium tracking-wider mb-3">Popular Tokens</p>
          <div className="flex flex-wrap gap-2">
            {popularMints.map((sym) => (
              <button
                key={sym}
                onClick={() => { setQuery(sym); inputRef.current?.focus(); }}
                className="px-3 py-1.5 bg-gray-800 rounded-full text-gray-400 text-xs font-medium active:bg-gray-700 transition-colors"
              >
                {sym}
              </button>
            ))}
          </div>
          <div className="mt-8 text-center">
            <p className="text-gray-600 text-xs">Search 1,000+ verified Solana tokens</p>
            <p className="text-gray-700 text-xs mt-0.5">Prices powered by Jupiter · 30s cache</p>
          </div>
        </div>
      )}
    </div>
  );
}
