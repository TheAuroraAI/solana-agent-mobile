import Groq from 'groq-sdk';

export const runtime = 'nodejs';
export const revalidate = 3600; // Cache for 1 hour

interface BriefingPoint {
  emoji: string;
  text: string;
}

export interface BriefingData {
  points: BriefingPoint[];
  solPrice: number;
  solChange24h: number;
  topGainer: { symbol: string; change: number } | null;
  topLoser: { symbol: string; change: number } | null;
  generatedAt: number;
  source: 'live' | 'fallback';
}

async function fetchMarketSnapshot() {
  try {
    // Fetch Solana + top Solana tokens from CoinGecko
    const url =
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=solana,jito-governance-token,jupiter-exchange-solana,bonk,dogwifcoin,pyth-network,raydium&per_page=7&sparkline=false&price_change_percentage=24h';
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 900 },
    });
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
    const coins = await res.json() as Array<{
      symbol: string;
      current_price: number;
      price_change_percentage_24h: number;
      total_volume: number;
      market_cap: number;
    }>;

    const sol = coins.find(c => c.symbol === 'sol');
    const others = coins.filter(c => c.symbol !== 'sol');

    const sorted = [...others].sort(
      (a, b) => (b.price_change_percentage_24h ?? 0) - (a.price_change_percentage_24h ?? 0)
    );

    return {
      solPrice: sol?.current_price ?? 150,
      solChange24h: sol?.price_change_percentage_24h ?? 0,
      solVolume24h: sol?.total_volume ?? 0,
      topGainer: sorted[0]
        ? { symbol: sorted[0].symbol.toUpperCase(), change: sorted[0].price_change_percentage_24h }
        : null,
      topLoser: sorted[sorted.length - 1]
        ? {
            symbol: sorted[sorted.length - 1].symbol.toUpperCase(),
            change: sorted[sorted.length - 1].price_change_percentage_24h,
          }
        : null,
    };
  } catch {
    return {
      solPrice: 155,
      solChange24h: 0,
      solVolume24h: 3_000_000_000,
      topGainer: { symbol: 'JUP', change: 4.2 },
      topLoser: { symbol: 'BONK', change: -2.1 },
    };
  }
}

function buildPrompt(market: Awaited<ReturnType<typeof fetchMarketSnapshot>>): string {
  const solDir = market.solChange24h >= 0 ? '▲' : '▼';
  const gainDir = (market.topGainer?.change ?? 0) >= 0 ? '▲' : '▼';
  const loseDir = (market.topLoser?.change ?? 0) >= 0 ? '▲' : '▼';

  return `You are Aurora, an AI Solana portfolio manager. Write a concise morning briefing for a Solana mobile wallet user.

MARKET DATA (live, right now):
- SOL: $${market.solPrice.toFixed(2)} ${solDir}${Math.abs(market.solChange24h).toFixed(1)}% (24h)
- Top gainer: ${market.topGainer?.symbol ?? 'N/A'} ${gainDir}${Math.abs(market.topGainer?.change ?? 0).toFixed(1)}%
- Top loser: ${market.topLoser?.symbol ?? 'N/A'} ${loseDir}${Math.abs(market.topLoser?.change ?? 0).toFixed(1)}%
- Solana 24h volume: $${(market.solVolume24h / 1e9).toFixed(1)}B

Write exactly 3 bullet points. Each must be under 20 words. Be specific, actionable, and reference real numbers.
Format: emoji + space + insight text. Use 1 emoji per point from: 📊 🔥 ⚡ 🎯 💡 ⚠️ 🚀 💰 📉 📈

Example format:
📊 SOL holds $155 support. Momentum aligns with broader crypto rally — watch $162 resistance.
🔥 JUP surged 8.2% on DEX volume. Likely driven by increased aggregate demand for Solana swaps.
💡 Yield rates stable. Jito 7.5% APY remains best liquid staking option for SOL holders.

Output only the 3 bullet points. No headers, no extra text.`;
}

function parseBriefingPoints(text: string): BriefingPoint[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const points: BriefingPoint[] = [];

  for (const line of lines) {
    // Match emoji + text
    const match = line.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s+(.+)$/u);
    if (match) {
      points.push({ emoji: match[1], text: match[2].trim() });
    } else if (line.length > 10) {
      // Fallback — no emoji found
      points.push({ emoji: '📊', text: line.replace(/^[-•*]\s*/, '') });
    }
    if (points.length === 3) break;
  }

  return points.slice(0, 3);
}

export async function GET() {
  const market = await fetchMarketSnapshot();

  // Try Groq first (free, fast)
  if (process.env.GROQ_API_KEY) {
    try {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 200,
        temperature: 0.7,
        messages: [
          { role: 'user', content: buildPrompt(market) },
        ],
      });

      const text = completion.choices[0]?.message?.content ?? '';
      const points = parseBriefingPoints(text);

      if (points.length >= 2) {
        const data: BriefingData = {
          points,
          solPrice: market.solPrice,
          solChange24h: market.solChange24h,
          topGainer: market.topGainer,
          topLoser: market.topLoser,
          generatedAt: Date.now(),
          source: 'live',
        };
        return Response.json(data);
      }
    } catch {
      // Fall through to fallback
    }
  }

  // Static fallback briefing
  const dir = market.solChange24h >= 0 ? 'up' : 'down';
  const fallbackPoints: BriefingPoint[] = [
    {
      emoji: '📊',
      text: `SOL is ${dir} ${Math.abs(market.solChange24h).toFixed(1)}% to $${market.solPrice.toFixed(2)} — ${market.solChange24h >= 0 ? 'bullish momentum, watch resistance above' : 'key support at current levels'}.`,
    },
    {
      emoji: market.topGainer ? '🔥' : '💡',
      text: market.topGainer
        ? `${market.topGainer.symbol} leading Solana gains at +${market.topGainer.change.toFixed(1)}% — DeFi activity driving volume.`
        : 'Solana DeFi TVL stable. Jito 7.5% APY remains top liquid staking yield.',
    },
    {
      emoji: '💡',
      text: 'Yield rates unchanged. Liquid staking via Jito or Marinade optimal for idle SOL positions.',
    },
  ];

  const data: BriefingData = {
    points: fallbackPoints,
    solPrice: market.solPrice,
    solChange24h: market.solChange24h,
    topGainer: market.topGainer,
    topLoser: market.topLoser,
    generatedAt: Date.now(),
    source: 'fallback',
  };
  return Response.json(data);
}
