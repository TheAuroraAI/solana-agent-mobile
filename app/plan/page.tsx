import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { AgentPlanView } from '@/components/AgentPlanView';

export const metadata = { title: 'Agent Plan — Aurora' };

export default function PlanPage() {
  return (
    <AppShell>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full" />
        </div>
      }>
        <AgentPlanView />
      </Suspense>
    </AppShell>
  );
}
