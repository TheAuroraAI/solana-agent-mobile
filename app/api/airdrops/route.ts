import { NextResponse } from 'next/server';

export type AirdropStatus = 'claimable' | 'upcoming' | 'claimed' | 'expired';
export type AirdropTier = 'major' | 'mid' | 'small';

export interface Airdrop {
  id: string;
  protocol: string;
  symbol: string;
  logo: string; // emoji
  status: AirdropStatus;
  tier: AirdropTier;
  estimatedValue: number | null; // USD
  estimatedTokens: number | null;
  eligibilityScore: number; // 0-100
  criteria: string[]; // e.g. ["Traded >$1K", "Held 30+ days"]
  claimDeadline: string | null; // ISO date
  snapshotDate: string | null;
  claimUrl: string | null;
  description: string;
  chain: 'Solana';
  twitterHandle: string;
}

export interface AirdropsData {
  walletAddress: string | null;
  totalEstimatedValue: number;
  claimableCount: number;
  upcomingCount: number;
  airdrops: Airdrop[];
  lastUpdated: string;
}

const MOCK_AIRDROPS: Airdrop[] = [
  {
    id: 'jup-s2',
    protocol: 'Jupiter',
    symbol: 'JUP',
    logo: '🪐',
    status: 'claimable',
    tier: 'major',
    estimatedValue: 1240,
    estimatedTokens: 3100,
    eligibilityScore: 92,
    criteria: ['Traded >$5K volume', 'Used limit orders', 'Active Nov–Jan'],
    claimDeadline: '2026-03-20T23:59:59Z',
    snapshotDate: '2026-01-31T00:00:00Z',
    claimUrl: 'https://jup.ag/airdrop',
    description: 'Jupiter Season 2 airdrop rewards loyal DeFi traders on Solana. JUP is the governance token for the Jupiter DAO.',
    chain: 'Solana',
    twitterHandle: '@JupiterExchange',
  },
  {
    id: 'kmno-1',
    protocol: 'Kamino Finance',
    symbol: 'KMNO',
    logo: '🌊',
    status: 'claimable',
    tier: 'major',
    estimatedValue: 680,
    estimatedTokens: 8500,
    eligibilityScore: 78,
    criteria: ['Supplied liquidity >30 days', 'TVL >$500', 'Borrowed at least once'],
    claimDeadline: '2026-03-15T23:59:59Z',
    snapshotDate: '2026-02-01T00:00:00Z',
    claimUrl: 'https://app.kamino.finance/airdrop',
    description: 'Kamino KMNO rewards early liquidity providers and borrowers in the Kamino lending protocol.',
    chain: 'Solana',
    twitterHandle: '@KaminoFinance',
  },
  {
    id: 'drift-2',
    protocol: 'Drift Protocol',
    symbol: 'DRIFT',
    logo: '🌀',
    status: 'upcoming',
    tier: 'major',
    estimatedValue: 520,
    estimatedTokens: 2600,
    eligibilityScore: 85,
    criteria: ['Perp volume >$10K', 'Deposited >$1K', 'Used cross-margin'],
    claimDeadline: null,
    snapshotDate: '2026-03-10T00:00:00Z',
    claimUrl: null,
    description: 'Drift Season 2 rewards active perps traders and liquidity depositors. Snapshot pending.',
    chain: 'Solana',
    twitterHandle: '@DriftProtocol',
  },
  {
    id: 'orca-wave2',
    protocol: 'Orca',
    symbol: 'ORCA',
    logo: '🐋',
    status: 'upcoming',
    tier: 'mid',
    estimatedValue: 310,
    estimatedTokens: 620,
    eligibilityScore: 67,
    criteria: ['Provided CLMM liquidity', 'Pool active >14 days', 'Fees earned >$10'],
    claimDeadline: null,
    snapshotDate: '2026-04-01T00:00:00Z',
    claimUrl: null,
    description: 'Orca Wave 2 distributes ORCA tokens to concentrated liquidity market makers on Whirlpools.',
    chain: 'Solana',
    twitterHandle: '@orca_so',
  },
  {
    id: 'zeta-1',
    protocol: 'Zeta Markets',
    symbol: 'ZEX',
    logo: '⚡',
    status: 'upcoming',
    tier: 'mid',
    estimatedValue: 185,
    estimatedTokens: 4625,
    eligibilityScore: 55,
    criteria: ['Options volume >$2K', 'Traded at least 5 contracts'],
    claimDeadline: null,
    snapshotDate: '2026-03-31T00:00:00Z',
    claimUrl: null,
    description: 'Zeta Markets ZEX genesis airdrop for early options and perps traders on the platform.',
    chain: 'Solana',
    twitterHandle: '@ZetaMarkets',
  },
  {
    id: 'pyth-s2',
    protocol: 'Pyth Network',
    symbol: 'PYTH',
    logo: '🔮',
    status: 'claimed',
    tier: 'major',
    estimatedValue: 2100,
    estimatedTokens: 10500,
    eligibilityScore: 100,
    criteria: ['Staked PYTH', 'Governance vote participant', 'Early oracle user'],
    claimDeadline: '2026-01-31T23:59:59Z',
    snapshotDate: '2025-12-01T00:00:00Z',
    claimUrl: null,
    description: 'Pyth Network Season 2 rewarded governance participants and stakers with PYTH tokens.',
    chain: 'Solana',
    twitterHandle: '@PythNetwork',
  },
  {
    id: 'marginfi-1',
    protocol: 'MarginFi',
    symbol: 'MRGN',
    logo: '🏦',
    status: 'claimed',
    tier: 'mid',
    estimatedValue: 430,
    estimatedTokens: 5375,
    eligibilityScore: 100,
    criteria: ['Borrowed >$500', 'Active user season 1', 'Deposited SOL/USDC'],
    claimDeadline: '2026-01-15T23:59:59Z',
    snapshotDate: '2025-11-15T00:00:00Z',
    claimUrl: null,
    description: 'MarginFi Season 1 rewarded early lenders and borrowers on the marginfi money market.',
    chain: 'Solana',
    twitterHandle: '@marginfi',
  },
  {
    id: 'tensor-s1',
    protocol: 'Tensor',
    symbol: 'TNSR',
    logo: '🖼️',
    status: 'expired',
    tier: 'small',
    estimatedValue: null,
    estimatedTokens: 1200,
    eligibilityScore: 38,
    criteria: ['NFT trading volume >$500', 'Used bid pools'],
    claimDeadline: '2025-12-31T23:59:59Z',
    snapshotDate: '2025-10-01T00:00:00Z',
    claimUrl: null,
    description: 'Tensor Season 1 airdrop for NFT traders. Claim window has closed. Unclaimed tokens returned to treasury.',
    chain: 'Solana',
    twitterHandle: '@tensor_hq',
  },
];

export async function GET() {
  const claimableAirdrops = MOCK_AIRDROPS.filter((a) => a.status === 'claimable');
  const upcomingAirdrops = MOCK_AIRDROPS.filter((a) => a.status === 'upcoming');

  const totalEstimatedValue = MOCK_AIRDROPS.reduce((sum, a) => {
    if (a.status === 'claimable' || a.status === 'upcoming') {
      return sum + (a.estimatedValue ?? 0);
    }
    return sum;
  }, 0);

  const data: AirdropsData = {
    walletAddress: null,
    totalEstimatedValue,
    claimableCount: claimableAirdrops.length,
    upcomingCount: upcomingAirdrops.length,
    airdrops: MOCK_AIRDROPS,
    lastUpdated: new Date().toISOString(),
  };

  return NextResponse.json(data);
}
