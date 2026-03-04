'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { WhaleAlerts } from './WhaleAlerts';
import { WalletClone } from './WalletClone';

interface WhaleAlert {
  amountUsd: number;
  tier: 'mega' | 'whale' | 'dolphin';
}

function formatLargeUsd(usd: number): string {
  if (usd >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(1)}B`;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(0)}K`;
  return `$${usd.toLocaleString()}`;
}

export function WhalesView() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';
  const [stats, setStats] = useState({ largest: 0, count: 0, volume: 0 });

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/whales${isDemo ? '?demo=true' : ''}`);
      if (!res.ok) return;
      const data = await res.json();
      const alerts: WhaleAlert[] = data.alerts ?? [];
      const largest = alerts.reduce((max, a) => Math.max(max, a.amountUsd), 0);
      const volume = alerts.reduce((sum, a) => sum + a.amountUsd, 0);
      setStats({ largest, count: alerts.length, volume });
    } catch { /* keep defaults */ }
  }, [isDemo]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return (
    <div className="safe-top px-4 pt-6 pb-4">
      <div className="mb-5">
        <h1 className="text-white text-xl font-bold">Whale Watch</h1>
        <p className="text-gray-400 text-xs mt-1">
          Real-time large Solana transactions. Track big players, copy their moves.
        </p>
      </div>

      {/* Stats bar — computed from live data */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="glass rounded-xl p-3 text-center">
          <p className="text-violet-400 text-base font-bold">
            {stats.largest > 0 ? `🐋 ${formatLargeUsd(stats.largest)}` : '—'}
          </p>
          <p className="text-gray-500 text-xs mt-0.5">Largest move</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <p className="text-blue-400 text-base font-bold">{stats.count || '—'}</p>
          <p className="text-gray-500 text-xs mt-0.5">Tracked alerts</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <p className="text-emerald-400 text-base font-bold">
            {stats.volume > 0 ? formatLargeUsd(stats.volume) : '—'}
          </p>
          <p className="text-gray-500 text-xs mt-0.5">Alert volume</p>
        </div>
      </div>

      {/* Smart Wallet Clone */}
      <div className="mb-6">
        <WalletClone demo={isDemo} />
      </div>

      {/* Separator */}
      <div className="border-t border-gray-800/50 mb-5" />

      <WhaleAlerts demo={isDemo} />
    </div>
  );
}
