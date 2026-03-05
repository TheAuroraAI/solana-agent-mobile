'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Copy, Check, Share2, ClipboardPaste,
  Clock, TrendingUp, TrendingDown, ShieldCheck,
  ShieldAlert, Zap, Brain, RefreshCw,
  Wallet, Coins, LayoutGrid, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { InspectData, WalletToken, WalletActivity, WalletLabel } from '@/app/api/inspect/route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SAMPLE_WHALE = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
const RECENT_KEY = 'inspect_recent';
const MAX_RECENT = 3;

function fmt$(n: number, compact = false): string {
  if (compact) {
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
    return `$${n.toFixed(0)}`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtNum(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(n < 1 ? 6 : 2);
}

function pnlColor(n: number) {
  return n >= 0 ? 'text-emerald-400' : 'text-red-400';
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function getRecentInspections(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveRecentInspection(addr: string): void {
  if (typeof window === 'undefined') return;
  const existing = getRecentInspections().filter((a) => a !== addr);
  const updated = [addr, ...existing].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}

function labelColors(type: WalletLabel['type']): { bg: string; text: string; border: string } {
  switch (type) {
    case 'whale':       return { bg: 'bg-blue-500/15',   text: 'text-blue-300',   border: 'border-blue-500/30' };
    case 'bot':         return { bg: 'bg-orange-500/15', text: 'text-orange-300', border: 'border-orange-500/30' };
    case 'defi_user':   return { bg: 'bg-violet-500/15', text: 'text-violet-300', border: 'border-violet-500/30' };
    case 'nft_collector': return { bg: 'bg-pink-500/15', text: 'text-pink-300',   border: 'border-pink-500/30' };
    case 'trader':      return { bg: 'bg-amber-500/15',  text: 'text-amber-300',  border: 'border-amber-500/30' };
    case 'founder':     return { bg: 'bg-emerald-500/15',text: 'text-emerald-300',border: 'border-emerald-500/30' };
  }
}

function labelEmoji(type: WalletLabel['type']): string {
  switch (type) {
    case 'whale':        return '🐋';
    case 'bot':          return '🤖';
    case 'defi_user':    return '⚡';
    case 'nft_collector':return '🖼';
    case 'trader':       return '📈';
    case 'founder':      return '🏗';
  }
}

function riskBadge(score: number): { label: string; color: string; bg: string; icon: React.ReactNode } {
  if (score <= 25) return { label: 'Low Risk', color: 'text-emerald-400', bg: 'bg-emerald-500/15', icon: <ShieldCheck className="w-3.5 h-3.5" /> };
  if (score <= 55) return { label: 'Medium Risk', color: 'text-amber-400', bg: 'bg-amber-500/15', icon: <ShieldCheck className="w-3.5 h-3.5" /> };
  return { label: 'High Risk', color: 'text-red-400', bg: 'bg-red-500/15', icon: <ShieldAlert className="w-3.5 h-3.5" /> };
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skel({ className }: { className?: string }) {
  return <div className={clsx('bg-gray-800/60 animate-pulse rounded-xl', className)} />;
}

function InspectSkeleton() {
  return (
    <div className="px-4 pt-4 space-y-4">
      <Skel className="h-20 rounded-2xl" />
      <div className="flex gap-2">
        <Skel className="h-6 w-20 rounded-full" />
        <Skel className="h-6 w-28 rounded-full" />
        <Skel className="h-6 w-16 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3, 4, 5].map((i) => <Skel key={i} className="h-16" />)}
      </div>
      <Skel className="h-24 rounded-2xl" />
      <Skel className="h-48 rounded-2xl" />
      <Skel className="h-64 rounded-2xl" />
    </div>
  );
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handle}
      className={clsx('transition-colors', className)}
      aria-label="Copy address"
    >
      {copied
        ? <Check className="w-4 h-4 text-emerald-400" />
        : <Copy className="w-4 h-4 text-gray-400 hover:text-white" />
      }
    </button>
  );
}

// ─── Identity card ────────────────────────────────────────────────────────────

function IdentityCard({ data }: { data: InspectData }) {
  const risk = riskBadge(data.riskScore);

  const handleShare = async () => {
    const text = `Wallet ${data.shortAddress} — $${(data.totalValueUsd / 1_000_000).toFixed(2)}M portfolio | MONOLITH Inspector`;
    if (navigator.share) {
      await navigator.share({ title: 'MONOLITH Wallet Inspector', text }).catch(() => null);
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  return (
    <div className="bg-gray-900 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-white font-mono font-semibold text-sm truncate">
              {data.address.slice(0, 12)}…{data.address.slice(-8)}
            </p>
            <CopyButton text={data.address} />
          </div>
          <p className="text-gray-500 text-xs mt-0.5">
            First tx {data.firstTx} · Last active {data.lastTx}
          </p>
        </div>
        <button
          onClick={handleShare}
          className="shrink-0 w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          aria-label="Share wallet"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      {/* Labels + Risk */}
      <div className="flex flex-wrap gap-2 mt-3">
        {data.labels.map((lbl) => {
          const c = labelColors(lbl.type);
          return (
            <span
              key={lbl.type}
              className={clsx(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold',
                c.bg, c.text, c.border,
              )}
            >
              {labelEmoji(lbl.type)} {lbl.label}
              <span className="opacity-60">{lbl.confidence}%</span>
            </span>
          );
        })}
        <span className={clsx(
          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold',
          risk.bg, risk.color,
        )}>
          {risk.icon}
          {risk.label} {data.riskScore}/100
        </span>
      </div>
    </div>
  );
}

// ─── Stats grid ───────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-gray-900 rounded-xl p-3 flex flex-col gap-1.5">
      <div className={clsx('w-6 h-6 rounded-lg flex items-center justify-center', color)}>
        {icon}
      </div>
      <p className="text-white text-sm font-bold font-mono leading-tight">{value}</p>
      <p className="text-gray-500 text-[10px] font-medium">{label}</p>
    </div>
  );
}

function StatsGrid({ data }: { data: InspectData }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <StatCard
        label="Total Value"
        value={fmt$(data.totalValueUsd, true)}
        icon={<Wallet className="w-3.5 h-3.5 text-violet-400" />}
        color="bg-violet-500/15"
      />
      <StatCard
        label="SOL Balance"
        value={`◎ ${fmtNum(data.solBalance)}`}
        icon={<Coins className="w-3.5 h-3.5 text-amber-400" />}
        color="bg-amber-500/15"
      />
      <StatCard
        label="Tokens"
        value={data.tokenCount.toString()}
        icon={<LayoutGrid className="w-3.5 h-3.5 text-blue-400" />}
        color="bg-blue-500/15"
      />
      <StatCard
        label="NFTs"
        value={data.nftCount.toString()}
        icon={<span className="text-pink-400 text-sm">🖼</span>}
        color="bg-pink-500/15"
      />
      <StatCard
        label="Total TXs"
        value={data.txCount.toLocaleString()}
        icon={<Zap className="w-3.5 h-3.5 text-emerald-400" />}
        color="bg-emerald-500/15"
      />
      <StatCard
        label="Last Active"
        value={data.lastTx.replace(', 2026', '')}
        icon={<Clock className="w-3.5 h-3.5 text-gray-400" />}
        color="bg-gray-700/50"
      />
    </div>
  );
}

// ─── P&L summary ──────────────────────────────────────────────────────────────

function PnlSummary({ data }: { data: InspectData }) {
  const isUp = data.pnl30d >= 0;
  return (
    <div className="bg-gray-900 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">30-Day P&amp;L</p>
        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/20">
          AI Estimate
        </span>
      </div>
      <div className="flex items-center gap-3 mb-3">
        <div className={clsx(
          'flex-1 rounded-xl p-3 text-center',
          isUp ? 'bg-emerald-500/10' : 'bg-red-500/10',
        )}>
          <div className={clsx('flex items-center justify-center gap-1 mb-1', pnlColor(data.pnl30d))}>
            {isUp
              ? <ArrowUpRight className="w-4 h-4" />
              : <ArrowDownRight className="w-4 h-4" />
            }
            <span className="text-lg font-bold font-mono">
              {isUp ? '+' : ''}{fmt$(data.pnl30d, true)}
            </span>
          </div>
          <p className="text-gray-500 text-xs">Net P&amp;L</p>
        </div>
        <div className="bg-gray-800/60 rounded-xl p-3 text-center flex-1">
          <p className="text-white text-lg font-bold font-mono mb-1">{data.winRate}%</p>
          <p className="text-gray-500 text-xs">Win Rate</p>
        </div>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5">
          <div className="flex items-center gap-1 mb-0.5">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span className="text-gray-400 text-[10px]">Best</span>
          </div>
          <p className="text-white text-xs font-semibold">{data.topPnlToken.symbol}</p>
          <p className="text-emerald-400 text-xs font-mono font-bold">
            +{fmt$(data.topPnlToken.pnl, true)}
          </p>
        </div>
        <div className="flex-1 bg-red-500/10 border border-red-500/20 rounded-xl p-2.5">
          <div className="flex items-center gap-1 mb-0.5">
            <TrendingDown className="w-3 h-3 text-red-400" />
            <span className="text-gray-400 text-[10px]">Worst</span>
          </div>
          <p className="text-white text-xs font-semibold">{data.worstPnlToken.symbol}</p>
          <p className="text-red-400 text-xs font-mono font-bold">
            {fmt$(data.worstPnlToken.pnl, true)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Token holdings ───────────────────────────────────────────────────────────

function TokenRow({ token }: { token: WalletToken }) {
  const isUp = token.change24h >= 0;
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-800/50 last:border-0">
      <div className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center text-base shrink-0">
        {token.logo}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-white text-sm font-semibold">{token.symbol}</p>
          <p className="text-white text-sm font-mono font-semibold">{fmt$(token.valueUsd, true)}</p>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-gray-500 text-xs">{fmtNum(token.balance)}</p>
          <p className={clsx('text-xs font-semibold', isUp ? 'text-emerald-400' : 'text-red-400')}>
            {isUp ? '+' : ''}{token.change24h.toFixed(2)}%
          </p>
        </div>
        {/* Allocation bar */}
        <div className="mt-1.5 h-1 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-violet-500/70 transition-all duration-700"
            style={{ width: `${Math.min(100, token.allocation)}%` }}
          />
        </div>
        <p className="text-gray-600 text-[9px] mt-0.5">{token.allocation.toFixed(1)}% of portfolio</p>
      </div>
    </div>
  );
}

function TokenHoldings({ tokens }: { tokens: WalletToken[] }) {
  return (
    <div className="bg-gray-900 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Top Holdings</p>
        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/20">
          AI Estimate
        </span>
      </div>
      {tokens.slice(0, 6).map((t) => (
        <TokenRow key={t.symbol} token={t} />
      ))}
    </div>
  );
}

// ─── Activity bar chart (SVG) ─────────────────────────────────────────────────

const BAR_W = 340;
const BAR_H = 120;
const BAR_PAD_L = 36;
const BAR_PAD_R = 8;
const BAR_PAD_T = 12;
const BAR_PAD_B = 28;
const BAR_INNER_W = BAR_W - BAR_PAD_L - BAR_PAD_R;
const BAR_INNER_H = BAR_H - BAR_PAD_T - BAR_PAD_B;

function ActivityChart({ history }: { history: WalletActivity[] }) {
  const [hovIdx, setHovIdx] = useState<number | null>(null);

  const maxTx = Math.max(...history.map((h) => h.txCount), 1);
  const barWidth = BAR_INNER_W / history.length;
  const barPad = Math.max(1, barWidth * 0.18);

  // Y-axis labels: 0, mid, max
  const yLabels = [
    { v: 0,        y: BAR_PAD_T + BAR_INNER_H },
    { v: Math.round(maxTx / 2), y: BAR_PAD_T + BAR_INNER_H / 2 },
    { v: maxTx,    y: BAR_PAD_T },
  ];

  // X-axis labels: every ~7th day
  const xStep = Math.max(1, Math.floor(history.length / 5));

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * BAR_W - BAR_PAD_L;
    const idx = Math.floor(relX / barWidth);
    if (idx >= 0 && idx < history.length) setHovIdx(idx);
    else setHovIdx(null);
  };

  return (
    <div className="bg-gray-900 rounded-2xl p-4">
      <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-3">
        30-Day Activity
      </p>
      <svg
        viewBox={`0 0 ${BAR_W} ${BAR_H}`}
        className="w-full"
        style={{ height: BAR_H }}
        onMouseMove={handleMove}
        onMouseLeave={() => setHovIdx(null)}
      >
        {/* Grid lines */}
        {yLabels.map(({ v, y }) => (
          <g key={v}>
            <line
              x1={BAR_PAD_L} y1={y.toFixed(1)}
              x2={BAR_W - BAR_PAD_R} y2={y.toFixed(1)}
              stroke="rgba(255,255,255,0.05)" strokeWidth="1"
            />
            <text
              x={BAR_PAD_L - 4} y={y + 3}
              textAnchor="end" fontSize="8" fill="rgba(156,163,175,0.6)"
            >
              {v}
            </text>
          </g>
        ))}

        {/* Bars */}
        {history.map((h, i) => {
          const barH = (h.txCount / maxTx) * BAR_INNER_H;
          const x = BAR_PAD_L + i * barWidth + barPad;
          const y = BAR_PAD_T + BAR_INNER_H - barH;
          const w = barWidth - barPad * 2;
          const isHov = hovIdx === i;
          return (
            <rect
              key={i}
              x={x.toFixed(1)} y={y.toFixed(1)}
              width={Math.max(1, w).toFixed(1)} height={barH.toFixed(1)}
              rx="2" ry="2"
              fill={isHov ? '#8b5cf6' : 'rgba(139,92,246,0.4)'}
              className="transition-all duration-100"
            />
          );
        })}

        {/* X-axis labels */}
        {history.map((h, i) => {
          if (i % xStep !== 0 && i !== history.length - 1) return null;
          const x = BAR_PAD_L + i * barWidth + barWidth / 2;
          return (
            <text
              key={i}
              x={x.toFixed(1)} y={BAR_H - 6}
              textAnchor="middle" fontSize="8" fill="rgba(156,163,175,0.6)"
            >
              {h.date}
            </text>
          );
        })}
      </svg>

      {/* Hover tooltip */}
      {hovIdx !== null && (
        <div className="mt-2 bg-gray-800 rounded-xl px-3 py-2 text-xs flex items-center justify-between">
          <span className="text-gray-400">{history[hovIdx].date}</span>
          <span className="text-white font-semibold">{history[hovIdx].txCount} txs</span>
          <span className="text-gray-400">{fmt$(history[hovIdx].volumeUsd, true)} vol</span>
        </div>
      )}
    </div>
  );
}

// ─── DeFi protocols ───────────────────────────────────────────────────────────

function DefiProtocols({ protocols }: { protocols: InspectData['defiInteractions'] }) {
  return (
    <div className="bg-gray-900 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">DeFi Protocols</p>
        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/20">
          AI Estimate
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {protocols.map((p) => (
          <div
            key={p.protocol}
            className="shrink-0 bg-gray-800/70 rounded-xl px-3 py-2.5 flex flex-col items-center gap-1 min-w-[72px]"
          >
            <span className="text-xl">{p.logo}</span>
            <p className="text-white text-xs font-semibold whitespace-nowrap">{p.protocol}</p>
            <p className="text-violet-400 text-[10px] font-mono">{p.txCount} txs</p>
            <p className="text-gray-500 text-[9px]">{p.lastUsed}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── AI Analysis ──────────────────────────────────────────────────────────────

function buildAnalysis(data: InspectData): string {
  const topToken = data.topTokens[0]?.symbol ?? 'SOL';
  const val = fmt$(data.totalValueUsd, true);
  const pnl = fmt$(Math.abs(data.pnl30d), true);
  const pnlDir = data.pnl30d >= 0 ? 'gained' : 'lost';
  const topProtocol = data.defiInteractions[0]?.protocol ?? 'Jupiter';
  const secondProtocol = data.defiInteractions[1]?.protocol ?? 'Kamino';

  return (
    `This wallet holds a ${val} portfolio with a clear concentration in ${topToken}, suggesting ` +
    `high conviction in Solana ecosystem tokens. The DeFi footprint is extensive — ` +
    `${data.txCount.toLocaleString()} total transactions with heavy usage of ${topProtocol} ` +
    `and ${secondProtocol} indicate a yield-optimizing strategy rather than pure speculation. ` +
    `A ${data.winRate}% win rate over 30 days, combined with a net ${pnlDir} of ${pnl}, ` +
    `is consistent with a disciplined swing trader who times entries around liquidity events. ` +
    `The low risk score (${data.riskScore}/100) and stablecoin allocation suggest this wallet ` +
    `maintains dry powder for opportunistic buys during market dips.`
  );
}

function AiAnalysis({ data }: { data: InspectData }) {
  return (
    <div className="bg-violet-950/40 border border-violet-500/20 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-violet-500/20 flex items-center justify-center">
          <Brain className="w-3.5 h-3.5 text-violet-400" />
        </div>
        <p className="text-violet-300 text-sm font-semibold">Aurora&apos;s Analysis</p>
      </div>
      <p className="text-gray-300 text-xs leading-relaxed">{buildAnalysis(data)}</p>
    </div>
  );
}

// ─── Search bar ───────────────────────────────────────────────────────────────

interface SearchBarProps {
  onInspect: (addr: string) => void;
  loading: boolean;
}

function SearchBar({ onInspect, loading }: SearchBarProps) {
  const [input, setInput] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRecent(getRecentInspections());
  }, []);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInput(text.trim());
      inputRef.current?.focus();
    } catch {
      // Clipboard not available
    }
  };

  const handleSubmit = (addr?: string) => {
    const target = (addr ?? input).trim();
    if (!target) return;
    onInspect(target);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="space-y-3">
      {/* Input row */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste any Solana wallet address…"
            className={clsx(
              'w-full bg-gray-800/80 border border-gray-700/60 rounded-xl',
              'pl-9 pr-3 py-3 text-sm text-white placeholder-gray-500',
              'focus:outline-none focus:border-violet-500/60 transition-colors',
            )}
          />
        </div>
        <button
          onClick={handlePaste}
          className="px-3 py-3 bg-gray-800 border border-gray-700/60 rounded-xl text-gray-400 hover:text-white transition-colors flex items-center gap-1.5"
          aria-label="Paste from clipboard"
        >
          <ClipboardPaste className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleSubmit()}
          disabled={loading || !input.trim()}
          className={clsx(
            'px-4 py-3 rounded-xl text-sm font-semibold transition-all',
            'bg-violet-600 hover:bg-violet-500 text-white',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            loading && 'cursor-wait',
          )}
        >
          {loading
            ? <RefreshCw className="w-4 h-4 animate-spin" />
            : 'Inspect'
          }
        </button>
      </div>

      {/* Recent inspections */}
      {recent.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-gray-500 text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" /> Recent:
          </span>
          {recent.map((addr) => (
            <button
              key={addr}
              onClick={() => handleSubmit(addr)}
              className="text-xs px-2.5 py-1 bg-gray-800/70 hover:bg-gray-700/70 rounded-lg text-gray-300 font-mono transition-colors"
            >
              {shortAddr(addr)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function InspectView() {
  const [data, setData] = useState<InspectData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inspect = useCallback(async (addr: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/inspect?wallet=${encodeURIComponent(addr)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const json = (await res.json()) as InspectData;
      setData(json);
      saveRecentInspection(addr);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load sample whale on mount
  useEffect(() => {
    inspect(SAMPLE_WHALE);
  }, [inspect]);

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="safe-top px-4 pt-6 pb-4">
        <h1 className="text-white text-xl font-bold">Wallet Inspector</h1>
        <p className="text-gray-400 text-xs mt-1">
          Deep-dive analytics on any Solana address
        </p>
        {data && (
          <div className="flex items-center gap-1.5 mt-2">
            <div className={`w-1.5 h-1.5 rounded-full ${data.dataSource === 'live' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span className="text-xs text-gray-400">
              {data.dataSource === 'live' ? 'Live on-chain data' : 'Estimated data'}
            </span>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="px-4 mb-5">
        <SearchBar onInspect={inspect} loading={loading} />
      </div>

      {/* Loading skeleton */}
      {loading && !data && <InspectSkeleton />}

      {/* Spinner overlay while refreshing */}
      {loading && data && (
        <div className="px-4 mb-3">
          <div className="flex items-center gap-2 text-violet-400 text-xs">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Loading wallet data…
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-4 mb-4 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Content */}
      {data && !loading && (
        <div className="px-4 pb-8 space-y-4">
          <IdentityCard data={data} />
          <StatsGrid data={data} />
          <PnlSummary data={data} />
          <TokenHoldings tokens={data.topTokens} />
          <ActivityChart history={data.activityHistory} />
          <DefiProtocols protocols={data.defiInteractions} />
          <AiAnalysis data={data} />
        </div>
      )}
    </div>
  );
}
