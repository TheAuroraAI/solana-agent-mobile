import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { TokenSearch } from '@/components/TokenSearch';

export const metadata = { title: 'Token Search — Aurora Agent' };

export default function SearchPage() {
  return (
    <AppShell>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <TokenSearch />
      </Suspense>
    </AppShell>
  );
}
