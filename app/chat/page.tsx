import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { ChatView } from '@/components/ChatView';
import { ChatSkeleton } from '@/components/Skeleton';

export default function ChatPage() {
  return (
    <AppShell>
      <Suspense fallback={<ChatSkeleton />}>
        <ChatView />
      </Suspense>
    </AppShell>
  );
}
