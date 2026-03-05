import { NextResponse } from 'next/server';

export type MevType = 'sandwich' | 'frontrun' | 'backrun' | 'liquidation' | 'arbitrage';
export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'safe';

export interface MevAttack {
  id: string;
  type: MevType;
  slot: number;
  timestamp: string;
  victimTx: string;
  attackerWallet: string;
  tokenIn: string;
  tokenOut: string;
  victimLoss: number;    // USD
  attackerProfit: number; // USD
  slippageUsed: number;  // percentage
}

export interface MevRiskMetric {
  token: string;
  logo: string;
  poolLiquidity: number;
  avgSlippage: number;
  sandwichFrequency: number; // attacks/hour
  riskLevel: RiskLevel;
  recommendedSlippage: number;
  protectedRoutes: string[]; // ["Jito", "bloXroute"]
}

export interface MevStats {
  totalAttacks24h: number;
  totalLost24h: number; // USD
  protectedTxCount: number;
  savedUsd: number;
  topAttackerCount: number;
}

export interface MevData {
  protectionEnabled: boolean;
  protectionMode: 'jito' | 'bloxroute' | 'smart' | 'off';
  stats: MevStats;
  recentAttacks: MevAttack[];
  riskByToken: MevRiskMetric[];
  networkMevIntensity: number; // 0-100
  lastUpdated: string;
}

export async function GET() {
  const now = new Date();

  const recentAttacks: MevAttack[] = [
    {
      id: 'atk_001',
      type: 'sandwich',
      slot: 312847921,
      timestamp: new Date(now.getTime() - 2 * 60 * 1000).toISOString(),
      victimTx: '5xKm...rQ9f',
      attackerWallet: 'GhBo...wL4x',
      tokenIn: 'SOL',
      tokenOut: 'BONK',
      victimLoss: 47.82,
      attackerProfit: 41.30,
      slippageUsed: 1.5,
    },
    {
      id: 'atk_002',
      type: 'frontrun',
      slot: 312847855,
      timestamp: new Date(now.getTime() - 7 * 60 * 1000).toISOString(),
      victimTx: 'Bz3p...nT8c',
      attackerWallet: 'KwVe...oP2r',
      tokenIn: 'USDC',
      tokenOut: 'JUP',
      victimLoss: 128.50,
      attackerProfit: 115.20,
      slippageUsed: 2.0,
    },
    {
      id: 'atk_003',
      type: 'sandwich',
      slot: 312847790,
      timestamp: new Date(now.getTime() - 14 * 60 * 1000).toISOString(),
      victimTx: 'Rn7q...aU5v',
      attackerWallet: 'MxCf...sJ9k',
      tokenIn: 'SOL',
      tokenOut: 'WIF',
      victimLoss: 83.15,
      attackerProfit: 72.40,
      slippageUsed: 1.0,
    },
    {
      id: 'atk_004',
      type: 'arbitrage',
      slot: 312847712,
      timestamp: new Date(now.getTime() - 22 * 60 * 1000).toISOString(),
      victimTx: 'Yp2d...cX6m',
      attackerWallet: 'TqHn...bW3z',
      tokenIn: 'RAY',
      tokenOut: 'USDC',
      victimLoss: 19.67,
      attackerProfit: 17.80,
      slippageUsed: 0.5,
    },
    {
      id: 'atk_005',
      type: 'frontrun',
      slot: 312847645,
      timestamp: new Date(now.getTime() - 31 * 60 * 1000).toISOString(),
      victimTx: 'Lk9w...jF4e',
      attackerWallet: 'DvRs...mN1y',
      tokenIn: 'USDC',
      tokenOut: 'SOL',
      victimLoss: 214.33,
      attackerProfit: 198.70,
      slippageUsed: 3.0,
    },
  ];

  const riskByToken: MevRiskMetric[] = [
    {
      token: 'SOL',
      logo: '◎',
      poolLiquidity: 48_200_000,
      avgSlippage: 0.12,
      sandwichFrequency: 4.2,
      riskLevel: 'medium',
      recommendedSlippage: 0.5,
      protectedRoutes: ['Jito', 'bloXroute'],
    },
    {
      token: 'BONK',
      logo: '🐶',
      poolLiquidity: 3_800_000,
      avgSlippage: 1.85,
      sandwichFrequency: 18.7,
      riskLevel: 'critical',
      recommendedSlippage: 3.0,
      protectedRoutes: ['Jito'],
    },
    {
      token: 'WIF',
      logo: '🐕',
      poolLiquidity: 7_100_000,
      avgSlippage: 1.20,
      sandwichFrequency: 11.4,
      riskLevel: 'high',
      recommendedSlippage: 2.0,
      protectedRoutes: ['Jito', 'bloXroute'],
    },
    {
      token: 'JUP',
      logo: '🪐',
      poolLiquidity: 12_400_000,
      avgSlippage: 0.68,
      sandwichFrequency: 6.9,
      riskLevel: 'medium',
      recommendedSlippage: 1.0,
      protectedRoutes: ['Jito', 'bloXroute'],
    },
    {
      token: 'RAY',
      logo: '⚡',
      poolLiquidity: 5_600_000,
      avgSlippage: 0.44,
      sandwichFrequency: 3.1,
      riskLevel: 'low',
      recommendedSlippage: 0.5,
      protectedRoutes: ['bloXroute'],
    },
    {
      token: 'USDC',
      logo: '$',
      poolLiquidity: 92_700_000,
      avgSlippage: 0.03,
      sandwichFrequency: 0.4,
      riskLevel: 'safe',
      recommendedSlippage: 0.1,
      protectedRoutes: ['Jito', 'bloXroute'],
    },
  ];

  const data: MevData = {
    protectionEnabled: true,
    protectionMode: 'smart',
    stats: {
      totalAttacks24h: 1247,
      totalLost24h: 89_000,
      protectedTxCount: 3421,
      savedUsd: 12_400,
      topAttackerCount: 38,
    },
    recentAttacks,
    riskByToken,
    networkMevIntensity: 67,
    lastUpdated: now.toISOString(),
  };

  return NextResponse.json(data);
}
