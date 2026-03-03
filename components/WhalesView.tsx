'use client';

import { useSearchParams } from 'next/navigation';
import { WhaleAlerts } from './WhaleAlerts';

export function WhalesView() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';

  return (
    <div className="safe-top px-4 pt-6 pb-4">
      <div className="mb-5">
        <h1 className="text-white text-xl font-bold">Whale Watch</h1>
        <p className="text-gray-400 text-xs mt-1">
          Real-time large Solana transactions. Track big players, copy their moves.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="glass rounded-xl p-3 text-center">
          <p className="text-violet-400 text-base font-bold">🐋 $8.6M</p>
          <p className="text-gray-500 text-xs mt-0.5">Largest move</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <p className="text-blue-400 text-base font-bold">847</p>
          <p className="text-gray-500 text-xs mt-0.5">Whales today</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <p className="text-emerald-400 text-base font-bold">$2.1B</p>
          <p className="text-gray-500 text-xs mt-0.5">Volume 24h</p>
        </div>
      </div>

      <WhaleAlerts demo={isDemo} />
    </div>
  );
}
