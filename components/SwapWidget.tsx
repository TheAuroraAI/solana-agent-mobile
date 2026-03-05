'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowUpDown, Zap, ExternalLink, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';

interface Token {
  symbol: string;
  mint: string;
  decimals: number;
  icon: string;
}

const TOKENS: Token[] = [
  { symbol: 'SOL', mint: 'So11111111111111111111111111111111111111112', decimals: 9, icon: '◎' },
  { symbol: 'USDC', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6, icon: '$' },
  { symbol: 'USDT', mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', decimals: 6, icon: '₮' },
  { symbol: 'JitoSOL', mint: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn', decimals: 9, icon: '🟣' },
  { symbol: 'JUP', mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', decimals: 6, icon: '🪐' },
  { symbol: 'BONK', mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', decimals: 5, icon: '🐶' },
];

export function SwapWidget() {
  const [fromToken, setFromToken] = useState<Token>(TOKENS[0]);
  const [toToken, setToToken] = useState<Token>(TOKENS[1]);
  const [amount, setAmount] = useState('1');
  const [quote, setQuote] = useState<{ outAmount: number; priceImpact: number; route: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuote = useCallback(async () => {
    const amountNum = parseFloat(amount);
    if (!amountNum || fromToken.mint === toToken.mint) return;

    setLoading(true);
    setError(null);
    try {
      const inAmount = Math.floor(amountNum * Math.pow(10, fromToken.decimals));
      const url = `https://quote-api.jup.ag/v6/quote?inputMint=${fromToken.mint}&outputMint=${toToken.mint}&amount=${inAmount}&slippageBps=50`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Quote unavailable');
      const data = await res.json();
      const outAmount = Number(data.outAmount) / Math.pow(10, toToken.decimals);
      const priceImpact = parseFloat(data.priceImpactPct) || 0;
      const route = data.routePlan?.map((r: { swapInfo: { label: string } }) => r.swapInfo?.label || '').filter(Boolean).join(' → ') || 'Direct';
      setQuote({ outAmount, priceImpact, route });
    } catch {
      // Try live prices from server as fallback
      try {
        const priceRes = await fetch('/api/prices');
        if (priceRes.ok) {
          const priceData = await priceRes.json();
          // Normalize keys to lowercase for case-insensitive lookup (jitoSOL vs JitoSOL)
          const normalizedPrices: Record<string, number> = {};
          for (const [sym, val] of Object.entries(priceData.prices ?? {})) {
            normalizedPrices[sym.toLowerCase()] = (val as { usd: number }).usd;
          }
          const fromPrice = normalizedPrices[fromToken.symbol.toLowerCase()];
          const toPrice = normalizedPrices[toToken.symbol.toLowerCase()];
          if (fromPrice && toPrice && toPrice > 0) {
            setQuote({ outAmount: amountNum * (fromPrice / toPrice), priceImpact: 0.1, route: 'Price estimate' });
            return;
          }
        }
      } catch { /* fall through to static */ }

      // Static fallback (updated March 2026, SOL ~$91, JitoSOL ~$115)
      const rates: Record<string, Record<string, number>> = {
        SOL: { USDC: 91, USDT: 90.9, JitoSOL: 0.790, JUP: 478, BONK: 15_200_000 },
        USDC: { SOL: 0.011, JitoSOL: 0.0087, JUP: 5.26, BONK: 167_000 },
      };
      const rate = rates[fromToken.symbol]?.[toToken.symbol];
      if (rate) {
        setQuote({ outAmount: amountNum * rate, priceImpact: 0.01, route: 'Estimated (offline)' });
      } else {
        setError('Quote unavailable — live rate requires connection');
      }
    } finally {
      setLoading(false);
    }
  }, [amount, fromToken, toToken]);

  useEffect(() => {
    const t = setTimeout(fetchQuote, 500);
    return () => clearTimeout(t);
  }, [fetchQuote]);

  const flipTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setQuote(null);
  };

  const jupiterUrl = `https://jup.ag/swap/${fromToken.symbol}-${toToken.symbol}`;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wider">Quick Swap</h2>
        <div className="flex items-center gap-1 text-gray-600 text-xs">
          <Zap className="w-3 h-3 text-yellow-400" />
          <span>Powered by Jupiter</span>
        </div>
      </div>

      <div className="glass rounded-2xl p-4 space-y-3">
        {/* From */}
        <div className="space-y-1.5">
          <label className="text-gray-500 text-xs">You pay</label>
          <div className="flex gap-2">
            <select
              value={fromToken.symbol}
              onChange={(e) => setFromToken(TOKENS.find((t) => t.symbol === e.target.value) ?? TOKENS[0])}
              className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500/50 flex-shrink-0"
            >
              {TOKENS.map((t) => (
                <option key={t.symbol} value={t.symbol}>{t.icon} {t.symbol}</option>
              ))}
            </select>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="any"
              placeholder="0.00"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500/50 text-right"
            />
          </div>
        </div>

        {/* Flip */}
        <div className="flex justify-center">
          <button
            onClick={flipTokens}
            className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 hover:border-violet-500/50 flex items-center justify-center transition-colors"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>

        {/* To */}
        <div className="space-y-1.5">
          <label className="text-gray-500 text-xs">You receive</label>
          <div className="flex gap-2">
            <select
              value={toToken.symbol}
              onChange={(e) => setToToken(TOKENS.find((t) => t.symbol === e.target.value) ?? TOKENS[1])}
              className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500/50 flex-shrink-0"
            >
              {TOKENS.map((t) => (
                <option key={t.symbol} value={t.symbol} disabled={t.symbol === fromToken.symbol}>{t.icon} {t.symbol}</option>
              ))}
            </select>
            <div className="flex-1 bg-gray-900/50 border border-gray-700/50 rounded-xl px-3 py-2.5 text-right">
              {loading ? (
                <RefreshCw className="w-4 h-4 text-gray-600 animate-spin inline" />
              ) : quote ? (
                <span className="text-white text-sm font-medium">
                  {quote.outAmount < 0.001 ? quote.outAmount.toExponential(3) : quote.outAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                </span>
              ) : (
                <span className="text-gray-600 text-sm">—</span>
              )}
            </div>
          </div>
        </div>

        {/* Quote details */}
        {quote && !error && (
          <div className="bg-gray-900/50 rounded-xl p-2.5 space-y-1 text-xs">
            <div className="flex justify-between text-gray-500">
              <span>Price impact</span>
              <span className={clsx(quote.priceImpact > 1 ? 'text-red-400' : 'text-emerald-400')}>
                {quote.priceImpact < 0.01 ? '<0.01' : quote.priceImpact.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Route</span>
              <span className="text-gray-400 text-right max-w-[60%] truncate">{quote.route}</span>
            </div>
          </div>
        )}

        {error && (
          <p className="text-amber-500/70 text-xs">{error}</p>
        )}

        {/* CTA */}
        <a
          href={jupiterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 transition-colors text-white text-sm font-medium"
        >
          <Zap className="w-4 h-4" />
          Swap on Jupiter
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <p className="text-gray-700 text-[10px] text-center">Quotes from Jupiter Aggregator. Actual rate may vary.</p>
      </div>
    </div>
  );
}
