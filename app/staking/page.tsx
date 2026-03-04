import { AppShell } from '@/components/AppShell';
import { StakingView } from '@/components/StakingView';

export const metadata = {
  title: 'Staking — MONOLITH',
  description: 'Stake SOL with Jito, Marinade, or native validators. Track positions, APY, and rewards.',
};

export default function StakingPage() {
  return (
    <AppShell>
      <StakingView />
    </AppShell>
  );
}
