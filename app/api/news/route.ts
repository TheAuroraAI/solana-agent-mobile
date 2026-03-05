import { NextResponse } from 'next/server';

export type NewsCategory = 'Protocol' | 'Market' | 'DeFi' | 'NFT' | 'Gaming' | 'Regulation' | 'Dev';

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;       // 1-2 sentences
  source: string;        // "The Block", "CoinDesk", "Solana Foundation", "Decrypt"
  category: NewsCategory;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  timeAgo: string;       // "2h ago", "1d ago"
  readTime: string;      // "3 min read"
  featured: boolean;     // top story
  tags: string[];
  imageEmoji: string;    // emoji to represent the article
}

export interface NewsData {
  articles: NewsArticle[];
  trending: string[];    // trending topics
}

const MOCK_ARTICLES: NewsArticle[] = [
  {
    id: 'firedancer-50k-tps',
    title: 'Firedancer Client Reaches 50,000 TPS on Mainnet Testnet',
    summary:
      'Jump Crypto\'s Firedancer validator client hit a new benchmark of 50,000 transactions per second during a public testnet stress test, signaling a major milestone ahead of full mainnet deployment. Engineers confirmed stability across 300 validators with zero dropped blocks.',
    source: 'Solana Foundation',
    category: 'Protocol',
    sentiment: 'bullish',
    timeAgo: '2h ago',
    readTime: '4 min read',
    featured: true,
    tags: ['Firedancer', 'TPS', 'Mainnet', 'Jump Crypto'],
    imageEmoji: '⚡',
  },
  {
    id: 'seeker-1m-preorders',
    title: 'Solana Mobile Seeker Pre-Orders Surpass 1 Million Units',
    summary:
      'Solana Mobile announced that pre-orders for its second smartphone, the Seeker, have crossed the one million milestone — a 40x improvement over the original Saga launch numbers.',
    source: 'The Block',
    category: 'Market',
    sentiment: 'bullish',
    timeAgo: '5h ago',
    readTime: '3 min read',
    featured: false,
    tags: ['Seeker', 'Mobile', 'Hardware', 'Web3 Phone'],
    imageEmoji: '📱',
  },
  {
    id: 'jupiter-50b-volume',
    title: 'Jupiter DEX Surpasses $50B Monthly Volume for First Time',
    summary:
      'Jupiter Exchange shattered records in February 2026, processing over $50 billion in monthly swap volume across all aggregated routes — cementing its position as the dominant DEX aggregator on Solana.',
    source: 'CoinDesk',
    category: 'DeFi',
    sentiment: 'bullish',
    timeAgo: '8h ago',
    readTime: '3 min read',
    featured: false,
    tags: ['Jupiter', 'DEX', 'Volume', 'DeFi'],
    imageEmoji: '🪐',
  },
  {
    id: 'marinade-restaking-24-apy',
    title: 'Marinade Finance Launches Native SOL Restaking with 24% APY',
    summary:
      'Marinade Finance unveiled a restaking product allowing mSOL holders to earn a compounded 24% APY by securing restaked AVS networks — Solana\'s answer to Ethereum\'s EigenLayer.',
    source: 'Decrypt',
    category: 'DeFi',
    sentiment: 'bullish',
    timeAgo: '12h ago',
    readTime: '5 min read',
    featured: false,
    tags: ['Marinade', 'Restaking', 'mSOL', 'Yield'],
    imageEmoji: '🌊',
  },
  {
    id: 'sec-solana-etf-comment',
    title: 'SEC Opens 30-Day Comment Period on Spot Solana ETF Applications',
    summary:
      'The U.S. Securities and Exchange Commission formally acknowledged three spot Solana ETF applications from VanEck, Grayscale, and 21Shares, opening a public comment window with a final decision expected by Q3 2026.',
    source: 'CoinDesk',
    category: 'Regulation',
    sentiment: 'neutral',
    timeAgo: '1d ago',
    readTime: '4 min read',
    featured: false,
    tags: ['ETF', 'SEC', 'Regulation', 'VanEck'],
    imageEmoji: '⚖️',
  },
  {
    id: 'tensor-gamefi-launchpad',
    title: 'Tensor Unveils Gaming NFT Launchpad with On-Chain Royalties',
    summary:
      'NFT marketplace Tensor launched a dedicated GameFi launchpad featuring programmable royalties enforced at the protocol level, attracting four major gaming studios for day-one launches.',
    source: 'The Block',
    category: 'Gaming',
    sentiment: 'bullish',
    timeAgo: '1d ago',
    readTime: '3 min read',
    featured: false,
    tags: ['Tensor', 'NFT', 'Gaming', 'Royalties'],
    imageEmoji: '🎮',
  },
  {
    id: 'sol-price-correction',
    title: 'SOL Drops 12% Amid Broader Crypto Market Sell-Off',
    summary:
      'Solana\'s native token fell 12% over 48 hours as macroeconomic concerns and cascading liquidations across DeFi protocols triggered widespread risk-off sentiment. On-chain data shows accumulation at key support levels.',
    source: 'CoinDesk',
    category: 'Market',
    sentiment: 'bearish',
    timeAgo: '1d ago',
    readTime: '3 min read',
    featured: false,
    tags: ['SOL', 'Price', 'Liquidations', 'Market'],
    imageEmoji: '📉',
  },
  {
    id: 'compressed-nfts-v2',
    title: 'Metaplex Releases cNFT v2 Standard with Dynamic Metadata',
    summary:
      'Metaplex launched Compressed NFT v2 enabling on-chain dynamic metadata updates at a cost of 0.000005 SOL per mint — opening new possibilities for on-chain gaming items and evolving digital collectibles.',
    source: 'Solana Foundation',
    category: 'Dev',
    sentiment: 'bullish',
    timeAgo: '2d ago',
    readTime: '6 min read',
    featured: false,
    tags: ['Metaplex', 'cNFT', 'Compression', 'Metadata'],
    imageEmoji: '🖼️',
  },
  {
    id: 'magic-eden-cross-chain',
    title: 'Magic Eden Adds Bitcoin Ordinals and Base NFT Trading to Solana App',
    summary:
      'Magic Eden expanded its cross-chain NFT marketplace to support Bitcoin Ordinals and Base-native collections directly within its Solana-first mobile app, aiming to capture multi-chain collector flows.',
    source: 'Decrypt',
    category: 'NFT',
    sentiment: 'neutral',
    timeAgo: '2d ago',
    readTime: '3 min read',
    featured: false,
    tags: ['Magic Eden', 'Cross-chain', 'Ordinals', 'NFT'],
    imageEmoji: '🌐',
  },
  {
    id: 'solana-sdk-v2-release',
    title: 'Solana SDK v2.0 Released: TypeScript-First with Tree-Shaking Support',
    summary:
      'The Solana Foundation shipped SDK v2.0, a complete TypeScript rewrite with full tree-shaking, reducing dApp bundle sizes by up to 60%. The release includes a migration tool to auto-update v1.x codebases.',
    source: 'Solana Foundation',
    category: 'Dev',
    sentiment: 'bullish',
    timeAgo: '3d ago',
    readTime: '7 min read',
    featured: false,
    tags: ['SDK', 'TypeScript', 'Developer', 'v2'],
    imageEmoji: '🛠️',
  },
];

export async function GET() {
  const data: NewsData = {
    articles: MOCK_ARTICLES,
    trending: ['SOL', 'Firedancer', 'Seeker', 'Jupiter', 'Restaking', 'ETF', 'cNFT'],
  };

  return NextResponse.json(data);
}
