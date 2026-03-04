'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RefreshCw, TrendingUp, TrendingDown, Zap, Globe, Twitter, ExternalLink, Flame, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

interface SniperPair {
  address: string;
  name: string;
  symbol: string;
  pairAddress: string;
  dex: string;
  priceUsd: number;
  change1h: number;
  change24h: number;
  volume1h: number;
  volume24h: number;
  liquidityUsd: number;
  buys1h: number;
  sells1h: number;
  ageMinutes: number;
  imageUrl: string | null;
  hasWebsite: boolean;
  hasTwitter: boolean;
  boosted: boolean;
}

function formatPrice(p: number): string {
  if (p === 0) return '$—';
  if (p >= 1) return '$' + p.toFixed(3);
  if (p >= 0.001) return '$' + p.toFixed(6);
  const exp = p.toExponential(2);
  return '$' + exp;
}

function formatVolume(v: number): string {
  if (v >= 1_000_000) return '$' + (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000) return '$' + (v / 1_000).toFixed(0) + 'K';
  return '$' + v.toFixed(0);
}

function formatAge(minutes: number): string {
  if (minutes <= 0) return 'new';
  if (minutes < 60) return minutes + 'm';
  if (minutes < 1440) return Math.floor(minutes / 60) + 'h';
  return Math.floor(minutes / 1440) + 'd';
}

function riskLevel(pair: SniperPair): { label: string; color: string } {
  if (pair.liquidityUsd < 5000) return { label: 'Very High', color: 'text-red-400' };
  if (pair.liquidityUsd < 20000) return { label: 'High', color: 'text-orange-400' };
  if (!pair.hasWebsite && !pair.hasTwitter) return { label: 'High', color: 'text-orange-400' };
  if (pair.liquidityUsd < 100000) return { label: 'Medium', color: 'text-yellow-400' };
  return { label: 'Medium', color: 'text-yellow-400' };
}

