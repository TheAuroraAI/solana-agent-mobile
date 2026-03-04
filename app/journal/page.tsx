import { AppShell } from '@/components/AppShell';
import { TradeJournalView } from '@/components/TradeJournalView';

export const metadata = {
  title: 'Trade Journal — MONOLITH',
  description: 'Log trades with AI-powered commentary. Track P&L, win rate, and export your history.',
};

export default function JournalPage() {
  return (
    <AppShell>
      <TradeJournalView />
    </AppShell>
  );
}
