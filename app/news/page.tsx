import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { NewsView } from '@/components/NewsView';

export const metadata = {
  title: 'News Feed — MONOLITH',
  description: 'Curated Solana ecosystem news, protocol updates, and market insights.',
};

export default function NewsPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-4 text-gray-500">Loading news...</div>}>
        <NewsView />
      </Suspense>
    </AppShell>
  );
}
