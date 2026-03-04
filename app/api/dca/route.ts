import { NextResponse } from 'next/server';

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
}

function generateDemoPlans(): DcaPlan[] {
  const now = Date.now();
  const DAY = 86400000;

  return [
    {
      id: 'dca-001',
      tokenSymbol: 'USDC',
      tokenName: 'USD Coin',
      tokenIcon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
      amountPerInterval: 0.5,
      interval: 'daily',
      targetAllocation: 30,
      totalInvested: 14.5,
      averagePrice: 172.40,
      currentPrice: 176.82,
      orders: [
        { date: new Date(now - 1 * DAY).toISOString(), amount: 0.5, price: 175.20, txSignature: '5Kx9R...7mNqP' },
        { date: new Date(now - 2 * DAY).toISOString(), amount: 0.5, price: 173.80, txSignature: '3Jf2T...9bWrK' },
        { date: new Date(now - 3 * DAY).toISOString(), amount: 0.5, price: 171.50, txSignature: '8Nh4Y...2pXcL' },
        { date: new Date(now - 4 * DAY).toISOString(), amount: 0.5, price: 174.60, txSignature: '2Bg7W...5kMaR' },
        { date: new Date(now - 5 * DAY).toISOString(), amount: 0.5, price: 169.30, txSignature: '9Dv1Z...4jHnS' },
        { date: new Date(now - 6 * DAY).toISOString(), amount: 0.5, price: 170.80, txSignature: '6Fm3Q...8cTpU' },
        { date: new Date(now - 7 * DAY).toISOString(), amount: 0.5, price: 168.90, txSignature: '4Aw5E...1gVsX' },
      ],
      status: 'active',
      startDate: new Date(now - 29 * DAY).toISOString(),
      nextExecution: new Date(now + 8 * 3600000).toISOString(),
      pnlPercent: 2.57,
    },
    {
      id: 'dca-002',
      tokenSymbol: 'JUP',
      tokenName: 'Jupiter',
      tokenIcon: 'https://static.jup.ag/jup/icon.png',
      amountPerInterval: 1.0,
      interval: 'weekly',
      targetAllocation: 15,
      totalInvested: 8.0,
      averagePrice: 0.92,
      currentPrice: 1.04,
      orders: [
        { date: new Date(now - 7 * DAY).toISOString(), amount: 1.0, price: 0.88, txSignature: '7Rl8F...3nYwD' },
        { date: new Date(now - 14 * DAY).toISOString(), amount: 1.0, price: 0.91, txSignature: '1Hs6G...6bZqE' },
        { date: new Date(now - 21 * DAY).toISOString(), amount: 1.0, price: 0.95, txSignature: '5Kt4H...9dArF' },
        { date: new Date(now - 28 * DAY).toISOString(), amount: 1.0, price: 0.87, txSignature: '3Mu2J...2fCsG' },
      ],
      status: 'active',
      startDate: new Date(now - 56 * DAY).toISOString(),
      nextExecution: new Date(now + 2 * DAY).toISOString(),
      pnlPercent: 13.04,
    },
    {
      id: 'dca-003',
      tokenSymbol: 'BONK',
      tokenName: 'Bonk',
      tokenIcon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263/logo.png',
      amountPerInterval: 0.25,
      interval: 'daily',
      targetAllocation: 10,
      totalInvested: 5.0,
      averagePrice: 0.00001920,
      currentPrice: 0.00001743,
      orders: [
        { date: new Date(now - 1 * DAY).toISOString(), amount: 0.25, price: 0.00001810, txSignature: '8Nv3K...5hEtH' },
        { date: new Date(now - 2 * DAY).toISOString(), amount: 0.25, price: 0.00001890, txSignature: '2Pw7L...8jFuI' },
        { date: new Date(now - 3 * DAY).toISOString(), amount: 0.25, price: 0.00001950, txSignature: '6Qx1M...1kGvJ' },
        { date: new Date(now - 4 * DAY).toISOString(), amount: 0.25, price: 0.00002010, txSignature: '4Ry5N...4lHwK' },
        { date: new Date(now - 5 * DAY).toISOString(), amount: 0.25, price: 0.00001940, txSignature: '9Sz9P...7mIxL' },
      ],
      status: 'active',
      startDate: new Date(now - 20 * DAY).toISOString(),
      nextExecution: new Date(now + 14 * 3600000).toISOString(),
      pnlPercent: -9.22,
    },
    {
      id: 'dca-004',
      tokenSymbol: 'PYTH',
      tokenName: 'Pyth Network',
      tokenIcon: 'https://pyth.network/token.svg',
      amountPerInterval: 2.0,
      interval: 'monthly',
      targetAllocation: 10,
      totalInvested: 6.0,
      averagePrice: 0.38,
      currentPrice: 0.41,
      orders: [
        { date: new Date(now - 30 * DAY).toISOString(), amount: 2.0, price: 0.35, txSignature: '1Ta3Q...0nJyM' },
        { date: new Date(now - 60 * DAY).toISOString(), amount: 2.0, price: 0.39, txSignature: '5Ub7R...3oKzN' },
        { date: new Date(now - 90 * DAY).toISOString(), amount: 2.0, price: 0.40, txSignature: '3Vc1S...6pLaO' },
      ],
      status: 'paused',
      startDate: new Date(now - 90 * DAY).toISOString(),
      nextExecution: new Date(now + 5 * DAY).toISOString(),
      pnlPercent: 7.89,
    },
  ];
}

export async function GET() {
  try {
    const plans = generateDemoPlans();
    const totalInvested = plans.reduce((sum, p) => sum + p.totalInvested, 0);

    // Calculate total current value based on invested amount and PnL
    const totalValue = plans.reduce((sum, p) => {
      return sum + p.totalInvested * (1 + p.pnlPercent / 100);
    }, 0);

    const overallPnlPercent = totalInvested > 0
      ? ((totalValue - totalInvested) / totalInvested) * 100
      : 0;

    const data: DcaData = {
      plans,
      totalInvested,
      totalValue,
      overallPnlPercent,
    };

    return NextResponse.json(data);
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

    const {
      tokenSymbol,
      tokenName,
      tokenIcon,
      amountPerInterval,
      interval,
      duration,
      startDate,
    } = body;

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
