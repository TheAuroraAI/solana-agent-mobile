'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  RefreshCw, TrendingUp, ArrowUpRight, ArrowDownLeft, Copy, Check, ExternalLink,
  FlaskConical, Sparkles, AlertTriangle, Zap, ArrowRightLeft,
  Calendar, ChevronRight, ScanLine, Image as ImageIcon,
} from 'lucide-react';
import { PriceTicker } from './PriceTicker';
import { BriefingCard } from './BriefingCard';
import { ActionLogWidget } from './ActionLogWidget';
import { PullToRefresh } from './PullToRefresh';
import { NetworkStatus } from './NetworkStatus';
import { clsx } from 'clsx';
import {
  type WalletState,
  getWalletState,
  getNetwork,
  getSolscanCluster,
  DEMO_WALLET_STATE,
  formatSol,
  formatUsd,
  truncateAddress,
  timeAgo,
} from '@/lib/solana';
import { detectSeeker, type SeekerInfo } from '@/lib/seeker';
import { getActionStats } from '@/lib/action-log';
import { Shield, Bot } from 'lucide-react';
import { checkAlerts, fireNotification } from '@/lib/alerts';

const NETWORK = getNetwork();

// Token price estimates (used for portfolio total when no live price feed)
// These are rough fallbacks — real prices come from /api/prices
const TOKEN_USD_PRICES: Record<string, number> = {
  USDC: 1,
  USDT: 1,
  jitoSOL: 167, mSOL: 167, bSOL: 167, stSOL: 167, // LSTs approx SOL price
  JUP: 0.85,
  BONK: 0.000025,
  WIF: 2.1,
  SKR: 0.001,
  RAY: 2.5,
  ORCA: 3.5,
  PYTH: 0.38,
  RENDER: 8.0,
  HNT: 5.5,
  ETH: 3800,
  WEN: 0.00008,
  MNGO: 0.02,
};

function estimateTokenUsd(symbol: string, uiAmount: number, livePrices: Record<string, number>): number {
  // Prefer live price from /api/prices
  if (livePrices[symbol] != null) return uiAmount * livePrices[symbol];
  const price = TOKEN_USD_PRICES[symbol];
  if (price !== undefined) return uiAmount * price;
  return 0; // Unknown tokens not counted (shown as "?" in UI)
}

function computeTotalUsd(ws: WalletState, livePrices: Record<string, number>): number {
  const tokenValue = ws.tokens.reduce((sum, t) => sum + estimateTokenUsd(t.symbol, t.uiAmount, livePrices), 0);
  return ws.solBalanceUsd + tokenValue;
}

