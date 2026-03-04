import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { YieldBoard } from '@/components/YieldBoard';
import { GenericSkeleton } from '@/components/Skeleton';

export const metadata = { title: 'Yield — Aurora' };

export default function YieldPage() {
  return (
    <AppShell>
      <Suspense fallback={<GenericSkeleton />}>
        <div className="safe-top px-4 pt-6 pb-4">
          <div className="mb-5">
            <h1 className="text-white text-xl font-bold">Yield Opportunities</h1>
            <p className="text-gray-400 text-xs mt-1">
              Top DeFi yield strategies on Solana, ranked by APY and risk.
            </p>
          </div>
          <YieldBoard />
        </div>
      </Suspense>
    </AppShell>
  );
}
