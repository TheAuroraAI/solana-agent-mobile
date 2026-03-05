import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { SimulatorView } from '@/components/SimulatorView';

export const metadata = { title: 'Portfolio Simulator — MONOLITH' };

export default function SimulatorPage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="safe-top px-4 pt-6 pb-4 animate-pulse">
            <div className="h-7 w-48 bg-gray-800 rounded mb-3" />
            <div className="h-4 w-32 bg-gray-800/60 rounded mb-8" />
            <div className="h-24 bg-gray-800/40 rounded-2xl mb-4" />
            <div className="h-10 bg-gray-800/40 rounded-xl mb-6" />
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-gray-800/40 rounded-2xl mb-3" />
            ))}
          </div>
        }
      >
        <SimulatorView />
      </Suspense>
    </AppShell>
  );
}
