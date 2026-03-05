import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const revalidate = 60;

// ─── Exported Types ───────────────────────────────────────────────────────────

export interface Validator {
  id: string;
  name: string;
  logo: string;           // emoji
  voteAccount: string;    // truncated address like "ABCD...XYZ1"
  commission: number;     // 0-10 (percent)
  apy: number;            // e.g. 7.2 (percent)
  uptime: number;         // 99.0-100.0
  stake: string;          // "1.2M SOL"
  stakers: number;        // e.g. 45231
  skipRate: number;       // 0-5 (percent, lower is better)
  delinquent: boolean;
  featured: boolean;      // Jito/Marinade etc highlighted
  description: string;    // 1 sentence
  avsSupported: boolean;  // supports restaking
}

export interface ValidatorsData {
  validators: Validator[];
  totalStake: string;     // "388M SOL"
  avgApy: number;         // e.g. 6.8
  avgCommission: number;  // e.g. 5
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const VALIDATORS: Validator[] = [
  {
    id: 'jito',
    name: 'Jito',
    logo: '🔥',
    voteAccount: 'J1to...MEV1',
    commission: 8,
    apy: 7.8,
    uptime: 99.97,
    stake: '12.4M SOL',
    stakers: 87432,
    skipRate: 0.4,
    delinquent: false,
    featured: true,
    description: 'MEV-optimized validator with Jito-Solana client for maximum staker rewards.',
    avsSupported: true,
  },
  {
    id: 'marinade',
    name: 'Marinade (mSOL)',
    logo: '🫙',
    voteAccount: 'mSoL...5KzF',
    commission: 6,
    apy: 7.4,
    uptime: 99.95,
    stake: '9.8M SOL',
    stakers: 62341,
    skipRate: 0.6,
    delinquent: false,
    featured: true,
    description: 'Liquid staking protocol that distributes stake across top validators for diversified yield.',
    avsSupported: true,
  },
  {
    id: 'solana-foundation',
    name: 'Solana Foundation',
    logo: '◎',
    voteAccount: 'SFnd...8Qrx',
    commission: 10,
    apy: 6.9,
    uptime: 99.99,
    stake: '8.1M SOL',
    stakers: 45231,
    skipRate: 0.2,
    delinquent: false,
    featured: false,
    description: 'Official Solana Foundation delegation program supporting network decentralization.',
    avsSupported: false,
  },
  {
    id: 'everstake',
    name: 'Everstake',
    logo: '♾️',
    voteAccount: 'Ever...9Wnm',
    commission: 5,
    apy: 7.1,
    uptime: 99.93,
    stake: '6.7M SOL',
    stakers: 38109,
    skipRate: 0.9,
    delinquent: false,
    featured: false,
    description: 'Professional staking service operating across 35+ PoS networks with institutional-grade infrastructure.',
    avsSupported: true,
  },
  {
    id: 'chorus-one',
    name: 'Chorus One',
    logo: '🎵',
    voteAccount: 'CHO1...2pLk',
    commission: 8,
    apy: 7.0,
    uptime: 99.91,
    stake: '5.2M SOL',
    stakers: 29876,
    skipRate: 1.1,
    delinquent: false,
    featured: false,
    description: 'Enterprise-grade validator focused on security, transparency, and cross-chain restaking.',
    avsSupported: true,
  },
  {
    id: 'blazestake',
    name: 'BlazeStake',
    logo: '🔆',
    voteAccount: 'BLZ3...7hQp',
    commission: 0,
    apy: 7.2,
    uptime: 99.88,
    stake: '4.4M SOL',
    stakers: 24561,
    skipRate: 1.4,
    delinquent: false,
    featured: true,
    description: 'Zero-commission liquid staking with bSOL token and DeFi integrations across Solana.',
    avsSupported: false,
  },
  {
    id: 'figment',
    name: 'Figment',
    logo: '🔷',
    voteAccount: 'FIG1...4nVa',
    commission: 7,
    apy: 6.7,
    uptime: 99.85,
    stake: '3.9M SOL',
    stakers: 18234,
    skipRate: 1.8,
    delinquent: false,
    featured: false,
    description: 'Institutional staking provider with DataHub API access and compliance-grade reporting.',
    avsSupported: false,
  },
  {
    id: 'p2p',
    name: 'P2P.org',
    logo: '🔗',
    voteAccount: 'P2P0...6cXj',
    commission: 6,
    apy: 6.5,
    uptime: 97.20,
    stake: '2.1M SOL',
    stakers: 11087,
    skipRate: 4.2,
    delinquent: true,
    featured: false,
    description: 'Non-custodial staking service with automated monitoring and enterprise SLA guarantees.',
    avsSupported: false,
  },
];

// ─── GET Handler ──────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const totalStake = '388M SOL';
    const avgApy =
      Math.round(
        (VALIDATORS.reduce((sum, v) => sum + v.apy, 0) / VALIDATORS.length) * 10,
      ) / 10;
    const avgCommission =
      Math.round(
        VALIDATORS.reduce((sum, v) => sum + v.commission, 0) / VALIDATORS.length,
      );

    const data: ValidatorsData = {
      validators: VALIDATORS,
      totalStake,
      avgApy,
      avgCommission,
    };

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load validators data' },
      { status: 500 },
    );
  }
}
