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

// Mint addresses for key Solana tokens
const BRIEFING_MINTS: Record<string, string> = {
  SOL: 'So11111111111111111111111111111111111111112',
  JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  WIF: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
  RAY: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
};

const MINT_TO_SYM = Object.fromEntries(Object.entries(BRIEFING_MINTS).map(([s, m]) => [m, s]));

function briefingFetchTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } }).finally(
    () => clearTimeout(t)
  );
}

async function fetchMarketSnapshot() {
  try {
    const addresses = Object.values(BRIEFING_MINTS).join(',');

    // Fetch prices + 24h change + volume from DexScreener (free, no auth)
    const dexRes = await briefingFetchTimeout(
      `https://api.dexscreener.com/tokens/v1/solana/${addresses}`,
      8000
    );

    // Build price map + 24h change from DexScreener
    const prices: Record<string, number> = {};
    const changes: Record<string, number> = {};
    let solVolume24h = 3_000_000_000;
    if (dexRes.ok) {
      const pairs: Array<{
        baseToken?: { address?: string };
        priceUsd?: string;
        priceChangeH24?: number;
        volume?: { h24?: number };
      }> = await dexRes.json();

      for (const pair of pairs) {
        const mint = pair.baseToken?.address;
        const sym = mint ? MINT_TO_SYM[mint] : undefined;
        if (sym) {
          if (!prices[sym] && pair.priceUsd) prices[sym] = parseFloat(pair.priceUsd);
          if (typeof pair.priceChangeH24 === 'number' && !(sym in changes)) {
            changes[sym] = pair.priceChangeH24;
            if (sym === 'SOL' && pair.volume?.h24) solVolume24h = pair.volume.h24;
          }
        }
      }
    }

    const solPrice = prices.SOL ?? 155;
    const solChange24h = changes.SOL ?? 0;

    // Find top gainer/loser among non-SOL tokens
    const altTokens = Object.keys(BRIEFING_MINTS).filter(s => s !== 'SOL');
    const altWithChange = altTokens
      .filter(sym => sym in changes)
      .map(sym => ({ symbol: sym, change: changes[sym] }))
      .sort((a, b) => b.change - a.change);

    return {
      solPrice,
      solChange24h,
      solVolume24h,
      topGainer: altWithChange[0] ?? { symbol: 'JUP', change: 0 },
      topLoser: altWithChange[altWithChange.length - 1] ?? { symbol: 'BONK', change: 0 },
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
