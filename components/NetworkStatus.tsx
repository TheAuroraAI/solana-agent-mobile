'use client';

import { useState, useEffect, useRef } from 'react';
import { Activity, Zap } from 'lucide-react';
import { clsx } from 'clsx';
import { getRpcUrl, getNetwork } from '@/lib/solana';

interface NetworkHealth {
  tps: number;
  slot: number;
  blockTime: number;
  status: 'healthy' | 'degraded' | 'down';
}

export function NetworkStatus() {
  const [health, setHealth] = useState<NetworkHealth | null>(null);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const network = getNetwork();

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const rpcUrl = getRpcUrl(network);
        const [perfRes, slotRes] = await Promise.all([
          fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getRecentPerformanceSamples', params: [1] }),
          }),
          fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'getSlot' }),
          }),
        ]);

        const perfData = await perfRes.json();
        const slotData = await slotRes.json();

        const sample = perfData.result?.[0];
        if (sample) {
          const tps = Math.round(sample.numTransactions / sample.samplePeriodSecs);
          const blockTime = sample.samplePeriodSecs / sample.numSlots * 1000; // ms per slot
          setHealth({
            tps,
            slot: slotData.result ?? 0,
            blockTime: Math.round(blockTime),
            status: tps > 1000 ? 'healthy' : tps > 200 ? 'degraded' : 'down',
          });
        }
      } catch {
        setHealth(prev => prev ? { ...prev, status: 'down' } : null);
      }
    };

    fetchHealth();
    intervalRef.current = setInterval(fetchHealth, 30_000);

    const handleVisibility = () => {
      if (document.hidden) {
        clearInterval(intervalRef.current);
      } else {
        fetchHealth();
        intervalRef.current = setInterval(fetchHealth, 30_000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [network]);

  if (!health) return null;

  const statusColor = {
    healthy: 'text-emerald-400',
    degraded: 'text-yellow-400',
    down: 'text-red-400',
  }[health.status];

  const dotColor = {
    healthy: 'bg-emerald-400',
    degraded: 'bg-yellow-400',
    down: 'bg-red-400',
  }[health.status];

  return (
    <div className="mb-3">
      <button
        onClick={() => setVisible(!visible)}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-400 transition-colors"
      >
        <span className={clsx('w-1.5 h-1.5 rounded-full', dotColor, health.status === 'healthy' && 'animate-pulse')} />
        <Activity className="w-3 h-3" />
        <span>Solana {network === 'mainnet' ? 'Mainnet' : 'Devnet'}</span>
        <span className={statusColor}>{health.tps.toLocaleString()} TPS</span>
      </button>

      {visible && (
        <div className="mt-2 glass rounded-xl p-3 grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Zap className="w-3 h-3 text-violet-400" />
            </div>
            <p className={clsx('text-sm font-bold', statusColor)}>{health.tps.toLocaleString()}</p>
            <p className="text-gray-500 text-[10px]">TPS</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-white">{health.slot.toLocaleString()}</p>
            <p className="text-gray-500 text-[10px]">Slot</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-white">{health.blockTime}ms</p>
            <p className="text-gray-500 text-[10px]">Block Time</p>
          </div>
        </div>
      )}
    </div>
  );
}
