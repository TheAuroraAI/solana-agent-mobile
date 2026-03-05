import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export interface DcaOrder {
  date: string;
  amount: number;
  price: number;
  txSignature: string;
}

export interface DcaPlan {
  id: string;
  tokenSymbol: string;
  tokenName: string;
  tokenIcon: string;
  amountPerInterval: number;
  interval: 'daily' | 'weekly' | 'monthly';
  targetAllocation: number;
  totalInvested: number;
  averagePrice: number;
  currentPrice: number;
  orders: DcaOrder[];
  status: 'active' | 'paused' | 'completed';
  startDate: string;
  nextExecution: string;
  pnlPercent: number;
}

export interface DcaData {
  plans: DcaPlan[];
  totalInvested: number;
  totalValue: number;
  overallPnlPercent: number;
  source: 'live' | 'empty';
  lastUpdated: string;
}

interface JupDcaAccount {
  userKey: string;
  inputMint: string;
  outputMint: string;
  idx: string;
  nextCycleAt: string;
  inDeposited: string;
  inWithdrawn: string;
  outWithdrawn: string;
  inUsed: string;
  inAmountPerCycle: string;
  cycleFrequency: string;
  createdAt: string;
  updatedAt: string;
  publicKey: string;
  status: string;
  inputTokenProgram: string;
  outputTokenProgram: string;
  bump: number;
  minOutAmount: string | null;
  maxOutAmount: string | null;
  lastCycleUsed: string;
  lastCycleOut: string;
}

// ─── Known token metadata ────────────────────────────────────────────────────

const TOKEN_META: Record<string, { symbol: string; name: string; icon: string }> = {
  'So11111111111111111111111111111111111111112':  { symbol: 'SOL',  name: 'Solana',    icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png' },
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { symbol: 'USDC', name: 'USD Coin', icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png' },
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN':  { symbol: 'JUP',  name: 'Jupiter',  icon: 'https://static.jup.ag/jup/icon.png' },
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': { symbol: 'BONK', name: 'Bonk',     icon: 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I' },
  'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm': { symbol: 'WIF',  name: 'dogwifhat', icon: 'https://bafkreibk3covs5ltyqxa272uodhculbois6yuzmbl4o3stmlpcclkp23a.ipfs.nftstorage.link' },
};

function tokenMeta(mint: string) {
  return TOKEN_META[mint] ?? { symbol: mint.slice(0, 4) + '...', name: 'Unknown Token', icon: '' };
}

function cyclesToInterval(seconds: number): 'daily' | 'weekly' | 'monthly' {
  if (seconds <= 86400) return 'daily';
  if (seconds <= 604800) return 'weekly';
  return 'monthly';
}

async function fetchJupiterDca(wallet: string): Promise<DcaPlan[]> {
  const url = `https://dca.jup.ag/v2/user/${wallet}`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`Jupiter DCA API ${res.status}`);

  const data = await res.json() as { dcaAccounts?: JupDcaAccount[] };
  const accounts = data.dcaAccounts ?? [];

  return accounts
    .filter((a) => a.status !== 'Closed')
    .map((a) => {
      const outputMeta = tokenMeta(a.outputMint);
      const inputMeta = tokenMeta(a.inputMint);
      const inAmountPerCycle = parseInt(a.inAmountPerCycle, 10) / 1e6; // USDC/SOL decimals
      const cycleFreq = parseInt(a.cycleFrequency, 10);
      const interval = cyclesToInterval(cycleFreq);
      const totalInvested = parseInt(a.inUsed, 10) / 1e6;
      const nextCycle = new Date(parseInt(a.nextCycleAt, 10) * 1000).toISOString();
      const startDate = new Date(parseInt(a.createdAt, 10) * 1000).toISOString();
      const isActive = a.status === 'Active';

      return {
        id: a.publicKey,
        tokenSymbol: outputMeta.symbol,
        tokenName: outputMeta.name,
        tokenIcon: outputMeta.icon,
        amountPerInterval: inAmountPerCycle,
        interval,
        targetAllocation: 0,
        totalInvested,
        averagePrice: 0,  // Would require historical price lookups
        currentPrice: 0,  // Fetch separately if needed
        orders: [],       // Individual orders require transaction history
        status: isActive ? 'active' : 'completed',
        startDate,
        nextExecution: nextCycle,
        pnlPercent: 0,
      } satisfies DcaPlan;
    });
}

// ─── GET Handler ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get('wallet')?.trim();

  if (!wallet) {
    return NextResponse.json({
      plans: [],
      totalInvested: 0,
      totalValue: 0,
      overallPnlPercent: 0,
      source: 'empty',
      lastUpdated: new Date().toISOString(),
    } satisfies DcaData);
  }

  try {
    const plans = await fetchJupiterDca(wallet);
    const totalInvested = plans.reduce((s, p) => s + p.totalInvested, 0);

    return NextResponse.json({
      plans,
      totalInvested,
      totalValue: totalInvested,  // PnL requires historical prices
      overallPnlPercent: 0,
      source: 'live',
      lastUpdated: new Date().toISOString(),
    } satisfies DcaData);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch DCA data' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tokenSymbol, tokenName, tokenIcon, amountPerInterval, interval, startDate } = body;

    if (!tokenSymbol || !amountPerInterval || !interval) {
      return NextResponse.json(
        { error: 'Missing required fields: tokenSymbol, amountPerInterval, interval' },
        { status: 400 },
      );
    }

    const newPlan: DcaPlan = {
      id: `dca-${Date.now().toString(36)}`,
      tokenSymbol,
      tokenName: tokenName ?? tokenSymbol,
      tokenIcon: tokenIcon ?? '',
      amountPerInterval: parseFloat(amountPerInterval),
      interval,
      targetAllocation: 0,
      totalInvested: 0,
      averagePrice: 0,
      currentPrice: 0,
      orders: [],
      status: 'active',
      startDate: startDate ?? new Date().toISOString(),
      nextExecution: startDate ?? new Date().toISOString(),
      pnlPercent: 0,
    };

    return NextResponse.json({ success: true, plan: newPlan }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create DCA plan' },
      { status: 500 },
    );
  }
}
