'use client';

import { useEffect, useState, useCallback } from 'react';
import { clsx } from 'clsx';

interface DataPoint {
  timestamp: number;
  totalUsd: number;
  solPrice: number;
}

function SparkLine({ points, isUp }: { points: DataPoint[]; isUp: boolean }) {
  if (points.length < 2) return null;

  const W = 340;
  const H = 80;
  const PAD = 8;

  const values = points.map(p => p.totalUsd);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const toX = (i: number) => PAD + (i / (points.length - 1)) * (W - 2 * PAD);
  const toY = (v: number) => H - PAD - ((v - minVal) / range) * (H - 2 * PAD);

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(p.totalUsd).toFixed(1)}`)
    .join(' ');

  const fillD = `${pathD} L${toX(points.length - 1).toFixed(1)},${H} L${toX(0).toFixed(1)},${H} Z`;

  const color = isUp ? '#10b981' : '#ef4444';
  const colorFade = isUp ? '#10b98133' : '#ef444433';

  // Tooltip state
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const getIdx = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    let closest = 0;
    let minDist = Infinity;
    points.forEach((_, i) => {
      const dist = Math.abs(toX(i) - x);
      if (dist < minDist) { minDist = dist; closest = i; }
    });
    return closest;
  };

  const hovered = hoverIdx !== null ? points[hoverIdx] : null;
  const hovX = hoverIdx !== null ? toX(hoverIdx) : 0;
  const hovY = hoverIdx !== null ? toY(points[hoverIdx].totalUsd) : 0;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-20"
        onMouseMove={e => setHoverIdx(getIdx(e))}
        onMouseLeave={() => setHoverIdx(null)}
        onTouchMove={e => {
          const touch = e.touches[0];
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((touch.clientX - rect.left) / rect.width) * W;
          let closest = 0;
          let minDist = Infinity;
          points.forEach((_, i) => {
            const dist = Math.abs(toX(i) - x);
            if (dist < minDist) { minDist = dist; closest = i; }
          });
          setHoverIdx(closest);
        }}
        onTouchEnd={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colorFade} />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>

        {/* Fill area */}
        <path d={fillD} fill="url(#chartGrad)" />

        {/* Line */}
        <path d={pathD} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {/* Hover indicator */}
        {hovered && (
          <>
            <line x1={hovX} y1={PAD} x2={hovX} y2={H - PAD} stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="3,3" />
            <circle cx={hovX} cy={hovY} r="4" fill={color} stroke="white" strokeWidth="1.5" />
          </>
        )}
      </svg>

      {/* Hover tooltip */}
      {hovered && (
        <div className={clsx(
          'absolute top-0 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 pointer-events-none text-xs',
          hoverIdx !== null && hoverIdx > points.length / 2 ? 'right-0' : 'left-0'
        )}>
          <p className="text-white font-bold">${hovered.totalUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          <p className="text-gray-400">SOL ${hovered.solPrice.toFixed(2)}</p>
          <p className="text-gray-500">{new Date(hovered.timestamp * 1000).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</p>
        </div>
      )}
    </div>
  );
}

interface PortfolioChartProps {
  solBalance: number;
  tokenUsd: number;
  demo?: boolean;
}

export function PortfolioChart({ solBalance, tokenUsd, demo = false }: PortfolioChartProps) {
  const [points, setPoints] = useState<DataPoint[]>([]);
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(false);

  const fetch7d = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (demo) params.set('demo', 'true');
      else {
        params.set('solBalance', solBalance.toString());
        params.set('tokenUsd', tokenUsd.toString());
      }
      const res = await fetch(`/api/portfolio-history?${params}`);
      if (!res.ok) return;
      const data = await res.json() as { points: DataPoint[]; source: string };
      setPoints(data.points ?? []);
      setSource(data.source ?? '');
    } catch {
      // keep empty
    } finally {
      setLoading(false);
    }
  }, [demo, solBalance, tokenUsd]);

  useEffect(() => { fetch7d(); }, [fetch7d]);

  if (loading && points.length === 0) {
    return <div className="h-20 bg-gray-800/40 animate-pulse rounded-xl" />;
  }

  if (points.length < 2) return null;

  const first = points[0].totalUsd;
  const last = points[points.length - 1].totalUsd;
  const change = last - first;
  const changePct = (change / first) * 100;
  const isUp = change >= 0;

  return (
    <div className="glass rounded-2xl p-4 mb-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">7-Day Portfolio</p>
        <span className={clsx('text-xs font-semibold', isUp ? 'text-emerald-400' : 'text-red-400')}>
          {isUp ? '+' : ''}{changePct.toFixed(2)}%
          {source === 'demo' && <span className="text-gray-600 font-normal ml-1">(demo)</span>}
        </span>
      </div>
      <SparkLine points={points} isUp={isUp} />
      <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
        <span>7 days ago</span>
        <span className={clsx('font-medium', isUp ? 'text-emerald-400' : 'text-red-400')}>
          {isUp ? '+' : ''}${change.toLocaleString(undefined, { maximumFractionDigits: 0 })} {source === 'live' ? '(live)' : ''}
        </span>
        <span>Now</span>
      </div>
    </div>
  );
}