// SVG sparkline chart for portfolio value with optional real 24h change
function PortfolioSparkline({ totalUsd, solChange24h }: { totalUsd: number; solChange24h: number | null }) {
  const isReal = solChange24h != null;
  const change = isReal ? solChange24h : 0;

  // Reconstruct approximate 24h price curve from change %
  const startValue = isReal && totalUsd > 0
    ? totalUsd / (1 + change / 100)
    : totalUsd * 0.98;

  const points = Array.from({ length: 24 }, (_, i) => {
    const t = i / 23;
    // Smooth interpolation with slight mid-journey noise
    const base = startValue + (totalUsd - startValue) * t;
    const noise = Math.sin(i * 1.3) * Math.abs(totalUsd - startValue) * 0.08;
    return base + noise;
  });
  points[points.length - 1] = totalUsd;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const w = 320;
  const h = 60;
  const pad = 2;

  const pathPoints = points.map((v, i) => {
    const x = pad + (i / (points.length - 1)) * (w - 2 * pad);
    const y = h - pad - ((v - min) / range) * (h - 2 * pad);
    return `${x},${y}`;
  });

  const linePath = `M${pathPoints.join(' L')}`;
  const areaPath = `${linePath} L${w - pad},${h} L${pad},${h} Z`;
  const isUp = change >= 0;

  return (
    <div className="glass rounded-2xl p-3 mb-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-gray-400 text-xs">
          SOL 24h
          {!isReal && <span className="text-gray-600 ml-1">(loading…)</span>}
        </span>
        <span className={clsx('text-xs font-medium', isUp ? 'text-emerald-400' : 'text-red-400')}>
          {isReal ? (isUp ? '+' : '') + change.toFixed(2) + '%' : '—'}
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-14" preserveAspectRatio="none" role="img" aria-label={isReal ? `SOL 24h: ${isUp ? 'up' : 'down'} ${Math.abs(change).toFixed(2)}%` : 'Loading price data'}>
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isUp ? '#34d399' : '#f87171'} stopOpacity="0.3" />
            <stop offset="100%" stopColor={isUp ? '#34d399' : '#f87171'} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#sparkGrad)" />
        <path d={linePath} fill="none" stroke={isUp ? '#34d399' : '#f87171'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function computeHealthScore(ws: WalletState): { score: number; label: string; color: string } {
  let score = 50;

  // Diversification (+15 if not 100% SOL)
  // Only count stablecoins as USD (other tokens lack price data here)
  const stableUsdForHealth = ws.tokens
    .filter(t => t.symbol === 'USDC' || t.symbol === 'USDT')
    .reduce((s, t) => s + t.uiAmount, 0);
  const totalUsd = ws.solBalanceUsd + stableUsdForHealth;
  const solPct = totalUsd > 0 ? (ws.solBalanceUsd / totalUsd) * 100 : 100;
  if (solPct <= 70) score += 15;
  else if (solPct <= 85) score += 8;

  // Staking yield (+15 if holding LST)
  const hasLst = ws.tokens.some(t => ['jitoSOL', 'mSOL', 'bSOL', 'SKR', 'stSOL'].includes(t.symbol));
  if (hasLst) score += 15;

  // Stablecoin reserve (+10 if >5%)
  const stableUsd = ws.tokens.filter(t => t.symbol === 'USDC' || t.symbol === 'USDT')
    .reduce((s, t) => s + t.uiAmount, 0);
  const stablePct = totalUsd > 0 ? (stableUsd / totalUsd) * 100 : 0;
  if (stablePct >= 10) score += 10;
  else if (stablePct >= 5) score += 5;

  // Activity (+10 if recent txns)
  if (ws.recentTransactions.length >= 3) score += 10;

  // Clamp
  score = Math.min(100, Math.max(0, score));

  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs Work';
  const color = score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-violet-400' : score >= 40 ? 'text-yellow-400' : 'text-orange-400';
  return { score, label, color };
}

function HealthScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-16 h-16 flex-shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64" role="img" aria-label={`Health score: ${score} out of 100, ${label}`}>
          <circle cx="32" cy="32" r={r} fill="none" strokeWidth="5" className="stroke-gray-800" />
          <circle
            cx="32" cy="32" r={r} fill="none" strokeWidth="5"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            className={clsx(
              'transition-all duration-700',
              score >= 80 ? 'stroke-emerald-400' : score >= 60 ? 'stroke-violet-400' : score >= 40 ? 'stroke-yellow-400' : 'stroke-orange-400'
            )}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={clsx('text-sm font-bold', color)}>{score}</span>
        </div>
      </div>
      <div>
        <div className="flex items-center gap-1.5 mb-0.5">
          <Shield className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-white text-sm font-semibold">Portfolio Health</span>
        </div>
        <span className={clsx('text-xs font-semibold', color)}>{label}</span>
        <p className="text-gray-500 text-xs mt-0.5">Based on diversification, yield & activity</p>
      </div>
    </div>
  );
}

