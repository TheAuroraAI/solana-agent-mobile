import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const revalidate = 300; // 5 min cache

export type NewsCategory = 'Protocol' | 'Market' | 'DeFi' | 'NFT' | 'Gaming' | 'Regulation' | 'Dev';

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  category: NewsCategory;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  timeAgo: string;
  readTime: string;
  featured: boolean;
  tags: string[];
  imageEmoji: string;
  url?: string;
  publishedAt?: string;
}

export interface NewsData {
  articles: NewsArticle[];
  trending: string[];
  source: string;
  lastUpdated: string;
}

function getTimeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function categorize(title: string, body: string): NewsCategory {
  const text = (title + ' ' + body).toLowerCase();
  if (text.includes('nft') || text.includes('collectible') || text.includes('token gating')) return 'NFT';
  if (text.includes('game') || text.includes('gaming') || text.includes('play')) return 'Gaming';
  if (text.includes('sec') || text.includes('regulation') || text.includes('law') || text.includes('etf')) return 'Regulation';
  if (text.includes('sdk') || text.includes('developer') || text.includes('program') || text.includes('smart contract')) return 'Dev';
  if (text.includes('swap') || text.includes('defi') || text.includes('liquidity') || text.includes('yield') || text.includes('staking')) return 'DeFi';
  if (text.includes('price') || text.includes('market') || text.includes('trading') || text.includes('volume')) return 'Market';
  return 'Protocol';
}

function guessSentiment(title: string): 'bullish' | 'bearish' | 'neutral' {
  const t = title.toLowerCase();
  const bullish = ['launch', 'surpass', 'record', 'growth', 'upgrade', 'partner', 'rise', 'gain', 'milestone', 'expan', 'hit', 'new high', 'breakthrough', 'integrat'];
  const bearish = ['hack', 'exploit', 'crash', 'drop', 'fall', 'warn', 'risk', 'concern', 'decline', 'los', 'scam', 'fraud', 'delay'];
  if (bullish.some(w => t.includes(w))) return 'bullish';
  if (bearish.some(w => t.includes(w))) return 'bearish';
  return 'neutral';
}

function getEmoji(cat: NewsCategory): string {
  const map: Record<NewsCategory, string> = {
    Protocol: '⚡', Market: '📊', DeFi: '🌊', NFT: '🖼️',
    Gaming: '🎮', Regulation: '⚖️', Dev: '🛠️',
  };
  return map[cat];
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

interface CryptoCompareArticle {
  id?: string;
  guid?: string;
  title?: string;
  body?: string;
  source?: string;
  published_on?: number;
  url?: string;
  tags?: string;
}

async function fetchCryptoCompareNews(): Promise<NewsArticle[]> {
  // Free tier — no API key needed for basic calls
  const url = 'https://min-api.cryptocompare.com/data/v2/news/?categories=Solana,SOL,BTC,ETH,DeFi&lang=EN&sortOrder=latest&limit=20';
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`CryptoCompare ${res.status}`);
  const json = await res.json() as { Data?: CryptoCompareArticle[] };
  const items = json.Data ?? [];
  if (!Array.isArray(items) || items.length === 0) throw new Error('Empty response');

  return items.slice(0, 12).map((item, i) => {
    const title = item.title ?? 'Solana Update';
    const body = item.body ?? '';
    const cat = categorize(title, body);
    const ts = item.published_on ?? Math.floor(Date.now() / 1000);
    const words = wordCount(body);
    const readMins = Math.max(2, Math.round(words / 200));
    return {
      id: item.id ?? item.guid ?? `article-${i}`,
      title,
      summary: body.slice(0, 200).replace(/\s+\S*$/, '') + '…',
      source: item.source ?? 'Crypto News',
      category: cat,
      sentiment: guessSentiment(title),
      timeAgo: getTimeAgo(ts),
      readTime: `${readMins} min read`,
      featured: i === 0,
      tags: (item.tags ?? '').split('|').slice(0, 4).map((t: string) => t.trim()).filter(Boolean),
      imageEmoji: getEmoji(cat),
      url: item.url,
      publishedAt: new Date(ts * 1000).toISOString(),
    };
  });
}

async function fetchCoinGeckoNews(): Promise<NewsArticle[]> {
  const url = 'https://api.coingecko.com/api/v3/news?category=general&per_page=10&page=1';
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const json = await res.json() as { data?: Array<{ id?: string; title?: string; description?: string; author?: string; published_at?: string; url?: string }> };
  const items = json.data ?? [];
  if (!Array.isArray(items) || items.length === 0) throw new Error('Empty');

  return items.slice(0, 10).map((item, i) => {
    const title = item.title ?? 'Crypto Update';
    const cat = categorize(title, item.description ?? '');
    const ts = item.published_at ? Math.floor(new Date(item.published_at).getTime() / 1000) : Math.floor(Date.now() / 1000);
    return {
      id: item.id ?? `cg-${i}`,
      title,
      summary: (item.description ?? '').slice(0, 200).replace(/\s+\S*$/, '') + '…',
      source: item.author ?? 'CoinGecko News',
      category: cat,
      sentiment: guessSentiment(title),
      timeAgo: getTimeAgo(ts),
      readTime: '3 min read',
      featured: i === 0,
      tags: [],
      imageEmoji: getEmoji(cat),
      url: item.url,
      publishedAt: new Date(ts * 1000).toISOString(),
    };
  });
}

// Curated fallback — realistic and Solana-focused
const FALLBACK_ARTICLES: NewsArticle[] = [
  {
    id: 'sol-ecosystem-growth',
    title: 'Solana Ecosystem Surpasses 5M Daily Active Addresses',
    summary: 'On-chain data shows Solana network activity reaching record levels as DeFi, gaming, and payments apps drive user growth.',
    source: 'MONOLITH Intel',
    category: 'Protocol',
    sentiment: 'bullish',
    timeAgo: '1h ago',
    readTime: '3 min read',
    featured: true,
    tags: ['Solana', 'Growth', 'DeFi'],
    imageEmoji: '⚡',
  },
  {
    id: 'jupiter-volume-record',
    title: 'Jupiter DEX Hits Record Monthly Volume',
    summary: 'Jupiter Exchange processes billions in swaps as Solana DeFi continues to attract liquidity from across the crypto ecosystem.',
    source: 'MONOLITH Daily',
    category: 'DeFi',
    sentiment: 'bullish',
    timeAgo: '3h ago',
    readTime: '2 min read',
    featured: false,
    tags: ['Jupiter', 'DEX', 'Volume'],
    imageEmoji: '🪐',
  },
];

export async function GET() {
  let articles: NewsArticle[] = [];
  let source = 'live';

  try {
    articles = await fetchCryptoCompareNews();
  } catch {
    try {
      articles = await fetchCoinGeckoNews();
      source = 'coingecko';
    } catch {
      articles = FALLBACK_ARTICLES;
      source = 'curated';
    }
  }

  // Extract trending topics from article tags/titles
  const tagFreq = new Map<string, number>();
  for (const a of articles) {
    for (const tag of a.tags) {
      tagFreq.set(tag, (tagFreq.get(tag) ?? 0) + 1);
    }
  }
  const trending = [...tagFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([tag]) => tag);

  const data: NewsData = {
    articles,
    trending: trending.length > 3 ? trending : ['SOL', 'DeFi', 'Jupiter', 'NFT', 'Staking'],
    source,
    lastUpdated: new Date().toISOString(),
  };

  return NextResponse.json(data);
}
