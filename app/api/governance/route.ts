import { NextResponse } from 'next/server';

export const runtime = 'edge';

export interface Proposal {
  id: string;
  dao: string;
  daoIcon: string;
  title: string;
  summary: string;
  status: 'active' | 'passed' | 'rejected' | 'pending';
  votesFor: number;
  votesAgainst: number;
  quorum: number;
  quorumReached: boolean;
  startDate: string;
  endDate: string;
  timeRemaining: string;
  yourVote: 'for' | 'against' | null;
  category: string;
}

export interface GovernanceData {
  proposals: Proposal[];
  daoStats: {
    totalDaos: number;
    activeProposals: number;
    yourVotingPower: number;
  };
}

function getDemoProposals(): Proposal[] {
  return [
    {
      id: 'mnde-gov-42',
      dao: 'Marinade',
      daoIcon: '\uD83C\uDF0A',
      title: 'Increase validator commission cap to 8%',
      summary:
        'This proposal raises the maximum validator commission from 5% to 8% to attract higher-performing validators. The change aims to improve network decentralization by making it economically viable for smaller validators to join the Marinade stake pool, while maintaining competitive staking yields for mSOL holders.',
      status: 'active',
      votesFor: 14_820_000,
      votesAgainst: 3_210_000,
      quorum: 20_000_000,
      quorumReached: false,
      startDate: '2026-02-28',
      endDate: '2026-03-08',
      timeRemaining: '3d 4h',
      yourVote: null,
      category: 'Protocol Parameters',
    },
    {
      id: 'jup-dao-18',
      dao: 'Jupiter',
      daoIcon: '\uD83E\uDE90',
      title: 'Allocate 5M JUP for ecosystem grants program',
      summary:
        'Proposal to allocate 5 million JUP tokens from the DAO treasury to fund an ecosystem grants program over 12 months. Grants will target developer tooling, analytics dashboards, and community education initiatives. A 5-member grants council will oversee allocation with monthly transparency reports.',
      status: 'active',
      votesFor: 42_500_000,
      votesAgainst: 8_700_000,
      quorum: 50_000_000,
      quorumReached: true,
      startDate: '2026-02-25',
      endDate: '2026-03-07',
      timeRemaining: '1d 18h',
      yourVote: 'for',
      category: 'Treasury',
    },
    {
      id: 'ray-prop-7',
      dao: 'Raydium',
      daoIcon: '\uD83D\uDCA0',
      title: 'Reduce swap fee on concentrated liquidity pools',
      summary:
        'Lower the default swap fee on CLMM pools from 25bps to 20bps to increase trading volume competitiveness against Jupiter and Orca. Modeling shows 15-20% volume increase at the lower fee tier would offset revenue impact within 60 days. Fee revenue share to RAY stakers remains unchanged.',
      status: 'passed',
      votesFor: 31_200_000,
      votesAgainst: 5_800_000,
      quorum: 25_000_000,
      quorumReached: true,
      startDate: '2026-02-15',
      endDate: '2026-02-25',
      timeRemaining: 'Ended',
      yourVote: 'for',
      category: 'Fee Structure',
    },
    {
      id: 'orca-gov-31',
      dao: 'Orca',
      daoIcon: '\uD83D\uDC33',
      title: 'Launch ORCA staking with 12% APR incentives',
      summary:
        'Introduce single-sided ORCA staking with protocol fee sharing and additional incentive emissions. Stakers would receive 30% of protocol trading fees plus 500K ORCA distributed linearly over 6 months. Lockup period options: 30d (1x multiplier), 90d (1.5x), 180d (2x).',
      status: 'active',
      votesFor: 9_400_000,
      votesAgainst: 12_100_000,
      quorum: 15_000_000,
      quorumReached: true,
      startDate: '2026-03-01',
      endDate: '2026-03-10',
      timeRemaining: '5d 2h',
      yourVote: null,
      category: 'Staking',
    },
    {
      id: 'jto-prop-9',
      dao: 'Jito',
      daoIcon: '\u26A1',
      title: 'Upgrade MEV tip distribution to v2 algorithm',
      summary:
        'Migrate the MEV tip distribution mechanism to v2, which introduces a quadratic weighting system favoring smaller validators. The upgrade improves Nakamoto coefficient by an estimated 8-12% while maintaining total MEV revenue within 2% of current levels. Requires coordinated validator software update.',
      status: 'pending',
      votesFor: 0,
      votesAgainst: 0,
      quorum: 30_000_000,
      quorumReached: false,
      startDate: '2026-03-10',
      endDate: '2026-03-20',
      timeRemaining: 'Starts in 5d',
      yourVote: null,
      category: 'Protocol Upgrade',
    },
    {
      id: 'jup-dao-19',
      dao: 'Jupiter',
      daoIcon: '\uD83E\uDE90',
      title: 'Add perpetuals fee tier for JUP stakers',
      summary:
        'Introduce a tiered fee discount on Jupiter perpetuals based on JUP staking amount. Tier 1 (1K JUP): 5% discount, Tier 2 (10K JUP): 15% discount, Tier 3 (100K JUP): 25% discount. Expected to increase JUP staking TVL by $12M and reduce net perp fee revenue by approximately 8%.',
      status: 'rejected',
      votesFor: 11_900_000,
      votesAgainst: 28_400_000,
      quorum: 35_000_000,
      quorumReached: true,
      startDate: '2026-02-10',
      endDate: '2026-02-20',
      timeRemaining: 'Ended',
      yourVote: 'against',
      category: 'Fee Structure',
    },
    {
      id: 'mnde-gov-43',
      dao: 'Marinade',
      daoIcon: '\uD83C\uDF0A',
      title: 'Treasury diversification: convert 10% to USDC',
      summary:
        'Convert 10% of the Marinade DAO treasury holdings from MNDE to USDC to create a stable operations fund. The conversion would occur via TWAP over 30 days to minimize market impact. The USDC reserve would fund 18 months of contributor compensation and audit expenses.',
      status: 'active',
      votesFor: 18_300_000,
      votesAgainst: 6_900_000,
      quorum: 22_000_000,
      quorumReached: true,
      startDate: '2026-03-02',
      endDate: '2026-03-12',
      timeRemaining: '7d 1h',
      yourVote: null,
      category: 'Treasury',
    },
  ];
}

export async function GET() {
  const proposals = getDemoProposals();

  const activeCount = proposals.filter((p) => p.status === 'active').length;
  const uniqueDaos = new Set(proposals.map((p) => p.dao)).size;

  const data: GovernanceData = {
    proposals,
    daoStats: {
      totalDaos: uniqueDaos,
      activeProposals: activeCount,
      yourVotingPower: 24_850,
    },
  };

  return NextResponse.json(data);
}
