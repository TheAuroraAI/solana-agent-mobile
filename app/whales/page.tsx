import { Suspense } from 'react';
import { WhalesView } from '@/components/WhalesView';

export const metadata = { title: 'Whale Alerts — Aurora' };

export default function WhalesPage() {
  return (
    <Suspense fallback={null}>
      <WhalesView />
    </Suspense>
  );
}
