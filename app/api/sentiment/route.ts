import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const revalidate = 60;

export interface TokenSentiment {
  symbol: string;
  name: string;
  sentimentScore: number; // -100 to 100
  sentiment: 'very_bearish' | 'bearish' | 'neutral' | 'bullish' | 'very_bullish';
  mentions24h: number;
  mentionChange: number; // % change vs previous 24h
  topSources: { platform: string; count: number }[];
  trendingTopics: string[];
  priceCorrelation: number; // -1 to 1
  lastUpdated: string;
}

export interface SentimentData {
  tokens: TokenSentiment[];
  overallMarketSentiment: {
    score: number;
    label: 'very_bearish' | 'bearish' | 'neutral' | 'bullish' | 'very_bullish';
  };
  fearGreedIndex: {
    value: number; // 0-100
    label: 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed';
  };
  ts: number;
}

function getSentimentLabel(score: number): TokenSentiment['sentiment'] {
  if (score <= -60) return 'very_bearish';
  if (score <= -20) return 'bearish';
  if (score <= 20) return 'neutral';
  if (score <= 60) return 'bullish';
  return 'very_bullish';
}

function getFearGreedLabel(
  value: number,
): SentimentData['fearGreedIndex']['label'] {
  if (value <= 20) return 'Extreme Fear';
  if (value <= 40) return 'Fear';
  if (value <= 60) return 'Neutral';
  if (value <= 80) return 'Greed';
  return 'Extreme Greed';
}

function getDemoTokens(): TokenSentiment[] {
  const now = new Date().toISOString();
  return [
    {
      symbol: 'SOL',
      name: 'Solana',
      sentimentScore: 72,
      sentiment: 'very_bullish',
      mentions24h: 48_320,
      mentionChange: 18.4,
      topSources: [
        { platform: 'X', count: 28_100 },
        { platform: 'Reddit', count: 12_450 },
        { platform: 'Discord', count: 7_770 },
      ],
      trendingTopics: ['Firedancer', 'TPS record', 'ETF speculation', 'DePIN growth'],
      priceCorrelation: 0.82,
      lastUpdated: now,
    },
    {
      symbol: 'JUP',
      name: 'Jupiter',
      sentimentScore: 58,
      sentiment: 'bullish',
      mentions24h: 15_890,
      mentionChange: 32.1,
      topSources: [
        { platform: 'X', count: 9_200 },
        { platform: 'Discord', count: 4_150 },
        { platform: 'Reddit', count: 2_540 },
      ],
      trendingTopics: ['Perpetuals launch', 'JUP staking', 'LFG launchpad'],
      priceCorrelation: 0.71,
      lastUpdated: now,
    },
    {
      symbol: 'BONK',
      name: 'Bonk',
      sentimentScore: 35,
      sentiment: 'bullish',
      mentions24h: 22_740,
      mentionChange: -8.3,
      topSources: [
        { platform: 'X', count: 16_500 },
        { platform: 'Reddit', count: 4_090 },
        { platform: 'Discord', count: 2_150 },
      ],
      trendingTopics: ['BONKbot volume', 'burn mechanism', 'meme season'],
      priceCorrelation: 0.45,
      lastUpdated: now,
    },
    {
      symbol: 'WIF',
      name: 'dogwifhat',
      sentimentScore: -15,
      sentiment: 'neutral',
      mentions24h: 18_200,
      mentionChange: -22.7,
      topSources: [
        { platform: 'X', count: 13_800 },
        { platform: 'Reddit', count: 2_900 },
        { platform: 'Discord', count: 1_500 },
      ],
      trendingTopics: ['profit taking', 'whale dumps', 'exchange listings'],
      priceCorrelation: 0.38,
      lastUpdated: now,
    },
    {
      symbol: 'PYTH',
      name: 'Pyth Network',
      sentimentScore: 44,
      sentiment: 'bullish',
      mentions24h: 8_650,
      mentionChange: 12.5,
      topSources: [
        { platform: 'X', count: 4_800 },
        { platform: 'Discord', count: 2_350 },
        { platform: 'Reddit', count: 1_500 },
      ],
      trendingTopics: ['oracle expansion', 'new data feeds', 'cross-chain'],
      priceCorrelation: 0.63,
      lastUpdated: now,
    },
    {
      symbol: 'RAY',
      name: 'Raydium',
      sentimentScore: 25,
      sentiment: 'bullish',
      mentions24h: 6_420,
      mentionChange: 5.8,
      topSources: [
        { platform: 'X', count: 3_100 },
        { platform: 'Discord', count: 2_020 },
        { platform: 'Reddit', count: 1_300 },
      ],
      trendingTopics: ['CLMM pools', 'AcceleRaytor', 'TVL growth'],
      priceCorrelation: 0.55,
      lastUpdated: now,
    },
    {
      symbol: 'JTO',
      name: 'Jito',
      sentimentScore: -42,
      sentiment: 'bearish',
      mentions24h: 9_870,
      mentionChange: -14.2,
      topSources: [
        { platform: 'X', count: 5_600 },
        { platform: 'Discord', count: 2_870 },
        { platform: 'Reddit', count: 1_400 },
      ],
      trendingTopics: ['token unlock concerns', 'MEV debate', 'staking rewards'],
      priceCorrelation: 0.29,
      lastUpdated: now,
    },
    {
      symbol: 'ORCA',
      name: 'Orca',
      sentimentScore: 8,
      sentiment: 'neutral',
      mentions24h: 3_910,
      mentionChange: 2.1,
      topSources: [
        { platform: 'X', count: 1_800 },
        { platform: 'Discord', count: 1_310 },
        { platform: 'Reddit', count: 800 },
      ],
      trendingTopics: ['whirlpools', 'concentrated liquidity', 'fee tier update'],
      priceCorrelation: 0.41,
      lastUpdated: now,
    },
  ];
}

export async function GET() {
  try {
    const tokens = getDemoTokens();

    const avgScore =
      Math.round(
        tokens.reduce((sum, t) => sum + t.sentimentScore, 0) / tokens.length,
      );

    const overallMarketSentiment = {
      score: avgScore,
      label: getSentimentLabel(avgScore),
    };

    // Fear & Greed: map average sentiment (-100..100) to 0..100 scale
    const fearGreedValue = Math.round(((avgScore + 100) / 200) * 100);
    const clampedFearGreed = Math.max(0, Math.min(100, fearGreedValue));

    const fearGreedIndex = {
      value: clampedFearGreed,
      label: getFearGreedLabel(clampedFearGreed),
    };

    return NextResponse.json({
      tokens,
      overallMarketSentiment,
      fearGreedIndex,
      ts: Date.now(),
    } satisfies SentimentData);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch sentiment data' },
      { status: 500 },
    );
  }
}
