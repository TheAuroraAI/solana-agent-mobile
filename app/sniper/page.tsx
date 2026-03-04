import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { TokenSniperView } from '@/components/TokenSniperView';

export const metadata = { title: 'Token Sniper — Aurora Agent' };

export default function SniperPage() {
  return (
    <AppShell>
      <Suspense fallback={
        <div className="px-4 pt-4 pb-28 max-w-md mx-auto">
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass rounded-2xl p-4 animate-pulse h-32" />
            ))}
          </div>
        </div>
      }>
        <TokenSniperView />
      </Suspense>
    </AppShell>
  );
}
