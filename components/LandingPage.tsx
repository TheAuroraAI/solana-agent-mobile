'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Wallet, Zap, Shield, Brain, ChevronRight, PlayCircle, TrendingUp, BarChart2, ArrowLeftRight, Swords, Copy, Gift, Activity, Star } from 'lucide-react';
import { clsx } from 'clsx';

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Analysis',
    description: 'Claude AI analyzes your portfolio and proposes specific on-chain actions in real time.',
    color: 'text-violet-400',
    bg: 'bg-violet-400/10',
  },
  {
    icon: Zap,
    title: 'Autonomous Execution',
    description: 'Set goals in plain language. Aurora executes on-chain with your one-tap approval.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
  },
  {
    icon: Shield,
    title: 'Non-Custodial',
    description: 'Your keys stay in Phantom. Aurora proposes — you approve. Always.',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
  },
];

const highlights = [
  { icon: BarChart2, label: 'Portfolio Analytics' },
  { icon: ArrowLeftRight, label: 'Bridge Aggregator' },
  { icon: Swords, label: 'MEV Shield' },
  { icon: Copy, label: 'Copy Trading' },
  { icon: Gift, label: 'Airdrop Tracker' },
  { icon: Activity, label: 'Whale Watching' },
];

export function LandingPage() {
  const { connected, publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const router = useRouter();

  useEffect(() => {
    if (connected && publicKey) {
      router.push('/dashboard');
    }
  }, [connected, publicKey, router]);

  const [solPrice, setSolPrice] = useState<number | null>(null);

  useEffect(() => {
    fetch('https://api.dexscreener.com/tokens/v1/solana/So11111111111111111111111111111111111111112', { signal: AbortSignal.timeout(4000) })
      .then(r => r.json())
      .then((pairs: Array<{ baseToken?: { symbol?: string }; priceUsd?: string }>) => {
        const solPair = pairs.find((p) => p.baseToken?.symbol === 'SOL');
        const price = solPair?.priceUsd ? parseFloat(solPair.priceUsd) : 0;
        if (price > 0) setSolPrice(price);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col min-h-screen px-6 safe-top relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-[-50%] left-[-20%] w-[140%] h-[80%] bg-gradient-radial from-violet-900/30 via-transparent to-transparent rounded-full animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-30%] right-[-20%] w-[100%] h-[60%] bg-gradient-radial from-purple-900/20 via-transparent to-transparent rounded-full animate-[pulse_10s_ease-in-out_infinite_2s]" />
      </div>

      {/* Header */}
      <div className="pt-12 pb-6 text-center">
        {/* MONOLITH badge */}
        <div className="inline-flex items-center gap-1.5 mb-4 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20">
          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
          <span className="text-yellow-400 text-[10px] font-semibold tracking-wide uppercase">MONOLITH Hackathon 2026</span>
        </div>

        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-500/20 border border-violet-500/30 mb-4">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center">
            <span className="text-white text-lg font-bold">A</span>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
          Aurora Agent
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">
          Your autonomous AI wallet for Solana. 33+ features including SKR Guardian staking — built for Seeker.
        </p>
        {/* Live SOL price */}
        {solPrice != null && solPrice > 0 && isFinite(solPrice) && (
          <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-400 text-xs font-medium">SOL ${solPrice.toFixed(2)}</span>
            <span className="text-emerald-500/50 text-[10px]">LIVE</span>
          </div>
        )}
      </div>

      {/* Feature highlights grid */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {highlights.map(({ icon: Icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-900/60 border border-gray-800/50">
            <Icon className="w-4 h-4 text-violet-400" />
            <span className="text-gray-400 text-[10px] text-center leading-tight">{label}</span>
          </div>
        ))}
      </div>

      {/* Core features */}
      <div className="flex flex-col gap-3 mb-6">
        {features.map(({ icon: Icon, title, description, color, bg }) => (
          <div
            key={title}
            className="glass rounded-2xl p-4 flex items-start gap-4"
          >
            <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', bg)}>
              <Icon className={clsx('w-5 h-5', color)} />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm mb-1">{title}</h3>
              <p className="text-gray-400 text-xs leading-relaxed">{description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* SKR callout */}
      <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-violet-900/30 to-purple-900/20 border border-violet-500/20">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">📱</span>
          <span className="text-violet-300 font-semibold text-sm">Seeker-Native</span>
        </div>
        <p className="text-gray-400 text-xs leading-relaxed">
          SKR Guardian staking at ~20.2% APY · Seeker-verified dApp store · Optimised for Solana Mobile hardware
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-8">
        {[
          { value: '40+', label: 'Features' },
          { value: '36', label: 'API Routes' },
          { value: '0→∞', label: 'Revenue' },
        ].map(({ value, label }) => (
          <div key={label} className="text-center p-3 rounded-xl bg-gray-900/40 border border-gray-800/40">
            <div className="text-white font-bold text-lg">{value}</div>
            <div className="text-gray-500 text-[10px]">{label}</div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-auto pb-12">
        <button
          onClick={() => setVisible(true)}
          className="w-full bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-semibold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-colors shadow-lg shadow-violet-900/30"
        >
          <Wallet className="w-5 h-5" />
          Connect Phantom Wallet
          <ChevronRight className="w-4 h-4 ml-auto" />
        </button>
        <button
          onClick={() => router.push('/dashboard?demo=true')}
          className="w-full mt-3 bg-gray-800/60 hover:bg-gray-700/60 text-gray-300 font-medium py-3.5 px-6 rounded-2xl flex items-center justify-center gap-3 transition-colors border border-gray-700/50"
        >
          <PlayCircle className="w-4 h-4 text-violet-400" />
          Try Demo (no wallet needed)
        </button>
        <p className="text-center text-gray-500 text-xs mt-4">
          Non-custodial · Open Source · Solana
        </p>
        <div className="flex items-center justify-center gap-1.5 mt-3">
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center">
            <span className="text-white text-[8px] font-bold">A</span>
          </div>
          <span className="text-gray-600 text-[10px] tracking-wide">Built autonomously by Aurora AI</span>
        </div>
      </div>
    </div>
  );
}
