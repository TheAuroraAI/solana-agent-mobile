import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const revalidate = 120; // Cache 2 min

// ─── Exported Types ───────────────────────────────────────────────────────────

export interface Validator {
  id: string;
  name: string;
  logo: string;
  voteAccount: string;
  commission: number;
  apy: number;
  uptime: number;
  stake: string;
  stakers: number;
  skipRate: number;
  delinquent: boolean;
  featured: boolean;
  description: string;
  avsSupported: boolean;
}

export interface ValidatorsData {
  validators: Validator[];
  totalStake: string;
  avgApy: number;
  avgCommission: number;
  source: 'live' | 'estimated';
  lastUpdated: string;
}

// ─── Known validator metadata (by vote account pubkey) ───────────────────────

const KNOWN_VALIDATORS: Record<string, {
  id: string; name: string; logo: string; description: string;
  featured: boolean; avsSupported: boolean;
}> = {
  'J1to1yT8SqBqKnASqFH3WGaBvHVDtMnr2VkFCChL7ky': {
    id: 'jito', name: 'Jito', logo: '🔥', featured: true, avsSupported: true,
    description: 'MEV-optimized validator with Jito-Solana client for maximum staker rewards.',
  },
  'CW9C7HBwAMgqNdXkNgFg9Ujr3edR2Ab9ymEuQnVacd1P': {
    id: 'jito', name: 'Jito', logo: '🔥', featured: true, avsSupported: true,
    description: 'MEV-optimized validator with Jito-Solana client for maximum staker rewards.',
  },
  'stk9ApL5HeVAwPLr3TLhDXdZS8ptVu7zp6ov84HpThj': {
    id: 'marinade', name: 'Marinade (mSOL)', logo: '🫙', featured: true, avsSupported: true,
    description: 'Liquid staking protocol distributing stake across top validators for diversified yield.',
  },
  'EverSFw9uN5t1V8kS3ficHUcKffSjwpGzUSGd7mgmSks': {
    id: 'everstake', name: 'Everstake', logo: '♾️', featured: false, avsSupported: true,
    description: 'Professional staking service operating across 35+ PoS networks.',
  },
  'BLZEd1BZgE5SeJPATVaJr8QHDC3RrXxFNW5u3gDQiXo': {
    id: 'blazestake', name: 'BlazeStake', logo: '🔆', featured: true, avsSupported: false,
    description: 'Zero-commission liquid staking with bSOL token and DeFi integrations.',
  },
  'GE6atKoWiQ2pt3zL7N13pjNHjdLVys8LinG8qeJLcAiL': {
    id: 'chorus-one', name: 'Chorus One', logo: '🎵', featured: false, avsSupported: true,
    description: 'Enterprise-grade validator focused on security and cross-chain restaking.',
  },
  'figm6Rz6RWjHBqmSdHUpVeN9f3fWFf5U65aTGNpBK7i': {
    id: 'figment', name: 'Figment', logo: '🔷', featured: false, avsSupported: false,
    description: 'Institutional staking provider with DataHub API and compliance reporting.',
  },
};

const SOL_INFLATION_RATE = 0.054; // ~5.4% current Solana inflation

function stakeToStr(lamports: number): string {
  const sol = lamports / 1e9;
  if (sol >= 1e6) return `${(sol / 1e6).toFixed(1)}M SOL`;
  if (sol >= 1e3) return `${(sol / 1e3).toFixed(0)}K SOL`;
  return `${sol.toFixed(0)} SOL`;
}

function calcApy(commission: number, totalActivatedStake: number, validatorStake: number): number {
  // APY = inflation_rate * (1 - commission/100) * stakeWeightBonus
  // Larger validators get slightly different yield due to block production
  const commissionFactor = 1 - commission / 100;
  const baseApy = SOL_INFLATION_RATE * commissionFactor * 100; // as percentage
  return Math.round(baseApy * 10) / 10;
}

