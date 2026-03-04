'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { clsx } from 'clsx';

interface TokenPrice {
  symbol: string;
  price: number;
  change24h: number;
}

const TRACKED_TOKENS: { cgId: string; symbol: string; mint: string }[] = [
  { cgId: 'solana', symbol: 'SOL', mint: 'So11111111111111111111111111111111111111112' },
  { cgId: 'jupiter-exchange-solana', symbol: 'JUP', mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN' },
  { cgId: 'bonk', symbol: 'BONK', mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' },
  { cgId: 'pyth-network', symbol: 'PYTH', mint: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3' },
  { cgId: 'dogwifcoin', symbol: 'WIF', mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm' },
  { cgId: 'render-token', symbol: 'RENDER', mint: 'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof' },
  { cgId: 'seeker-token', symbol: 'SKR', mint: 'SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3' },
];

const DEMO_PRICES: TokenPrice[] = [
  { symbol: 'SOL', price: 141.82, change24h: 2.34 },
  { symbol: 'JUP', price: 0.892, change24h: -1.2 },
  { symbol: 'BONK', price: 0.0000234, change24h: 5.67 },
  { symbol: 'PYTH', price: 0.384, change24h: -0.45 },
  { symbol: 'WIF', price: 1.23, change24h: 3.12 },
  { symbol: 'RENDER', price: 7.84, change24h: -2.1 },
  { symbol: 'SKR', price: 0.042, change24h: 1.8 },
];

function formatPrice(price: number): string {
  if (price >= 100) return `$${price.toFixed(2)}`;
  if (price >= 1) return `$${price.toFixed(3)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(7)}`;
}

async function fetchPrices(): Promise<TokenPrice[]> {
  // Use CoinGecko for real 24h price changes
  const cgIds = TRACKED_TOKENS.map((t) => t.cgId).join(',');
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${cgIds}&vs_currencies=usd&include_24hr_change=true`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return TRACKED_TOKENS.map((token) => {
      const info = data?.[token.cgId];
      const price = info?.usd ?? 0;
      const change24h = info?.usd_24h_change ?? 0;
      return { symbol: token.symbol, price, change24h: Math.round(change24h * 100) / 100 };
    }).filter((t) => t.price > 0);
  } catch {
    // Fallback: Jupiter price API (no 24h change, show 0%)
    try {
      const mints = TRACKED_TOKENS.map((t) => t.mint).join(',');
      const res = await fetch(
        `https://api.jup.ag/price/v2?ids=${mints}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return TRACKED_TOKENS.map((token) => {
        const price = Number(data?.data?.[token.mint]?.price ?? 0);
        return { symbol: token.symbol, price, change24h: 0 };
      }).filter((t) => t.price > 0);
    } catch {
      return [];
    }
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
