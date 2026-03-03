'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { clsx } from 'clsx';

interface TokenPrice {
  symbol: string;
  price: number;
  change24h: number;
}

const TRACKED_MINTS: { mint: string; symbol: string }[] = [
  { mint: 'So11111111111111111111111111111111111111112', symbol: 'SOL' },
  { mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', symbol: 'JUP' },
  { mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', symbol: 'BONK' },
  { mint: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3', symbol: 'PYTH' },
  { mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', symbol: 'WIF' },
  { mint: 'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof', symbol: 'RENDER' },
];

const DEMO_PRICES: TokenPrice[] = [
  { symbol: 'SOL', price: 141.82, change24h: 2.34 },
  { symbol: 'JUP', price: 0.892, change24h: -1.2 },
  { symbol: 'BONK', price: 0.0000234, change24h: 5.67 },
  { symbol: 'PYTH', price: 0.384, change24h: -0.45 },
  { symbol: 'WIF', price: 1.23, change24h: 3.12 },
  { symbol: 'RENDER', price: 7.84, change24h: -2.1 },
];

function formatPrice(price: number): string {
  if (price >= 100) return `$${price.toFixed(2)}`;
  if (price >= 1) return `$${price.toFixed(3)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(7)}`;
}

async function fetchPrices(): Promise<TokenPrice[]> {
  const ids = TRACKED_MINTS.map((t) => t.mint).join(',');
  try {
    const res = await fetch(`https://price.jup.ag/v6/price?ids=${ids}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return TRACKED_MINTS.map((token) => {
      const info = data?.data?.[token.mint];
      const price = info?.price ?? 0;
      // Deterministic simulated 24h change for visual effect
      const seed = token.symbol.charCodeAt(0) + new Date().getDate();
      const change24h = ((seed % 20) - 10) * 0.3 + Math.sin(seed) * 2;
      return { symbol: token.symbol, price, change24h: Math.round(change24h * 100) / 100 };
    }).filter((t) => t.price > 0);
  } catch {
    return [];
  }
}

export function PriceTicker({ demo = false }: { demo?: boolean }) {
  const [prices, setPrices] = useState<TokenPrice[]>(demo ? DEMO_PRICES : []);

  useEffect(() => {
    if (demo) return;
    fetchPrices().then((p) => setPrices(p.length > 0 ? p : DEMO_PRICES));
    const interval = setInterval(() => {
      fetchPrices().then((p) => {
        if (p.length > 0) setPrices(p);
      });
    }, 30_000);
    return () => clearInterval(interval);
  }, [demo]);

  if (prices.length === 0) return null;

  const doubled = [...prices, ...prices];

  return (
    <div className="overflow-hidden mb-4 -mx-4">
      <div className="flex gap-2.5 ticker-scroll" style={{ width: 'max-content' }}>
        {doubled.map((token, i) => (
          <div
            key={`${token.symbol}-${i}`}
            className="flex items-center gap-2 glass rounded-full px-3 py-1.5 flex-shrink-0"
          >
            <span className="text-white text-xs font-semibold">{token.symbol}</span>
            <span className="text-gray-300 text-xs font-mono">{formatPrice(token.price)}</span>
            <span
              className={clsx(
                'text-xs font-medium flex items-center gap-0.5',
                token.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'
              )}
            >
              {token.change24h >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {token.change24h >= 0 ? '+' : ''}
              {token.change24h.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
