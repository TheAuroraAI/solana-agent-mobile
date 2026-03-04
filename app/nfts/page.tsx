import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { NftGallery } from '@/components/NftGallery';
import { GenericSkeleton } from '@/components/Skeleton';

export const metadata = { title: 'NFT Gallery — Aurora Agent' };

export default function NftsPage() {
  return (
    <AppShell>
      <Suspense fallback={<GenericSkeleton />}>
        <NftGallery />
      </Suspense>
    </AppShell>
  );
}