function PortfolioInsight({ walletState, totalUsd, livePrices }: { walletState: WalletState; totalUsd: number; livePrices: Record<string, number> }) {
  // Use the full computed totalUsd (which uses estimated/live prices for all known tokens)
  const safeTotalUsd = totalUsd > 0 ? totalUsd : walletState.solBalanceUsd;
  const solPct = Math.round((walletState.solBalanceUsd / safeTotalUsd) * 100);

  const stableUsd = walletState.tokens
    .filter((t) => t.symbol === 'USDC' || t.symbol === 'USDT')
    .reduce((s, t) => s + t.uiAmount, 0);
  const stablePct = Math.round((stableUsd / safeTotalUsd) * 100);
  const hasStaking = walletState.tokens.some(t =>
    ['jitoSOL', 'mSOL', 'bSOL', 'SKR'].includes(t.symbol));

  // Risk assessment
  let riskLevel: 'low' | 'moderate' | 'high' = 'moderate';
  let riskColor = 'text-yellow-400';
  let riskBg = 'bg-yellow-500/10';
  let insight = '';

  if (solPct >= 90 && !hasStaking) {
    riskLevel = 'high';
    riskColor = 'text-orange-400';
    riskBg = 'bg-orange-500/10';
    insight = `${solPct}% SOL concentration. Consider liquid staking for yield.`;
  } else if (hasStaking && stablePct >= 10) {
    riskLevel = 'low';
    riskColor = 'text-emerald-400';
    riskBg = 'bg-emerald-500/10';
    insight = 'Diversified with staking yield + stablecoin reserve.';
  } else if (solPct >= 70) {
    insight = `${solPct}% SOL exposure. Tap Actions for rebalancing proposals.`;
  } else {
    riskLevel = 'low';
    riskColor = 'text-emerald-400';
    riskBg = 'bg-emerald-500/10';
    insight = 'Well-balanced allocation across assets.';
  }

  return (
    <div className={clsx('glass rounded-2xl p-4 mb-4', riskBg)}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white text-sm font-semibold">Aurora Insight</span>
            <span className={clsx('text-xs px-1.5 py-0.5 rounded-full font-medium', riskBg, riskColor)}>
              {riskLevel} risk
            </span>
          </div>
          <p className="text-gray-300 text-xs leading-relaxed">{insight}</p>
          <p className="text-gray-600 text-xs mt-1.5">
            ⚠️ AI analysis uses estimated rates. Verify current APYs before acting.
          </p>

          {/* Portfolio allocation bar — each segment sized by real USD value */}
          {(() => {
            const tokenColors = ['bg-blue-500', 'bg-emerald-500', 'bg-yellow-500', 'bg-pink-500', 'bg-cyan-500'];
            const tokenSegments = walletState.tokens
              .map((t) => ({ t, pct: Math.round((estimateTokenUsd(t.symbol, t.uiAmount, livePrices) / safeTotalUsd) * 100) }))
              .filter((s) => s.pct >= 1);
            const unknownPct = Math.max(0, 100 - solPct - tokenSegments.reduce((s, x) => s + x.pct, 0));
            return (
              <>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-gray-800 overflow-hidden flex">
                    <div className="h-full bg-violet-500" style={{ width: `${solPct}%` }} />
                    {tokenSegments.map(({ t }, i) => (
                      <div key={t.mint} className={clsx('h-full', tokenColors[i % tokenColors.length])} style={{ width: `${tokenSegments[i].pct}%` }} />
                    ))}
                    {unknownPct > 2 && <div className="h-full bg-gray-600" style={{ width: `${unknownPct}%` }} />}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-violet-500" />
                    SOL {solPct}%
                  </span>
                  {tokenSegments.slice(0, 4).map(({ t, pct }, i) => (
                    <span key={t.mint} className="flex items-center gap-1">
                      <span className={clsx('w-2 h-2 rounded-full', tokenColors[i % tokenColors.length])} />
                      {t.symbol} {pct}%
                    </span>
                  ))}
                  {unknownPct > 2 && (
                    <span className="flex items-center gap-1 text-gray-600">
                      <span className="w-2 h-2 rounded-full bg-gray-600" />
                      other {unknownPct}%
                    </span>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

function AutonomyScore() {
  const stats = getActionStats();
  const total = stats.total || 1; // avoid /0
  const executionRate = Math.round((stats.executed / total) * 100);
  const score = Math.min(100, stats.executed * 15 + stats.approved * 5 + Math.min(stats.total, 10) * 2);

  const level = score >= 80 ? 'Autonomous' : score >= 40 ? 'Guided' : score >= 10 ? 'Learning' : 'New';
  const levelColor = score >= 80 ? 'text-emerald-400' : score >= 40 ? 'text-violet-400' : score >= 10 ? 'text-amber-400' : 'text-gray-400';

  return (
    <div className="glass rounded-2xl p-4 mb-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4 text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white text-sm font-semibold">Agent Autonomy</span>
            <span className={clsx('text-xs px-1.5 py-0.5 rounded-full font-medium bg-gray-800', levelColor)}>
              {level}
            </span>
          </div>
          <p className="text-gray-500 text-xs mt-0.5">
            {stats.total === 0
              ? 'No actions yet — Aurora learns from your decisions'
              : `${stats.executed} executed · ${stats.approved} approved · ${stats.rejected} rejected`}
          </p>
        </div>
      </div>
      {stats.total > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-900/50 rounded-lg p-2 text-center">
            <p className="text-white text-sm font-bold">{stats.total}</p>
            <p className="text-gray-500 text-[10px]">Proposals</p>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-2 text-center">
            <p className="text-emerald-400 text-sm font-bold">{executionRate}%</p>
            <p className="text-gray-500 text-[10px]">Execution</p>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-2 text-center">
            <p className={clsx('text-sm font-bold', levelColor)}>{score}</p>
            <p className="text-gray-500 text-[10px]">Score</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function DashboardView() {
  const { publicKey, connected } = useWallet();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';
  const [walletState, setWalletState] = useState<WalletState | null>(isDemo ? DEMO_WALLET_STATE : null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [seekerInfo, setSeekerInfo] = useState<SeekerInfo>({ isSeeker: false, features: [] });
  const [showReceive, setShowReceive] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [sendTo, setSendTo] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [showQrScan, setShowQrScan] = useState(false);
  const [qrScanError, setQrScanError] = useState<string | null>(null);
  const [solChange24h, setSolChange24h] = useState<number | null>(null);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [priceChanges24h, setPriceChanges24h] = useState<Record<string, number>>({});

  // Parse Solana Pay URL: solana:<address>?amount=X&label=Y
  const parseSolanaPayUrl = useCallback((raw: string) => {
    const trimmed = raw.trim();
    // Handle both "solana:ADDRESS?..." and bare "ADDRESS"
    const match = trimmed.match(/^(?:solana:)?([1-9A-HJ-NP-Za-km-z]{32,44})(?:\?(.*))?$/);
    if (!match) return false;
    const address = match[1];
    const params = new URLSearchParams(match[2] ?? '');
    const amount = params.get('amount');
    setSendTo(address);
    if (amount) setSendAmount(amount);
    setShowQrScan(false);
    setShowSend(true);
    return true;
  }, []);

  const startQrScan = useCallback(async () => {
    setQrScanError(null);
    // Use file input to capture camera image, then BarcodeDetector
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // rear camera on mobile
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      let imgSrc = '';
      try {
        const img = new Image();
        imgSrc = URL.createObjectURL(file);
        img.src = imgSrc;
        await new Promise((r) => { img.onload = r; });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const BD = (window as any).BarcodeDetector;
        if (!BD) {
          setQrScanError('QR scanning not supported on this browser. Enter address manually.');
          return;
        }
        const detector = new BD({ formats: ['qr_code'] });
        const results = await detector.detect(img);
        if (!results.length) { setQrScanError('No QR code found in image.'); return; }
        const raw = results[0].rawValue as string;
        if (!parseSolanaPayUrl(raw)) {
          setQrScanError(`Unrecognised QR format: ${raw.slice(0, 40)}`);
        }
      } catch {
        setQrScanError('Could not read QR code. Try again.');
      } finally {
        if (imgSrc) URL.revokeObjectURL(imgSrc);
      }
    };
    input.click();
  }, [parseSolanaPayUrl]);

  const fetchWalletState = useCallback(async () => {
    if (!publicKey) return;
    setLoading(true);
    setFetchError(null);
    try {
      const state = await getWalletState(publicKey.toString(), NETWORK);
      setWalletState(state);
    } catch {
      if (!walletState) setFetchError('Failed to load wallet data. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [publicKey, walletState]);

  useEffect(() => {
    setSeekerInfo(detectSeeker());
  }, []);

  // Fetch real prices: update portfolio allocation + check price alerts
  useEffect(() => {
    fetch('/api/prices')
      .then((r) => r.json())
      .then((d: { prices?: Record<string, { usd: number; change24h: number }> }) => {
        if (typeof d?.prices?.SOL?.change24h === 'number') {
          setSolChange24h(d.prices.SOL.change24h);
        }
        if (d?.prices) {
          // Store live prices in React state so totalUsd recomputes when they arrive
          const currentPrices: Record<string, number> = {};
          const changes: Record<string, number> = {};
          for (const [sym, info] of Object.entries(d.prices)) {
            currentPrices[sym] = info.usd;
            if (typeof info.change24h === 'number') changes[sym] = info.change24h;
          }
          setLivePrices(currentPrices);
          setPriceChanges24h(changes);
          // Check price alerts
          const triggered = checkAlerts(currentPrices);
          for (const alert of triggered) {
            fireNotification(
              `${alert.token} price alert`,
              `${alert.token} is now ${alert.direction === 'above' ? 'above' : 'below'} $${alert.targetPrice.toLocaleString()}`
            );
          }
        }
      })
      .catch(() => {}); // silent fail
  }, []);

  useEffect(() => {
    if (isDemo) return;
    if (!connected) {
      router.push('/');
      return;
    }
    fetchWalletState();
  }, [connected, fetchWalletState, router, isDemo]);

  const copyAddress = async () => {
    const addr = publicKey?.toString() ?? walletState?.address;
    if (!addr) return;
    await navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalUsd = useMemo(() => walletState ? computeTotalUsd(walletState, livePrices) : 0, [walletState, livePrices]);
  const healthScore = useMemo(() => walletState ? computeHealthScore(walletState) : { score: 0, label: '', color: '' }, [walletState]);

  // Compute portfolio 24h P&L using live price changes
  const portfolioPnL24h = useMemo(() => {
    if (!walletState || Object.keys(priceChanges24h).length === 0) return null;
    let pnl = 0;
    // SOL position
    const solChange = priceChanges24h['SOL'];
    if (typeof solChange === 'number' && walletState.solBalanceUsd > 0) {
      pnl += walletState.solBalanceUsd * (solChange / (100 + solChange));
    }
    // Token positions
    for (const token of walletState.tokens) {
      const change = priceChanges24h[token.symbol];
      if (typeof change !== 'number') continue;
      const currentVal = estimateTokenUsd(token.symbol, token.uiAmount, livePrices);
      if (currentVal > 0) {
        pnl += currentVal * (change / (100 + change));
      }
    }
    if (totalUsd === 0) return null;
    const pct = (pnl / (totalUsd - pnl)) * 100;
    return { usd: pnl, pct };
  }, [walletState, priceChanges24h, livePrices, totalUsd]);

  if (!walletState) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          {fetchError ? (
            <>
              <p className="text-gray-400 text-sm">{fetchError}</p>
              <button onClick={fetchWalletState} className="mt-3 text-sm text-violet-400 hover:text-violet-300 font-medium">Retry</button>
            </>
          ) : (
            <>
              <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Loading wallet...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={fetchWalletState}>
    <div className="safe-top px-4 pt-6 pb-4">
      {/* Demo Mode Banner */}
      {isDemo && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-violet-500/10 border border-violet-500/20 rounded-xl">
          <FlaskConical className="w-4 h-4 text-violet-400 flex-shrink-0" />
          <p className="text-violet-300 text-xs">
            Demo mode — sample data.{' '}
            <button onClick={() => router.push('/')} className="underline hover:text-violet-200">
              Connect wallet
            </button>{' '}
            for real data.
          </p>
        </div>
      )}

      {/* Seeker-Aware Mode */}
      {seekerInfo.isSeeker && (
        <div className="mb-4 p-3 bg-gradient-to-r from-violet-500/15 via-amber-500/10 to-violet-500/15 border border-violet-500/30 rounded-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/30 to-amber-500/30 flex items-center justify-center flex-shrink-0">
              <span className="text-lg">📱</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white text-sm font-semibold">{seekerInfo.model} Mode</p>
                <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-amber-500/20 text-amber-400">
                  ACTIVE
                </span>
              </div>
              <p className="text-violet-300/70 text-xs mt-0.5">
                {seekerInfo.features.slice(0, 2).join(' · ')}
              </p>
            </div>
            <a
              href="https://stake.solanamobile.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs bg-violet-500/20 text-violet-300 px-3 py-1.5 rounded-lg font-medium hover:bg-violet-500/30 transition-colors flex-shrink-0"
            >
              Stake SKR
            </a>
          </div>
        </div>
      )}

      {/* Network Status */}
      <NetworkStatus />

      {/* Live Price Ticker */}
      <PriceTicker demo={isDemo} />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-400 text-xs">Solana {NETWORK === 'mainnet' ? 'Mainnet' : 'Devnet'}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <button
              onClick={copyAddress}
              aria-label="Copy wallet address"
              className="flex items-center gap-1.5 text-white font-mono text-sm"
            >
              {truncateAddress(walletState.address)}
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-gray-500" />
              )}
            </button>
            <button
              onClick={() => setShowReceive(true)}
              aria-label="Show receive QR code"
              className="text-[10px] px-1.5 py-0.5 rounded-md bg-violet-600/20 text-violet-400 hover:bg-violet-600/30 transition-colors"
            >
              Receive
            </button>
          </div>
        </div>
        <button
          onClick={fetchWalletState}
          className="p-2 rounded-xl glass text-gray-400 hover:text-white transition-colors"
          disabled={loading}
        >
          <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Receive Modal */}
      {showReceive && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowReceive(false)}
        >
          <div
            className="w-full max-w-sm bg-gray-900 rounded-t-3xl p-6 pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-5" />
            <h3 className="text-white text-lg font-bold text-center mb-4">Receive SOL</h3>
            <div className="flex justify-center mb-4">
              {/* QR code via free QR code API */}
              <div className="w-48 h-48 bg-white rounded-2xl p-2 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=176x176&data=${walletState.address}`}
                  alt={`QR code for ${walletState.address}`}
                  width={176}
                  height={176}
                  className="rounded-lg"
                />
              </div>
            </div>
            <p className="text-gray-400 text-xs text-center font-mono break-all mb-4 px-2">{walletState.address}</p>
            <div className="flex gap-2">
              <button
                onClick={copyAddress}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors text-white text-sm"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  onClick={() => navigator.share({ title: 'My Solana Address', text: walletState.address })}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 transition-colors text-white text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Share
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Balance card */}
      <div className="glass rounded-3xl p-6 mb-4 bg-gradient-to-br from-violet-950/40 to-purple-950/20">
        <p className="text-gray-400 text-xs mb-1">Total Balance</p>
        <div className="flex items-end gap-3 mb-1">
          <div className="text-4xl font-bold text-white">
            {formatUsd(totalUsd)}
          </div>
          {portfolioPnL24h && (
            <div className={clsx(
              'text-sm font-medium pb-1',
              portfolioPnL24h.usd >= 0 ? 'text-emerald-400' : 'text-red-400'
            )}>
              {portfolioPnL24h.usd >= 0 ? '+' : ''}
              {formatUsd(portfolioPnL24h.usd)}{' '}
              <span className="text-xs opacity-80">
                ({portfolioPnL24h.pct >= 0 ? '+' : ''}{portfolioPnL24h.pct.toFixed(2)}%)
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-gray-300">
          <span className="text-sm font-medium">{formatSol(walletState.solBalance)}</span>
          {walletState.tokens.length > 0 && (
            <span className="text-gray-500 text-xs">+ {walletState.tokens.length} token{walletState.tokens.length !== 1 ? 's' : ''}</span>
          )}
          <span className={clsx(
            'text-xs flex items-center gap-1 ml-auto px-2 py-0.5 rounded-full font-medium',
            NETWORK === 'mainnet'
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'bg-blue-500/15 text-blue-400'
          )}>
            <span className={clsx(
              'w-1.5 h-1.5 rounded-full',
              NETWORK === 'mainnet' ? 'bg-emerald-400 animate-pulse' : 'bg-blue-400'
            )} />
            {NETWORK === 'mainnet' ? 'LIVE' : 'DEVNET'}
          </span>
        </div>
      </div>

      {/* Portfolio Sparkline */}
      <PortfolioSparkline totalUsd={totalUsd} solChange24h={solChange24h} />

      {/* AI Market Briefing */}
      <BriefingCard demo={isDemo} />

      {/* Portfolio Health Score */}
      <div className="glass rounded-2xl p-4 mb-4">
        <HealthScoreRing {...healthScore} />
      </div>

      {/* Aurora Portfolio Insight */}
      <PortfolioInsight walletState={walletState} totalUsd={totalUsd} livePrices={livePrices} />

      {/* Agent Autonomy Score */}
      <AutonomyScore />

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-2 mb-1">
        <button
          onClick={() => setShowSend(true)}
          className="glass rounded-2xl p-3 flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
        >
          <div className="w-9 h-9 bg-orange-500/20 rounded-xl flex items-center justify-center">
            <ArrowUpRight className="text-orange-400 w-4 h-4" />
          </div>
          <span className="text-white text-xs font-medium">Send</span>
        </button>
        <button
          onClick={() => setShowReceive(true)}
          className="glass rounded-2xl p-3 flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
        >
          <div className="w-9 h-9 bg-emerald-500/20 rounded-xl flex items-center justify-center">
            <ArrowDownLeft className="text-emerald-400 w-4 h-4" />
          </div>
          <span className="text-white text-xs font-medium">Receive</span>
        </button>
        <button
          onClick={startQrScan}
          className="glass rounded-2xl p-3 flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
        >
          <div className="w-9 h-9 bg-sky-500/20 rounded-xl flex items-center justify-center">
            <ScanLine className="text-sky-400 w-4 h-4" />
          </div>
          <span className="text-white text-xs font-medium">Scan QR</span>
        </button>
        <a
          href={isDemo ? '/yield?demo=true' : '/yield'}
          className="glass rounded-2xl p-3 flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
        >
          <div className="w-9 h-9 bg-blue-500/20 rounded-xl flex items-center justify-center">
            <TrendingUp className="text-blue-400 w-4 h-4" />
          </div>
          <span className="text-white text-xs font-medium">Yield</span>
        </a>
      </div>
      {qrScanError && (
        <p className="text-red-400 text-xs text-center mb-3">{qrScanError}</p>
      )}
      <div className="mb-3" />

      {/* Send Modal */}
      {showSend && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowSend(false)}>
          <div className="w-full max-w-sm bg-gray-900 rounded-t-3xl p-6 pb-10" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-5" />
            <h3 className="text-white text-lg font-bold mb-4">Send SOL</h3>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-gray-500 text-xs">Recipient address</label>
                  <button
                    type="button"
                    onClick={startQrScan}
                    className="flex items-center gap-1 text-violet-400 text-xs hover:text-violet-300 transition-colors"
                  >
                    <ScanLine className="w-3.5 h-3.5" />
                    Scan QR
                  </button>
                </div>
                <input
                  type="text"
                  value={sendTo}
                  onChange={(e) => setSendTo(e.target.value)}
                  placeholder="Enter Solana address or scan QR..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-violet-500/50 placeholder-gray-600"
                />
                {qrScanError && (
                  <p className="text-red-400 text-[10px] mt-1">{qrScanError}</p>
                )}
              </div>
              <div>
                <label className="text-gray-500 text-xs mb-1.5 block">Amount (SOL)</label>
                <input
                  type="number"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="any"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500/50 placeholder-gray-600"
                />
                <p className="text-gray-600 text-xs mt-1">Balance: {walletState.solBalance.toFixed(4)} SOL</p>
              </div>
              <a
                href={`phantom://ul/v1/transfer?token=SOL&amount=${parseFloat(sendAmount || '0') * 1e9}&to=${sendTo}&cluster=mainnet-beta`}
                onClick={() => { if (!sendTo || !sendAmount) return; setShowSend(false); }}
                className={clsx(
                  'flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white text-sm font-medium transition-colors',
                  sendTo && sendAmount ? 'bg-violet-600 hover:bg-violet-500' : 'bg-gray-700 cursor-not-allowed pointer-events-none'
                )}
              >
                <ArrowUpRight className="w-4 h-4" />
                Send via Phantom
              </a>
              <p className="text-gray-700 text-[10px] text-center">Opens Phantom wallet to confirm transaction</p>
            </div>
          </div>
        </div>
      )}

      {/* Token Holdings */}
      {walletState.tokens.length > 0 && (
        <div className="mb-4">
          <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-3">
            Token Holdings
          </h2>
          <div className="glass rounded-2xl overflow-hidden">
            {walletState.tokens.map((token, idx) => (
              <div
                key={token.mint}
                className={clsx(
                  'flex items-center justify-between px-4 py-3',
                  idx > 0 && 'border-t border-gray-800/50'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    'w-8 h-8 rounded-full flex items-center justify-center',
                    token.symbol === 'USDC' || token.symbol === 'USDT' ? 'bg-emerald-500/20' :
                    ['jitoSOL', 'mSOL', 'bSOL'].includes(token.symbol) ? 'bg-violet-500/20' :
                    token.symbol === 'SKR' ? 'bg-violet-500/20' :
                    'bg-gray-700'
                  )}>
                    <span className={clsx(
                      'text-xs font-medium',
                      token.symbol === 'USDC' || token.symbol === 'USDT' ? 'text-emerald-400' :
                      ['jitoSOL', 'mSOL', 'bSOL'].includes(token.symbol) ? 'text-violet-400' :
                      token.symbol === 'SKR' ? 'text-violet-400' :
                      'text-gray-300'
                    )}>
                      {token.symbol.slice(0, 3)}
                    </span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{token.symbol}</p>
                    <p className="text-gray-500 text-xs font-mono">{truncateAddress(token.mint)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white text-sm font-mono">
                    {token.uiAmount >= 1_000_000_000 ? `${(token.uiAmount / 1_000_000_000).toFixed(2)}B` :
                     token.uiAmount >= 1_000_000 ? `${(token.uiAmount / 1_000_000).toFixed(2)}M` :
                     token.uiAmount >= 1_000 ? `${(token.uiAmount / 1_000).toFixed(2)}K` :
                     token.uiAmount < 1 ? token.uiAmount.toFixed(4) :
                     token.uiAmount.toFixed(2)}
                  </p>
                  {(() => {
                    const usdVal = estimateTokenUsd(token.symbol, token.uiAmount, livePrices);
                    if (usdVal > 0) return <p className="text-gray-500 text-xs">≈ {formatUsd(usdVal)}</p>;
                    if (token.symbol === 'USDC' || token.symbol === 'USDT') return <p className="text-gray-500 text-xs">${token.uiAmount.toFixed(2)}</p>;
                    return null;
                  })()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Token Unlock Calendar — teaser */}
      <Link href={isDemo ? '/unlocks?demo=true' : '/unlocks'} className="block mb-3">
        <div className="glass rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/15 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">Token Unlocks</p>
              <p className="text-gray-400 text-xs">8 upcoming events · tap to explore</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
        </div>
      </Link>

      {/* NFT Gallery — teaser */}
      <Link href={isDemo ? '/nfts?demo=true' : '/nfts'} className="block mb-3">
        <div className="glass rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center flex-shrink-0">
              <ImageIcon className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">NFT Gallery</p>
              <p className="text-gray-400 text-xs">Your Solana collectibles · tap to browse</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
        </div>
      </Link>

      {/* Yield Opportunities — teaser */}
      <Link href={isDemo ? '/yield?demo=true' : '/yield'} className="block mb-3">
        <div className="glass rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">Yield Opportunities</p>
              <p className="text-gray-400 text-xs">Up to 28.4% APY · 5 protocols</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
        </div>
      </Link>

      {/* Agent Action Log */}
      <div className="mb-4">
        <ActionLogWidget />
      </div>

      {/* Recent Transactions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wider">
            Recent Activity
          </h2>
          <Link href="/history" className="text-violet-400 text-xs flex items-center gap-1 hover:text-violet-300">
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        {walletState.recentTransactions.length === 0 ? (
          <div className="glass rounded-2xl p-6 text-center">
            <p className="text-gray-500 text-sm">No recent transactions</p>
            <p className="text-gray-600 text-xs mt-1">Transactions will appear here after your first on-chain action</p>
          </div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            {walletState.recentTransactions.map((tx, idx) => (
              <div
                key={tx.signature}
                className={clsx(
                  'flex items-center justify-between px-4 py-3',
                  idx > 0 && 'border-t border-gray-800/50'
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={clsx(
                      'w-8 h-8 rounded-full flex items-center justify-center',
                      tx.status === 'success'
                        ? tx.type === 'send' ? 'bg-orange-500/20' :
                          tx.type === 'swap' ? 'bg-blue-500/20' :
                          'bg-emerald-500/20'
                        : 'bg-red-500/20'
                    )}
                  >
                    {tx.type === 'send' ? (
                      <ArrowUpRight className="w-4 h-4 text-orange-400" />
                    ) : tx.type === 'receive' ? (
                      <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                    ) : tx.type === 'swap' ? (
                      <ArrowRightLeft className="w-4 h-4 text-blue-400" />
                    ) : tx.status === 'error' ? (
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium capitalize">{tx.type}</p>
                    <p className="text-gray-500 text-xs">
                      {tx.blockTime ? timeAgo(tx.blockTime) : 'Unknown time'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {tx.amount != null && (
                    <div className="text-right">
                      <p className={clsx(
                        'text-sm font-mono font-medium',
                        tx.type === 'send' ? 'text-orange-400' :
                        tx.type === 'receive' ? 'text-emerald-400' :
                        'text-gray-300'
                      )}>
                        {tx.type === 'send' ? '-' : tx.type === 'receive' ? '+' : ''}
                        {tx.amount < 1 ? tx.amount.toFixed(4) : tx.amount.toLocaleString()} {tx.token ?? 'SOL'}
                      </p>
                    </div>
                  )}
                  <a
                    href={`https://solscan.io/tx/${tx.signature}${getSolscanCluster(NETWORK)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-gray-500 hover:text-gray-300 flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </PullToRefresh>
  );
}
