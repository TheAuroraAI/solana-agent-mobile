import { AppShell } from '@/components/AppShell';
import { LandingPage } from '@/components/LandingPage';

export default function Home() {
  return (
    <AppShell showNav={false}>
      <LandingPage />
    </AppShell>
  );
}
