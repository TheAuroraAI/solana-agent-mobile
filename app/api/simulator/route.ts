import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const revalidate = 60;

// ─── Exported Types ──────────────────────────────────────────────────────────

export interface ScenarioToken {
  symbol: string;
  logo: string;             // emoji
  currentPrice: number;
  currentAllocation: number; // percentage
  projectedChange: number;  // percentage slider -90 to +500
}

export interface SimulatorScenario {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji
  changes: Record<string, number>; // symbol → % change
}

export interface SimulatorData {
  currentPortfolioValue: number;
  tokens: ScenarioToken[];
  presetScenarios: SimulatorScenario[];
  lastUpdated: string;
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse<SimulatorData>> {
  const tokens: ScenarioToken[] = [
    {
      symbol: 'SOL',
      logo: '◎',
      currentPrice: 172.4,
      currentAllocation: 40,
      projectedChange: 0,
    },
    {
      symbol: 'USDC',
      logo: '💵',
      currentPrice: 1.0,
      currentAllocation: 20,
      projectedChange: 0,
    },
    {
      symbol: 'JUP',
      logo: '🪐',
      currentPrice: 0.87,
      currentAllocation: 15,
      projectedChange: 0,
    },
    {
      symbol: 'BONK',
      logo: '🐶',
      currentPrice: 0.0000182,
      currentAllocation: 10,
      projectedChange: 0,
    },
    {
      symbol: 'WIF',
      logo: '🎩',
      currentPrice: 1.23,
      currentAllocation: 8,
      projectedChange: 0,
    },
    {
      symbol: 'RAY',
      logo: '⚡',
      currentPrice: 2.94,
      currentAllocation: 7,
      projectedChange: 0,
    },
  ];

  const presetScenarios: SimulatorScenario[] = [
    {
      id: 'bull-run',
      name: 'Bull Run',
      description: 'Everything pumps — altseason in full swing',
      icon: '🚀',
      changes: {
        SOL: 150,
        JUP: 200,
        BONK: 500,
        WIF: 300,
        RAY: 120,
        USDC: 0,
      },
    },
    {
      id: 'bear-market',
      name: 'Bear Market',
      description: 'Crypto winter — liquidity dries up',
      icon: '🐻',
      changes: {
        SOL: -60,
        JUP: -75,
        BONK: -90,
        WIF: -85,
        RAY: -65,
        USDC: 0,
      },
    },
    {
      id: 'sol-flippening',
      name: 'Solana Flippening',
      description: 'SOL surpasses ETH market cap',
      icon: '⚡',
      changes: {
        SOL: 400,
        JUP: 100,
        BONK: 80,
        WIF: 60,
        RAY: 50,
        USDC: 0,
      },
    },
    {
      id: 'defi-summer',
      name: 'DeFi Summer',
      description: 'Yield and governance tokens explode',
      icon: '☀️',
      changes: {
        SOL: 80,
        JUP: 300,
        BONK: 100,
        WIF: 150,
        RAY: 250,
        USDC: 0,
      },
    },
  ];

  const data: SimulatorData = {
    currentPortfolioValue: 12_450,
    tokens,
    presetScenarios,
    lastUpdated: new Date().toISOString(),
  };

  return NextResponse.json(data);
}