// ─── Live Data Fetch ──────────────────────────────────────────────────────────

interface RpcVoteAccount {
  votePubkey: string;
  nodePubkey: string;
  activatedStake: number;
  epochVoteAccount: boolean;
  commission: number;
  lastVote: number;
  epochCredits: [number, number, number][];
  rootSlot: number;
}

async function fetchValidators(): Promise<{ validators: Validator[]; totalStake: number }> {
  const rpc = 'https://api.mainnet-beta.solana.com';

  const [voteRes, epochRes] = await Promise.all([
    fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'getVoteAccounts',
        params: [{ commitment: 'confirmed' }],
      }),
    }),
    fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 2,
        method: 'getEpochInfo',
        params: [],
      }),
    }),
  ]);

  if (!voteRes.ok) throw new Error(`Solana RPC getVoteAccounts ${voteRes.status}`);

  const voteData = await voteRes.json() as {
    result: { current: RpcVoteAccount[]; delinquent: RpcVoteAccount[] };
  };

  const epochData = await epochRes.json() as { result: { absoluteSlot: number } };
  const currentSlot = epochData.result?.absoluteSlot ?? 0;

  const allActive = voteData.result.current;
  const allDelinquent = voteData.result.delinquent;

  const totalActivated = allActive.reduce((s, v) => s + v.activatedStake, 0);

  // Top 8 by activated stake (active validators only)
  const top = [...allActive]
    .sort((a, b) => b.activatedStake - a.activatedStake)
    .slice(0, 8);

  // Delinquent vote pubkeys set
  const delinquentSet = new Set(allDelinquent.map((v) => v.votePubkey));

  const validators: Validator[] = top.map((v, i) => {
    const meta = KNOWN_VALIDATORS[v.votePubkey];
    const name = meta?.name ?? `Validator ${v.votePubkey.slice(0, 8)}...`;
    const logo = meta?.logo ?? '◎';
    const id = meta?.id ?? v.votePubkey.slice(0, 8);

    // Skip rate: estimate from epoch credits history
    const credits = v.epochCredits ?? [];
    let skipRate = 0.5;
    if (credits.length >= 2) {
      const recent = credits.slice(-2);
      const earned = recent[1][1] - recent[0][1];
      const possible = recent[1][2] - recent[0][2];
      if (possible > 0) skipRate = Math.round((1 - earned / possible) * 1000) / 10;
    }

    // Uptime: estimate from skip rate
    const uptime = Math.round((100 - skipRate * 0.5) * 100) / 100;

    const apy = calcApy(v.commission, totalActivated, v.activatedStake);

    return {
      id,
      name,
      logo,
      voteAccount: v.votePubkey.slice(0, 4) + '...' + v.votePubkey.slice(-4),
      commission: v.commission,
      apy,
      uptime,
      stake: stakeToStr(v.activatedStake),
      stakers: 0, // not available from RPC without indexer
      skipRate: Math.round(skipRate * 10) / 10,
      delinquent: delinquentSet.has(v.votePubkey),
      featured: meta?.featured ?? false,
      description: meta?.description ?? 'Active Solana validator.',
      avsSupported: meta?.avsSupported ?? false,
    };
  });

  return { validators, totalStake: totalActivated };
}

// ─── GET Handler ──────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const { validators, totalStake } = await fetchValidators();

    const avgApy = Math.round(
      (validators.reduce((s, v) => s + v.apy, 0) / validators.length) * 10,
    ) / 10;

    const avgCommission = Math.round(
      validators.reduce((s, v) => s + v.commission, 0) / validators.length,
    );

    return NextResponse.json({
      validators,
      totalStake: stakeToStr(totalStake),
      avgApy,
      avgCommission,
      source: 'live',
      lastUpdated: new Date().toISOString(),
    } satisfies ValidatorsData);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load validators' },
      { status: 500 },
    );
  }
}
