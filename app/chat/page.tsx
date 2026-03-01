import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { ChatView } from '@/components/ChatView';

export default function ChatPage() {
  return (
    <AppShell>
      <Suspense>
        <ChatView />
      </Suspense>
    </AppShell>
  );
}
