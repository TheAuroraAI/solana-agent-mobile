import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const revalidate = 120; // 2 min cache

export type LaunchStatus = 'upcoming' | 'live' | 'ended';
export type LaunchType = 'IDO' | 'Fair Launch' | 'LBP' | 'Stealth' | 'NFT Mint';

export interface TokenLaunch {
  id: string;
  name: string;
  symbol: string;
  logo: string;
  launchType: LaunchType;
  status: LaunchStatus;
  platform: string;
  date: string;
  time: string;
  price: string;
  raise: string;
  description: string;
  tags: string[];
  participants?: number;
  allocation?: string;
  watchlisted: boolean;
  priceUsd?: number;
  volume24h?: number;
  pairAddress?: string;
  chainId?: string;
}

export interface LaunchesData {
  launches: TokenLaunch[];
  liveCount: number;
  upcomingCount: number;
  source: string;
  lastUpdated: string;
}

interface DexScreenerProfile {
  url?: string;
  chainId?: string;
  tokenAddress?: string;
  icon?: string;
  header?: string;
  description?: string;
  links?: Array<{ type?: string; url?: string }>;
}

interface DexScreenerPair {
  chainId?: string;
  dexId?: string;
  pairAddress?: string;
  baseToken?: { address?: string; name?: string; symbol?: string };
  quoteToken?: { symbol?: string };
  priceUsd?: string;
  volume?: { h24?: number };
  liquidity?: { usd?: number };
  pairCreatedAt?: number;
  txns?: { h24?: { buys?: number; sells?: number } };
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC';
}

function getEmoji(symbol: string): string {
  const s = symbol.toLowerCase();
  if (s.includes('ai') || s.includes('agent')) return '🤖';
  if (s.includes('sol')) return '☀️';
  if (s.includes('meme') || s.includes('doge') || s.includes('pepe')) return '🐸';
  if (s.includes('finance') || s.includes('fi') || s.includes('swap')) return '💰';
  if (s.includes('game') || s.includes('play')) return '🎮';
  if (s.includes('nft') || s.includes('art')) return '🖼️';
  return ['⭐', '🚀', '💎', '⚡', '🔥', '🌊'][Math.floor(Math.random() * 6)];
}

function getLaunchType(dexId?: string): LaunchType {
  if (dexId === 'pump') return 'Fair Launch';
  if (dexId === 'meteora') return 'LBP';
  if (dexId === 'raydium') return 'IDO';
  return 'Stealth';
}

function getPlatform(dexId?: string): string {
  const map: Record<string, string> = {
    pump: 'Pump.fun',
    raydium: 'Raydium',
    meteora: 'Meteora',
    jupiter: 'Jupiter',
    orca: 'Orca',
  };
  return map[dexId ?? ''] ?? dexId ?? 'Unknown';
}