export function TokenSniperView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isDemo = searchParams.get('demo') === 'true';

  const [pairs, setPairs] = useState<SniperPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'boosted' | 'hot'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sniper');
      const data = await res.json();
      if (Array.isArray(data.pairs)) {
        setPairs(data.pairs);
        setLastUpdated(data.lastUpdated ?? null);
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isDemo) {
      // Demo data
      setPairs([
        { address: 'demo1', name: 'DemoMeme', symbol: 'DMEM', pairAddress: 'p1', dex: 'raydium', priceUsd: 0.0000234, change1h: 142.5, change24h: 380.2, volume1h: 85000, volume24h: 420000, liquidityUsd: 62000, buys1h: 287, sells1h: 102, ageMinutes: 47, imageUrl: null, hasWebsite: true, hasTwitter: true, boosted: true },
        { address: 'demo2', name: 'SolSniper', symbol: 'SNPR', pairAddress: 'p2', dex: 'orca', priceUsd: 0.00412, change1h: 55.3, change24h: -12.4, volume1h: 31000, volume24h: 120000, liquidityUsd: 88000, buys1h: 143, sells1h: 89, ageMinutes: 180, imageUrl: null, hasWebsite: false, hasTwitter: true, boosted: false },
        { address: 'demo3', name: 'PumpDog', symbol: 'PDOG', pairAddress: 'p3', dex: 'raydium', priceUsd: 0.000891, change1h: 18.2, change24h: 220.7, volume1h: 12000, volume24h: 67000, liquidityUsd: 25000, buys1h: 74, sells1h: 42, ageMinutes: 720, imageUrl: null, hasWebsite: false, hasTwitter: false, boosted: false },
      ]);
      setLoading(false);
      return;
    }
    load();
  }, [isDemo, load]);

  const filtered = pairs.filter(p => {
    if (filter === 'boosted') return p.boosted;
    if (filter === 'hot') return p.buys1h > p.sells1h * 1.5 && p.change1h > 20;
    return true;
  });

  return (
    <div className="px-4 pt-4 pb-28 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            <h1 className="text-white text-xl font-bold">Token Sniper</h1>
          </div>
          <p className="text-gray-500 text-xs mt-0.5">
            {lastUpdated
              ? 'Updated ' + new Date(lastUpdated).toLocaleTimeString()
              : 'New Solana tokens · boosted + trending'}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading || isDemo}
          className="p-2 glass rounded-xl text-gray-400 hover:text-white transition-colors"
        >
          <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Risk warning */}
      <div className="glass rounded-2xl p-3 mb-4 flex items-start gap-2.5 bg-orange-500/5 border border-orange-500/15">
        <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
        <p className="text-orange-300 text-xs leading-relaxed">
          <span className="font-semibold">Extremely high risk.</span> New tokens can lose 100% of value. Always DYOR and never invest more than you can afford to lose.
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {(['all', 'boosted', 'hot'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              'flex-1 py-2 rounded-xl text-xs font-semibold transition-colors capitalize',
              filter === f
                ? 'bg-violet-600 text-white'
                : 'glass text-gray-400 hover:text-white'
            )}
          >
            {f === 'hot' ? '🔥 Hot' : f === 'boosted' ? '⚡ Boosted' : 'All'}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass rounded-2xl p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-800 rounded w-24" />
                  <div className="h-2 bg-gray-800 rounded w-16" />
                </div>
                <div className="space-y-2 text-right">
                  <div className="h-3 bg-gray-800 rounded w-16" />
                  <div className="h-2 bg-gray-800 rounded w-10" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center">
          <Zap className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 text-sm font-medium">No tokens found</p>
          <p className="text-gray-600 text-xs mt-1">
            {filter !== 'all' ? 'Try switching to "All" filter' : 'Tap refresh to fetch new listings'}
          </p>
        </div>
      )}

      {/* Token list */}
      <div className="space-y-3">
        {filtered.map(pair => {
          const risk = riskLevel(pair);
          const isUp1h = pair.change1h >= 0;
          const buyPressure = pair.buys1h + pair.sells1h > 0
            ? Math.round((pair.buys1h / (pair.buys1h + pair.sells1h)) * 100)
            : 50;
          const dexSuffix = isDemo ? '?demo=true' : '';

          return (
            <div key={pair.address} className="glass rounded-2xl p-4">
              <div className="flex items-start gap-3 mb-3">
                {/* Token icon */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500/30 to-purple-500/30 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                  {pair.symbol.slice(0, 2).toUpperCase()}
                </div>

                {/* Name + badges */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-white text-sm font-bold">{pair.symbol}</span>
                    <span className="text-gray-500 text-xs truncate">{pair.name}</span>
                    {pair.boosted && (
                      <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full font-medium">⚡ Boosted</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-gray-600 text-[10px] capitalize">{pair.dex}</span>
                    <span className="text-gray-700 text-[10px]">·</span>
                    <span className="text-gray-600 text-[10px]">Age: {formatAge(pair.ageMinutes)}</span>
                    <span className="text-gray-700 text-[10px]">·</span>
                    <span className={clsx('text-[10px] font-medium', risk.color)}>{risk.label} risk</span>
                  </div>
                </div>

                {/* Price + 1h change */}
                <div className="text-right flex-shrink-0">
                  <p className="text-white text-sm font-mono font-medium">{formatPrice(pair.priceUsd)}</p>
                  <p className={clsx('text-xs font-medium flex items-center justify-end gap-0.5', isUp1h ? 'text-emerald-400' : 'text-red-400')}>
                    {isUp1h ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {isUp1h ? '+' : ''}{pair.change1h.toFixed(1)}% 1h
                  </p>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-gray-900/60 rounded-lg p-2 text-center">
                  <p className="text-white text-xs font-semibold">{formatVolume(pair.volume1h)}</p>
                  <p className="text-gray-600 text-[10px]">Vol 1h</p>
                </div>
                <div className="bg-gray-900/60 rounded-lg p-2 text-center">
                  <p className="text-white text-xs font-semibold">{formatVolume(pair.liquidityUsd)}</p>
                  <p className="text-gray-600 text-[10px]">Liquidity</p>
                </div>
                <div className="bg-gray-900/60 rounded-lg p-2 text-center">
                  <p className={clsx('text-xs font-semibold', buyPressure >= 60 ? 'text-emerald-400' : buyPressure >= 40 ? 'text-gray-300' : 'text-red-400')}>
                    {buyPressure}%
                  </p>
                  <p className="text-gray-600 text-[10px]">Buys 1h</p>
                </div>
              </div>

              {/* Buy pressure bar */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] text-emerald-400 font-medium">{pair.buys1h}B</span>
                <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                    style={{ width: `${buyPressure}%` }}
                  />
                </div>
                <span className="text-[10px] text-red-400 font-medium">{pair.sells1h}S</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const url = `/actions${dexSuffix}${dexSuffix ? '&' : '?'}buy=${pair.address}&symbol=${pair.symbol}`;
                    router.push(url);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 transition-colors text-white text-xs font-semibold active:scale-95"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Snipe {pair.symbol}
                </button>

                <div className="flex gap-1">
                  {pair.hasWebsite && (
                    <a
                      href={`https://dexscreener.com/solana/${pair.pairAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 glass rounded-xl text-gray-400 hover:text-white"
                      aria-label="View on DexScreener"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {!pair.hasWebsite && (
                    <a
                      href={`https://dexscreener.com/solana/${pair.pairAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 glass rounded-xl text-gray-400 hover:text-white"
                      aria-label="View on DexScreener"
                    >
                      <Flame className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {pair.hasTwitter && (
                    <a
                      href={`https://dexscreener.com/solana/${pair.pairAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 glass rounded-xl text-gray-400 hover:text-white"
                      aria-label="DexScreener"
                    >
                      <Twitter className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length > 0 && (
        <p className="text-gray-700 text-xs text-center mt-4">
          Data from DexScreener · Not financial advice · DYOR
        </p>
      )}
    </div>
  );
}
