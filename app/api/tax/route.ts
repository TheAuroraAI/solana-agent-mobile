import { NextRequest, NextResponse } from 'next/server';

// Tax calculation requires indexing every transaction with historical prices.
// This cannot be done in real-time without a wallet connection + a dedicated
// transaction indexer. We redirect users to best-in-class crypto tax tools.

export type TaxEventType =
  | 'sale'
  | 'purchase'
  | 'defi_income'
  | 'airdrop'
  | 'staking_reward'
  | 'transfer';

export type HoldingType = 'short_term' | 'long_term';

export interface TaxEvent {
  id: string;
  type: TaxEventType;
  date: string;
  token: string;
  logo: string;
  amount: number;
  costBasis: number;
  proceeds: number;
  gainLoss: number;
  holdingType: HoldingType;
  txHash: string;
}

export interface TaxSummary {
  year: number;
  shortTermGains: number;
  shortTermLosses: number;
  longTermGains: number;
  longTermLosses: number;
  netShortTerm: number;
  netLongTerm: number;
  totalNetGain: number;
  defiIncome: number;
  stakingRewards: number;
  airdrops: number;
  totalTaxableIncome: number;
  estimatedTaxOwed: number;
  eventCount: number;
}

export interface TaxData {
  year: number;
  summary: TaxSummary | null;
  events: TaxEvent[];
  byToken: { token: string; logo: string; netGain: number; eventCount: number }[];
  taxBracketNote: string;
  disclaimer: string;
  lastUpdated: string;
  requiresWallet: boolean;
  supportedTools: { name: string; url: string; description: string }[];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get('year');
  const wallet = searchParams.get('wallet')?.trim();
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();
  const validYear = !isNaN(year) && year >= 2020 && year <= 2030 ? year : new Date().getFullYear();

  if (!wallet) {
    return NextResponse.json({
      year: validYear,
      summary: null,
      events: [],
      byToken: [],
      taxBracketNote: 'Connect your wallet to generate a tax report.',
      disclaimer:
        'Tax reports require transaction history from your wallet. Connect a wallet or use a dedicated crypto tax tool for accurate reporting.',
      lastUpdated: new Date().toISOString(),
      requiresWallet: true,
      supportedTools: [
        {
          name: 'Koinly',
          url: 'https://koinly.io',
          description: 'Import Solana transactions automatically. Free up to 10,000 transactions.',
        },
        {
          name: 'CoinTracker',
          url: 'https://www.cointracker.io',
          description: 'Sync Solana wallet directly. Supports all major DEXs and protocols.',
        },
        {
          name: 'TaxBit',
          url: 'https://taxbit.com',
          description: 'Enterprise-grade crypto tax compliance. SOC 2 certified.',
        },
        {
          name: 'ZenLedger',
          url: 'https://zenledger.io',
          description: 'Supports 400+ Solana tokens and DeFi protocols.',
        },
      ],
    } satisfies TaxData);
  }

  // With wallet: could fetch real transactions from Solana RPC and compute basic
  // stats, but full PnL requires historical price data which requires a paid indexer.
  // Return empty events with a note directing to tax tools.
  return NextResponse.json({
    year: validYear,
    summary: null,
    events: [],
    byToken: [],
    taxBracketNote: 'Full tax calculation requires a dedicated crypto tax tool with historical price data.',
    disclaimer:
      'This feature cannot calculate accurate PnL without a complete transaction indexer and historical price data. Use a crypto tax tool for accurate reporting.',
    lastUpdated: new Date().toISOString(),
    requiresWallet: false,
    supportedTools: [
      {
        name: 'Koinly',
        url: 'https://koinly.io',
        description: 'Import Solana wallet ' + wallet.slice(0, 8) + '... directly. Free tier available.',
      },
      {
        name: 'CoinTracker',
        url: 'https://www.cointracker.io',
        description: 'Sync Solana wallet directly. Supports all major DEXs and protocols.',
      },
      {
        name: 'TaxBit',
        url: 'https://taxbit.com',
        description: 'Enterprise-grade crypto tax compliance. SOC 2 certified.',
      },
      {
        name: 'ZenLedger',
        url: 'https://zenledger.io',
        description: 'Supports 400+ Solana tokens and DeFi protocols.',
      },
    ],
  } satisfies TaxData);
}