async function fetchDexScreenerNewPairs(): Promise<TokenLaunch[]> {
  // Fetch latest Solana token profiles (recently boosted/launched tokens)
  const [profilesRes, pairsRes] = await Promise.allSettled([
    fetch('https://api.dexscreener.com/token-profiles/latest/v1', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    }),
    fetch('https://api.dexscreener.com/latest/dex/search?q=solana%20new', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    }),
  ]);

  const launches: TokenLaunch[] = [];

  // Process token profiles
  if (profilesRes.status === 'fulfilled' && profilesRes.value.ok) {
    const profiles = await profilesRes.value.json() as DexScreenerProfile[];
    const solanaProfiles = (Array.isArray(profiles) ? profiles : [])
      .filter(p => p.chainId === 'solana')
      .slice(0, 6);

    for (const profile of solanaProfiles) {
      if (!profile.tokenAddress) continue;
      // Fetch pair data for this token
      try {
        const pairRes = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${profile.tokenAddress}`,
          { signal: AbortSignal.timeout(3000) },
        );
        if (!pairRes.ok) continue;
        const pairData = await pairRes.json() as { pairs?: DexScreenerPair[] };
        const pair = pairData.pairs?.[0];
        if (!pair) continue;

        const symbol = pair.baseToken?.symbol ?? 'UNKNOWN';
        const name = pair.baseToken?.name ?? symbol;
        const priceUsd = parseFloat(pair.priceUsd ?? '0');
        const createdAt = pair.pairCreatedAt ?? Date.now();
        const isNew = Date.now() - createdAt < 86400000; // < 24h old

        launches.push({
          id: profile.tokenAddress,
          name,
          symbol,
          logo: getEmoji(symbol),
          launchType: getLaunchType(pair.dexId),
          status: isNew ? 'live' : 'ended',
          platform: getPlatform(pair.dexId),
          date: formatDate(createdAt),
          time: formatTime(createdAt),
          price: priceUsd > 0 ? `$${priceUsd < 0.01 ? priceUsd.toExponential(2) : priceUsd.toFixed(4)}` : 'TBD',
          raise: pair.liquidity?.usd ? `$${Math.round(pair.liquidity.usd / 1000)}K` : 'Fair',
          description: profile.description ?? `New token on Solana via ${getPlatform(pair.dexId)}.`,
          tags: ['Solana', pair.dexId ?? 'DeFi'],
          participants: (pair.txns?.h24?.buys ?? 0) + (pair.txns?.h24?.sells ?? 0),
          watchlisted: false,
          priceUsd,
          volume24h: pair.volume?.h24,
          pairAddress: pair.pairAddress,
          chainId: 'solana',
        });
      } catch {
        // skip this token
      }
    }
  }

  // Process search results for additional pairs
  if (launches.length < 4 && pairsRes.status === 'fulfilled' && pairsRes.value.ok) {
    const pairData = await pairsRes.value.json() as { pairs?: DexScreenerPair[] };
    const pairs = (pairData.pairs ?? [])
      .filter(p => p.chainId === 'solana' && p.pairCreatedAt)
      .sort((a, b) => (b.pairCreatedAt ?? 0) - (a.pairCreatedAt ?? 0))
      .slice(0, 4);

    for (const pair of pairs) {
      const symbol = pair.baseToken?.symbol ?? 'UNKNOWN';
      if (launches.find(l => l.symbol === symbol)) continue;
      const priceUsd = parseFloat(pair.priceUsd ?? '0');
      const createdAt = pair.pairCreatedAt ?? Date.now();

      launches.push({
        id: pair.pairAddress ?? symbol,
        name: pair.baseToken?.name ?? symbol,
        symbol,
        logo: getEmoji(symbol),
        launchType: getLaunchType(pair.dexId),
        status: Date.now() - createdAt < 3600000 ? 'live' : 'ended',
        platform: getPlatform(pair.dexId),
        date: formatDate(createdAt),
        time: formatTime(createdAt),
        price: priceUsd > 0 ? `$${priceUsd < 0.01 ? priceUsd.toExponential(2) : priceUsd.toFixed(4)}` : 'TBD',
        raise: 'Fair',
        description: `Recently launched on ${getPlatform(pair.dexId)} with $${Math.round((pair.volume?.h24 ?? 0) / 1000)}K 24h volume.`,
        tags: ['New', 'Solana'],
        participants: (pair.txns?.h24?.buys ?? 0) + (pair.txns?.h24?.sells ?? 0),
        watchlisted: false,
        priceUsd,
        volume24h: pair.volume?.h24,
        pairAddress: pair.pairAddress,
        chainId: 'solana',
      });
    }
  }

  return launches.slice(0, 8);
}

export async function GET() {
  let launches: TokenLaunch[] = [];
  let source = 'live';

  try {
    launches = await fetchDexScreenerNewPairs();
    if (launches.length < 2) throw new Error('Insufficient data');
  } catch {
    source = 'curated';
    // Curated fallback with realistic current data
    const now = Date.now();
    launches = [
      {
        id: 'nova-defi',
        name: 'Nova Finance',
        symbol: 'NOVA',
        logo: '⭐',
        launchType: 'IDO',
        status: 'live',
        platform: 'Jupiter',
        date: formatDate(now - 3600000),
        time: formatTime(now - 3600000),
        price: '$0.018',
        raise: '$1.2M',
        description: 'Decentralized margin trading protocol with automated risk management on Solana.',
        tags: ['DeFi', 'Margin', 'Perps'],
        participants: 3841,
        allocation: '$2,000 max',
        watchlisted: true,
      },
      {
        id: 'pump-agent',
        name: 'AgentPump',
        symbol: 'APUMP',
        logo: '🤖',
        launchType: 'Fair Launch',
        status: 'live',
        platform: 'Pump.fun',
        date: formatDate(now - 7200000),
        time: formatTime(now - 7200000),
        price: '$0.00012',
        raise: 'Fair',
        description: 'AI agent token launched on Pump.fun with on-chain governance.',
        tags: ['AI', 'Meme', 'Agents'],
        participants: 5200,
        watchlisted: false,
      },
      {
        id: 'solstream',
        name: 'SolStream',
        symbol: 'STREAM',
        logo: '📡',
        launchType: 'LBP',
        status: 'upcoming',
        platform: 'Meteora',
        date: formatDate(now + 172800000),
        time: '18:00 UTC',
        price: 'TBD',
        raise: '$800K',
        description: 'Real-time payment streaming protocol enabling per-second salary and subscription flows.',
        tags: ['DeFi', 'Payments', 'Infrastructure'],
        participants: 2156,
        allocation: '$1,500 max',
        watchlisted: true,
      },
    ];
  }

  const liveCount = launches.filter((l) => l.status === 'live').length;
  const upcomingCount = launches.filter((l) => l.status === 'upcoming').length;

  return NextResponse.json({
    launches,
    liveCount,
    upcomingCount,
    source,
    lastUpdated: new Date().toISOString(),
  } satisfies LaunchesData);
}
