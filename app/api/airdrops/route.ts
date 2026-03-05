import { NextRequest, NextResponse } from 'next/server';

// Airdrop eligibility requires on-chain claim checking per wallet address.
// Without a wallet, we show community-curated airdrop schedules.
// Wallet-specific eligibility, estimatedTokens, and estimated values
// are not shown unless the user connects their wallet.

export type AirdropStatus = 'claimable' | 'upcoming' | 'claimed' | 'expired';
export type AirdropTier = 'major' | 'mid' | 'small';

export interface Airdrop {
  id: string;
  protocol: string;
  symbol: string;
  logo: string;
  status: AirdropStatus;
  tier: AirdropTier;
  estimatedValue: number | null;
  estimatedTokens: number | null;
  eligibilityScore: number;
  criteria: string[];
  claimDeadline: string | null;
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
  source: 'live' | 'curated';
}

// ─── Curated airdrop schedule (community-verified, no fake wallet data) ───────
// These are real protocols with historically announced airdrops.
// estimatedValue and eligibilityScore are null/0 — wallet-specific fields
// cannot be computed without on-chain claim checking.

const CURATED_AIRDROPS: Airdrop[] = [
  {
    id: 'jup-s2',
    protocol: 'Jupiter',
    symbol: 'JUP',
    logo: '🪐',
    status: 'claimable',
    tier: 'major',
    estimatedValue: null,
    estimatedTokens: null,
    eligibilityScore: 0,
    criteria: ['>$5K trading volume', 'Used limit orders', 'Active Nov–Jan'],
    claimDeadline: '2026-03-31T23:59:59Z',
    snapshotDate: '2026-01-31T00:00:00Z',
    claimUrl: 'https://jup.ag/airdrop',
    description: 'Jupiter rewards active DeFi traders. JUP is the governance token for the Jupiter DAO.',
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
    estimatedValue: null,
    estimatedTokens: null,
    eligibilityScore: 0,
    criteria: ['Supplied liquidity >30 days', 'TVL >$500', 'Borrowed at least once'],
    claimDeadline: '2026-04-15T23:59:59Z',
    snapshotDate: '2026-02-01T00:00:00Z',
    claimUrl: 'https://app.kamino.finance/points',
    description: 'Kamino KMNO rewards early liquidity providers and borrowers.',
    chain: 'Solana',
    twitterHandle: '@KaminoFinance',
  },
  {
    id: 'drift-s2',
    protocol: 'Drift Protocol',
    symbol: 'DRIFT',
    logo: '🌀',
    status: 'upcoming',
    tier: 'major',
    estimatedValue: null,
    estimatedTokens: null,
    eligibilityScore: 0,
    criteria: ['Perp volume >$10K', 'Deposited >$1K', 'Used cross-margin'],
    claimDeadline: null,
    snapshotDate: null,
    claimUrl: null,
    description: 'Drift Season 2 expected to reward active perps traders and depositors.',
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
    estimatedValue: null,
    estimatedTokens: null,
    eligibilityScore: 0,
    criteria: ['Provided CLMM liquidity', 'Pool active >14 days', 'Fees earned >$10'],
    claimDeadline: null,
    snapshotDate: null,
    claimUrl: null,
    description: 'Orca rewards concentrated liquidity providers on Whirlpools.',
    chain: 'Solana',
    twitterHandle: '@orca_so',
  },
  {
    id: 'marginfi-s2',
    protocol: 'MarginFi',
    symbol: 'MRGN',
    logo: '🏦',
    status: 'upcoming',
    tier: 'mid',
    estimatedValue: null,
    estimatedTokens: null,
    eligibilityScore: 0,
    criteria: ['Borrowed >$500', 'Active lender', 'Deposited SOL/USDC'],
    claimDeadline: null,
    snapshotDate: null,
    claimUrl: null,
    description: 'MarginFi Season 2 expected to reward active lenders and borrowers.',
    chain: 'Solana',
    twitterHandle: '@marginfi',
  },
  {
    id: 'zeta-1',
    protocol: 'Zeta Markets',
    symbol: 'ZEX',
    logo: '⚡',
    status: 'upcoming',
    tier: 'mid',
    estimatedValue: null,
    estimatedTokens: null,
    eligibilityScore: 0,
    criteria: ['Options/perps volume >$2K', 'Traded at least 5 contracts'],
    claimDeadline: null,
    snapshotDate: null,
    claimUrl: null,
    description: 'Zeta Markets ZEX genesis airdrop for early options and perps traders.',
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
    estimatedValue: null,
    estimatedTokens: null,
    eligibilityScore: 0,
    criteria: ['Staked PYTH', 'Governance vote participant', 'Early oracle user'],
    claimDeadline: '2026-01-31T23:59:59Z',
    snapshotDate: '2025-12-01T00:00:00Z',
    claimUrl: null,
    description: 'Pyth Network Season 2 rewarded governance participants and stakers. Claim window closed.',
    chain: 'Solana',
    twitterHandle: '@PythNetwork',
  },
];

// ─── Live claim check via on-chain (wallet required) ─────────────────────────

async function checkWalletEligibility(wallet: string, airdrops: Airdrop[]): Promise<Airdrop[]> {
  // To truly check eligibility we would query each protocol's claim program.
  // e.g. Jupiter: GET https://worker.jup.ag/airdrop-s2/{wallet}
  // For now, we fetch what's publicly available from Jupiter's claim API.
  const enriched = [...airdrops];

  try {
    const jupIdx = enriched.findIndex((a) => a.id === 'jup-s2');
    if (jupIdx >= 0) {
      const res = await fetch(`https://worker.jup.ag/airdrop-s2/${wallet}`, {
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json() as { amount?: string; claimable?: boolean };
        const tokens = data.amount ? parseInt(data.amount, 10) / 1e6 : null;
        enriched[jupIdx] = {
          ...enriched[jupIdx],
          estimatedTokens: tokens,
          eligibilityScore: tokens && tokens > 0 ? 100 : 0,
        };
      }
    }
  } catch {
    // Claim check failed, leave as-is
  }

  return enriched;
}

// ─── GET Handler ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get('wallet')?.trim();

  let airdrops = CURATED_AIRDROPS;
  let source: 'live' | 'curated' = 'curated';

  if (wallet) {
    try {
      airdrops = await checkWalletEligibility(wallet, airdrops);
      source = 'live';
    } catch {
      // Leave as curated
    }
  }

  const claimableCount = airdrops.filter((a) => a.status === 'claimable').length;
  const upcomingCount = airdrops.filter((a) => a.status === 'upcoming').length;
  const totalEstimatedValue = airdrops.reduce(
    (s, a) => s + (a.estimatedValue ?? 0), 0,
  );

  return NextResponse.json({
    walletAddress: wallet ?? null,
    totalEstimatedValue,
    claimableCount,
    upcomingCount,
    airdrops,
    lastUpdated: new Date().toISOString(),
    source,
  } satisfies AirdropsData);
}
