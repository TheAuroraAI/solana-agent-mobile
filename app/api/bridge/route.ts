import { NextResponse } from 'next/server';

export const runtime = 'edge';

export type Chain =
  | 'Solana'
  | 'Ethereum'
  | 'Arbitrum'
  | 'Base'
  | 'Polygon'
  | 'Optimism'
  | 'BSC'
  | 'Avalanche';

export interface BridgeToken {
  symbol: string;
  name: string;
  logo: string;
  chains: Chain[];
  price: number;
}

export interface BridgeRoute {
  id: string;
  provider: string;
  providerLogo: string;
  fromChain: Chain;
  toChain: Chain;
  fromToken: string;
  toToken: string;
  fromAmount: number;
  toAmount: number;
  fee: number;
  feePct: number;
  estimatedTime: number;
  steps: number;
  securityScore: number;
  isRecommended: boolean;
  lastUpdated: string;
}

export interface BridgeData {
  supportedChains: Chain[];
  supportedTokens: BridgeToken[];
  featuredRoutes: BridgeRoute[];
  recentBridges: {
    id: string;
    from: string;
    to: string;
    amount: string;
    status: 'completed' | 'pending' | 'failed';
    timestamp: string;
    txHash: string;
  }[];
}

export async function GET(): Promise<NextResponse<BridgeData>> {
  const now = new Date().toISOString();

  const supportedChains: Chain[] = [
    'Solana',
    'Ethereum',
    'Arbitrum',
    'Base',
    'Polygon',
    'Optimism',
    'BSC',
    'Avalanche',
  ];

  const supportedTokens: BridgeToken[] = [
    {
      symbol: 'SOL',
      name: 'Solana',
      logo: '◎',
      chains: ['Solana', 'Ethereum', 'Arbitrum', 'Base'],
      price: 176.82,
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      logo: '💵',
      chains: ['Solana', 'Ethereum', 'Arbitrum', 'Base', 'Polygon', 'Optimism', 'Avalanche'],
      price: 1.0,
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      logo: '⟠',
      chains: ['Ethereum', 'Arbitrum', 'Base', 'Optimism', 'Polygon'],
      price: 3241.55,
    },
    {
      symbol: 'USDT',
      name: 'Tether USD',
      logo: '₮',
      chains: ['Solana', 'Ethereum', 'BSC', 'Polygon', 'Avalanche'],
      price: 1.0,
    },
    {
      symbol: 'WBTC',
      name: 'Wrapped Bitcoin',
      logo: '₿',
      chains: ['Ethereum', 'Arbitrum', 'Base', 'Polygon'],
      price: 88450.0,
    },
    {
      symbol: 'BNB',
      name: 'BNB',
      logo: '🔶',
      chains: ['BSC', 'Ethereum'],
      price: 412.3,
    },
  ];

  const featuredRoutes: BridgeRoute[] = [
    {
      id: 'route-001',
      provider: 'Wormhole',
      providerLogo: '🌀',
      fromChain: 'Solana',
      toChain: 'Ethereum',
      fromToken: 'USDC',
      toToken: 'USDC',
      fromAmount: 100,
      toAmount: 99.21,
      fee: 0.79,
      feePct: 0.79,
      estimatedTime: 180,
      steps: 2,
      securityScore: 9,
      isRecommended: true,
      lastUpdated: now,
    },
    {
      id: 'route-002',
      provider: 'Mayan',
      providerLogo: '🌊',
      fromChain: 'Solana',
      toChain: 'Ethereum',
      fromToken: 'USDC',
      toToken: 'USDC',
      fromAmount: 100,
      toAmount: 98.85,
      fee: 1.15,
      feePct: 1.15,
      estimatedTime: 120,
      steps: 1,
      securityScore: 8,
      isRecommended: false,
      lastUpdated: now,
    },
    {
      id: 'route-003',
      provider: 'Allbridge',
      providerLogo: '🌉',
      fromChain: 'Solana',
      toChain: 'Base',
      fromToken: 'SOL',
      toToken: 'SOL',
      fromAmount: 1,
      toAmount: 0.9971,
      fee: 0.51,
      feePct: 0.51,
      estimatedTime: 900,
      steps: 3,
      securityScore: 7,
      isRecommended: false,
      lastUpdated: now,
    },
    {
      id: 'route-004',
      provider: 'deBridge',
      providerLogo: '🔗',
      fromChain: 'Ethereum',
      toChain: 'Arbitrum',
      fromToken: 'ETH',
      toToken: 'ETH',
      fromAmount: 0.1,
      toAmount: 0.09975,
      fee: 8.1,
      feePct: 2.5,
      estimatedTime: 30,
      steps: 1,
      securityScore: 8,
      isRecommended: false,
      lastUpdated: now,
    },
  ];

  const recentBridges: BridgeData['recentBridges'] = [
    {
      id: 'recent-001',
      from: 'Solana / USDC',
      to: 'Ethereum / USDC',
      amount: '500 USDC',
      status: 'completed',
      timestamp: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
      txHash: '5Kx9Rmn...7mNqP3F',
    },
    {
      id: 'recent-002',
      from: 'Ethereum / ETH',
      to: 'Arbitrum / ETH',
      amount: '0.25 ETH',
      status: 'pending',
      timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      txHash: '3Jf2Tbn...9bWrK1A',
    },
    {
      id: 'recent-003',
      from: 'Polygon / USDT',
      to: 'Solana / USDT',
      amount: '250 USDT',
      status: 'failed',
      timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      txHash: '8Nh4Ycn...2pXcL6B',
    },
  ];

  const data: BridgeData = {
    supportedChains,
    supportedTokens,
    featuredRoutes,
    recentBridges,
  };

  return NextResponse.json(data);
}
