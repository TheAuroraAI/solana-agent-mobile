import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const revalidate = 60;

// ─── Exported Types ───────────────────────────────────────────────────────────

export type LaunchStatus = 'upcoming' | 'live' | 'ended';
export type LaunchType = 'IDO' | 'Fair Launch' | 'LBP' | 'Stealth' | 'NFT Mint';

export interface TokenLaunch {
  id: string;
  name: string;
  symbol: string;
  logo: string;           // emoji
  launchType: LaunchType;
  status: LaunchStatus;
  platform: string;       // "Pump.fun", "Meteora", "Raydium", "Jupiter"
  date: string;           // "Mar 7, 2026"
  time: string;           // "18:00 UTC"
  price: string;          // "$0.002" or "TBD"
  raise: string;          // "$500K" or "Fair"
  description: string;    // 1 sentence
  tags: string[];         // ["DeFi", "Gaming", "AI"]
  participants?: number;  // registered interest
  allocation?: string;    // "$500 max"
  watchlisted: boolean;
}

export interface LaunchesData {
  launches: TokenLaunch[];
  liveCount: number;
  upcomingCount: number;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const LAUNCHES: TokenLaunch[] = [
  {
    id: 'nova-defi',
    name: 'Nova Finance',
    symbol: 'NOVA',
    logo: '⭐',
    launchType: 'IDO',
    status: 'live',
    platform: 'Jupiter',
    date: 'Mar 5, 2026',
    time: '14:00 UTC',
    price: '$0.018',
    raise: '$1.2M',
    description: 'Decentralized margin trading protocol with automated risk management on Solana.',
    tags: ['DeFi', 'Margin', 'Perps'],
    participants: 3841,
    allocation: '$2,000 max',
    watchlisted: true,
  },
  {
    id: 'pixel-punks',
    name: 'Pixel Punks 3D',
    symbol: 'PP3D',
    logo: '🎮',
    launchType: 'NFT Mint',
    status: 'live',
    platform: 'Pump.fun',
    date: 'Mar 5, 2026',
    time: '16:30 UTC',
    price: '0.5 SOL',
    raise: 'Fair',
    description: 'Fully on-chain generative 3D pixel art NFT collection with play-to-earn mechanics.',
    tags: ['NFT', 'Gaming', 'P2E'],
    participants: 12407,
    allocation: '5 max',
    watchlisted: false,
  },
  {
    id: 'solstream',
    name: 'SolStream',
    symbol: 'STREAM',
    logo: '📡',
    launchType: 'LBP',
    status: 'upcoming',
    platform: 'Meteora',
    date: 'Mar 7, 2026',
    time: '18:00 UTC',
    price: 'TBD',
    raise: '$800K',
    description: 'Real-time payment streaming protocol enabling per-second salary and subscription flows.',
    tags: ['DeFi', 'Payments', 'Infrastructure'],
    participants: 2156,
    allocation: '$1,500 max',
    watchlisted: true,
  },
  {
    id: 'aurora-ai-agent',
    name: 'AuraAgent',
    symbol: 'AURA',
    logo: '🤖',
    launchType: 'Fair Launch',
    status: 'upcoming',
    platform: 'Pump.fun',
    date: 'Mar 8, 2026',
    time: '12:00 UTC',
    price: '$0.0001',
    raise: 'Fair',
    description: 'Autonomous AI trading agents that learn from on-chain data and execute strategies.',
    tags: ['AI', 'DeFi', 'Agents'],
    participants: 8923,
    watchlisted: false,
  },
  {
    id: 'vault-protocol',
    name: 'VaultX Protocol',
    symbol: 'VLT',
    logo: '🔐',
    launchType: 'IDO',
    status: 'upcoming',
    platform: 'Raydium',
    date: 'Mar 10, 2026',
    time: '20:00 UTC',
    price: '$0.045',
    raise: '$2.5M',
    description: 'Multi-asset yield vault protocol with auto-compounding strategies across Solana DeFi.',
    tags: ['DeFi', 'Yield', 'Vaults'],
    participants: 5312,
    allocation: '$5,000 max',
    watchlisted: true,
  },
  {
    id: 'memewar',
    name: 'MemeWar DAO',
    symbol: 'MWAR',
    logo: '⚔️',
    launchType: 'Stealth',
    status: 'upcoming',
    platform: 'Pump.fun',
    date: 'Mar 12, 2026',
    time: '00:00 UTC',
    price: 'TBD',
    raise: 'Fair',
    description: 'Community-governed meme token launchpad where holders vote on which coins go to war.',
    tags: ['Meme', 'DAO', 'Community'],
    participants: 31450,
    watchlisted: false,
  },
  {
    id: 'solarpay',
    name: 'SolarPay',
    symbol: 'SLRP',
    logo: '☀️',
    launchType: 'IDO',
    status: 'ended',
    platform: 'Jupiter',
    date: 'Mar 1, 2026',
    time: '15:00 UTC',
    price: '$0.012',
    raise: '$600K',
    description: 'Mobile-first Solana payment app targeting emerging markets with stablecoin rails.',
    tags: ['Payments', 'Mobile', 'Stablecoin'],
    participants: 7234,
    allocation: '$1,000 max',
    watchlisted: false,
  },
  {
    id: 'chronos-nft',
    name: 'Chronos Realms',
    symbol: 'CHRN',
    logo: '⏳',
    launchType: 'NFT Mint',
    status: 'ended',
    platform: 'Meteora',
    date: 'Mar 3, 2026',
    time: '17:00 UTC',
    price: '1.2 SOL',
    raise: 'Fair',
    description: 'Time-locked NFT collection where artwork evolves on-chain based on real-world timestamps.',
    tags: ['NFT', 'Art', 'On-chain'],
    participants: 4891,
    allocation: '3 max',
    watchlisted: false,
  },
];

// ─── GET Handler ──────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const launches = LAUNCHES;
    const liveCount = launches.filter((l) => l.status === 'live').length;
    const upcomingCount = launches.filter((l) => l.status === 'upcoming').length;

    const data: LaunchesData = { launches, liveCount, upcomingCount };
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load launches' },
      { status: 500 },
    );
  }
}
