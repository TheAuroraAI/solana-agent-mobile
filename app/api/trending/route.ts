import { NextResponse } from 'next/server';

export const revalidate = 120;

export interface TrendingToken {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number;
  total_volume: number;
  market_cap: number;
  market_cap_rank: number | null;
}

interface Tab {
  label: string;
  tokens: TrendingToken[];
}

export interface TrendingData {
  tabs: Record<string, Tab>;
  source: string;
  ts: number;
}

// Curated list of top verified Solana tokens with known logos
const SOLANA_TOKENS = [
  { id: 'solana', address: 'So11111111111111111111111111111111111111112', symbol: 'SOL', name: 'Solana', image: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png' },
  { id: 'usd-coin', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', name: 'USD Coin', image: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png' },
  { id: 'jupiter-exchange-solana', address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', symbol: 'JUP', name: 'Jupiter', image: 'https://static.jup.ag/jup/icon.png' },
  { id: 'bonk', address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', symbol: 'BONK', name: 'Bonk', image: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263/logo.png' },
  { id: 'dogwifcoin', address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', symbol: 'WIF', name: 'dogwifhat', image: 'https://bafkreibk3covs5ltyqxa272uodhculbzd2udsdeticwwv5ka26rkevdxv4.ipfs.nftstorage.link/' },
  { id: 'pyth-network', address: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3', symbol: 'PYTH', name: 'Pyth Network', image: 'https://pyth.network/token.svg' },
  { id: 'jito-staked-sol', address: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn', symbol: 'jitoSOL', name: 'Jito Staked SOL', image: 'https://storage.googleapis.com/token-metadata/JitoSOL-256.png' },
  { id: 'render-token', address: 'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof', symbol: 'RENDER', name: 'Render', image: 'https://render.x.foundation/logo.png' },
  { id: 'jito-governance', address: 'jtojtomepa8berK3RoB2g89rJGp8mH2e4oKo4KDQgAq', symbol: 'JTO', name: 'Jito', image: 'https://storage.googleapis.com/token-metadata/Jito-256.png' },
  { id: 'helium', address: 'hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux', symbol: 'HNT', name: 'Helium', image: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux/logo.png' },
  { id: 'raydium', address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R', symbol: 'RAY', name: 'Raydium', image: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R/logo.png' },
  { id: 'orca', address: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE', symbol: 'ORCA', name: 'Orca', image: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE/logo.png' },
  { id: 'marinade', address: 'MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey', symbol: 'MNDE', name: 'Marinade', image: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey/logo.png' },
  { id: 'parcl', address: 'GDfnEsia2WLAW5t8yx2X5j2mkfA74i5kwGdDuZHt7XmG', symbol: 'PRCL', name: 'Parcl', image: 'https://parcl.co/logo.png' },
  { id: 'drift-protocol', address: 'DriFtupJYLTosbwoN8koMbEYSx54aFAVLddWsbksjwg7', symbol: 'DRIFT', name: 'Drift', image: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/DriFtupJYLTosbwoN8koMbEYSx54aFAVLddWsbksjwg7/logo.png' },
];

interface DexScreenerPair {
  priceUsd?: string;
  priceChange?: { h24?: number };
  volume?: { h24?: number };
  fdv?: number;
  marketCap?: number;
  baseToken: { address: string; symbol: string; name: string };
}

async function fetchDexScreenerData(addresses: string[]): Promise<Map<string, DexScreenerPair>> {
  const result = new Map<string, DexScreenerPair>();
  // DexScreener allows up to 30 addresses per request
  const chunks = [];
  for (let i = 0; i < addresses.length; i += 30) {
    chunks.push(addresses.slice(i, i + 30));
  }

  await Promise.all(chunks.map(async (chunk) => {
    try {
      const res = await fetch(
        `https://api.dexscreener.com/tokens/v1/solana/${chunk.join(',')}`,
        { next: { revalidate: 120 } }
      );
      if (!res.ok) return;
      const data = await res.json() as DexScreenerPair[];
      for (const pair of data) {
        const addr = pair.baseToken?.address;
        if (addr && !result.has(addr)) {
          result.set(addr, pair);
        }
      }
    } catch {
      // ignore chunk failure
    }
  }));

  return result;
}

export async function GET() {
  try {
    const addresses = SOLANA_TOKENS.map(t => t.address);
    const dexData = await fetchDexScreenerData(addresses);

    const tokens: TrendingToken[] = SOLANA_TOKENS
      .map((token, idx): TrendingToken | null => {
        const pair = dexData.get(token.address);
        const price = pair?.priceUsd ? parseFloat(pair.priceUsd) : null;
        if (price === null) return null;
        return {
          id: token.id,
          symbol: token.symbol,
          name: token.name,
          image: token.image,
          current_price: price,
          price_change_percentage_24h: pair?.priceChange?.h24 ?? 0,
          total_volume: pair?.volume?.h24 ?? 0,
          market_cap: pair?.marketCap ?? pair?.fdv ?? 0,
          market_cap_rank: idx + 1,
        };
      })
      .filter((t): t is TrendingToken => t !== null);

    if (tokens.length === 0) throw new Error('No token data from DexScreener');

    const gainers: TrendingToken[] = [...tokens]
      .sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h)
      .slice(0, 15);

    const losers: TrendingToken[] = [...tokens]
      .sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h)
      .slice(0, 15);

    const volume: TrendingToken[] = [...tokens]
      .sort((a, b) => b.total_volume - a.total_volume)
      .slice(0, 15);

    const mcap: TrendingToken[] = [...tokens]
      .sort((a, b) => b.market_cap - a.market_cap)
      .slice(0, 15);

    return NextResponse.json({
      tabs: {
        gainers: { label: 'Top Gainers', tokens: gainers },
        losers: { label: 'Top Losers', tokens: losers },
        volume: { label: 'High Volume', tokens: volume },
        mcap: { label: 'Large Cap', tokens: mcap },
      },
      source: 'dexscreener',
      ts: Date.now(),
    } satisfies TrendingData);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch' },
      { status: 502 }
    );
  }
}
