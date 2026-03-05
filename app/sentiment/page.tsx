import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { SentimentView } from '@/components/SentimentView';

export const metadata = {
  title: 'Social Pulse — MONOLITH',
  description: 'Real-time social sentiment analysis for Solana tokens.',
};

export default function SentimentPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-4 text-gray-500">Loading sentiment...</div>}>
        <SentimentView />
      </Suspense>
    </AppShell>
  );
}
