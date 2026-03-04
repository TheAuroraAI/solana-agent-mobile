import { NextRequest } from 'next/server';

function formatUsd(v: number) {
  if (v >= 10000) return '$' + (v / 1000).toFixed(1) + 'K';
  if (v >= 100) return '$' + v.toFixed(0);
  return '$' + v.toFixed(2);
}

function truncateAddr(addr: string) {
  if (!addr || addr.length < 12) return addr || '—';
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

function healthColor(score: number) {
  if (score >= 80) return '#34d399';
  if (score >= 60) return '#a78bfa';
  if (score >= 40) return '#facc15';
  return '#fb923c';
}

function ring(score: number, cx: number, cy: number, r = 38) {
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = healthColor(score);
  return `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#1f2937" stroke-width="7"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="7"
      stroke-dasharray="${dash.toFixed(1)} ${circ.toFixed(1)}"
      stroke-linecap="round"
      transform="rotate(-90 ${cx} ${cy})"/>
    <text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="18" font-weight="700" fill="${color}" font-family="system-ui">${score}</text>
    <text x="${cx}" y="${cy + 22}" text-anchor="middle" font-size="11" fill="#9ca3af" font-family="system-ui">health</text>
  `;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const wallet = sp.get('wallet') || '';
  const total = parseFloat(sp.get('total') || '0');
  const solBalance = parseFloat(sp.get('sol') || '0');
  const pnlUsd = parseFloat(sp.get('pnlUsd') || '0');
  const pnlPct = parseFloat(sp.get('pnlPct') || '0');
  const hasPnl = sp.get('hasPnl') === '1';
  const healthScore = Math.min(100, Math.max(0, parseInt(sp.get('health') || '50', 10)));
  const healthLabel = sp.get('hlabel') || 'Fair';
  // tokens: "SOL:3.5,USDC:100,JUP:200" (symbol:usdValue pairs)
  const tokensParam = sp.get('tokens') || '';
  const tokens: Array<{ symbol: string; usd: number }> = tokensParam
    ? tokensParam.split(',').slice(0, 4).map(t => {
        const [sym, usdStr] = t.split(':');
        return { symbol: sym, usd: parseFloat(usdStr || '0') };
      }).filter(t => t.symbol && t.usd > 0)
    : [];

  const W = 800;
  const H = 420;
  const hColor = healthColor(healthScore);
  const pnlColor = pnlUsd >= 0 ? '#34d399' : '#f87171';
  const pnlSign = pnlUsd >= 0 ? '+' : '';
  const pnlPctSign = pnlPct >= 0 ? '+' : '';
  const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Build token rows (max 4)
  const allTokens = [
    { symbol: 'SOL', usd: solBalance * total / (total || 1) },
    ...tokens,
  ].filter(t => t.usd > 0 || t.symbol === 'SOL');

  const maxUsd = Math.max(...allTokens.map(t => t.usd), 1);
  const tokenRows = allTokens.slice(0, 4).map((t, i) => {
    const barW = Math.max(4, (t.usd / maxUsd) * 280);
    const y = 235 + i * 36;
    const colors = ['#8b5cf6', '#34d399', '#facc15', '#60a5fa'];
    return `
      <text x="40" y="${y}" font-size="13" fill="#d1d5db" font-family="system-ui" font-weight="600">${t.symbol}</text>
      <rect x="100" y="${y - 12}" width="${barW.toFixed(1)}" height="14" rx="4" fill="${colors[i % colors.length]}33"/>
      <rect x="100" y="${y - 12}" width="${(barW * 0.7).toFixed(1)}" height="14" rx="4" fill="${colors[i % colors.length]}66"/>
      <text x="${100 + barW + 8}" y="${y}" font-size="12" fill="#9ca3af" font-family="system-ui">${formatUsd(t.usd)}</text>
    `;
  }).join('');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="${W}" y2="${H}" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0a0f1e"/>
      <stop offset="50%" stop-color="#110d24"/>
      <stop offset="100%" stop-color="#0f0a1e"/>
    </linearGradient>
    <radialGradient id="glow" cx="30%" cy="20%" r="60%" gradientUnits="objectBoundingBox">
      <stop offset="0%" stop-color="#7c3aed" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#7c3aed" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="pnlGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${pnlColor}" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="${pnlColor}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="url(#bg)" rx="20"/>
  <rect width="${W}" height="${H}" fill="url(#glow)" rx="20"/>

  <!-- Border -->
  <rect width="${W}" height="${H}" fill="none" stroke="rgba(139,92,246,0.25)" stroke-width="1.5" rx="20"/>

  <!-- Aurora header -->
  <text x="40" y="50" font-size="20" font-weight="700" fill="#a78bfa" font-family="system-ui">✦ Aurora Agent</text>
  <text x="40" y="72" font-size="13" fill="#4b5563" font-family="system-ui">Solana Portfolio Report · ${date}</text>

  <!-- Divider -->
  <line x1="40" y1="90" x2="${W - 40}" y2="90" stroke="rgba(255,255,255,0.07)" stroke-width="1"/>

  <!-- Total balance -->
  <text x="40" y="155" font-size="52" font-weight="800" fill="#ffffff" font-family="system-ui">${formatUsd(total)}</text>
  <text x="40" y="175" font-size="14" fill="#6b7280" font-family="system-ui">Total Portfolio Value</text>

  ${hasPnl ? `
  <!-- P&L badge -->
  <rect x="40" y="185" width="240" height="28" rx="8" fill="url(#pnlGrad)"/>
  <text x="52" y="204" font-size="14" fill="${pnlColor}" font-family="system-ui" font-weight="600">
    ${pnlSign}${formatUsd(pnlUsd)} (${pnlPctSign}${pnlPct.toFixed(2)}%) 24h
  </text>
  ` : ''}

  <!-- Holdings header -->
  <text x="40" y="${hasPnl ? 230 : 210}" font-size="11" fill="#4b5563" font-family="system-ui" font-weight="700" letter-spacing="1">TOP HOLDINGS</text>

  <!-- Token rows -->
  ${hasPnl ? tokenRows : allTokens.slice(0, 4).map((t, i) => {
    const barW = Math.max(4, (t.usd / maxUsd) * 280);
    const y = 215 + i * 36;
    const colors = ['#8b5cf6', '#34d399', '#facc15', '#60a5fa'];
    return `
      <text x="40" y="${y}" font-size="13" fill="#d1d5db" font-family="system-ui" font-weight="600">${t.symbol}</text>
      <rect x="100" y="${y - 12}" width="${barW.toFixed(1)}" height="14" rx="4" fill="${colors[i % colors.length]}33"/>
      <rect x="100" y="${y - 12}" width="${(barW * 0.7).toFixed(1)}" height="14" rx="4" fill="${colors[i % colors.length]}66"/>
      <text x="${100 + barW + 8}" y="${y}" font-size="12" fill="#9ca3af" font-family="system-ui">${formatUsd(t.usd)}</text>
    `;
  }).join('')}

  <!-- Health score ring -->
  ${ring(healthScore, W - 110, 190)}
  <text x="${W - 110}" y="${190 + 56}" text-anchor="middle" font-size="11" fill="${hColor}" font-family="system-ui" font-weight="600">${healthLabel}</text>

  <!-- Footer divider -->
  <line x1="40" y1="${H - 44}" x2="${W - 40}" y2="${H - 44}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>

  <!-- Footer -->
  <text x="40" y="${H - 18}" font-size="12" fill="#374151" font-family="system-ui">${truncateAddr(wallet)} · solana-agent-mobile.vercel.app</text>
  <text x="${W - 40}" y="${H - 18}" text-anchor="end" font-size="12" fill="#6d28d9" font-family="system-ui" font-weight="700">Made with Aurora ✦</text>
</svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-store',
    },
  });
}
