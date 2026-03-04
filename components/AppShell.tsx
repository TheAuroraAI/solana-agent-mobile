'use client';

import { type ReactNode, Suspense } from 'react';
import { WalletProvider } from './WalletProvider';
import { BottomNav } from './BottomNav';
import { ErrorBoundary } from './ErrorBoundary';
import { NfaBanner, NfaFooter } from './NfaDisclaimer';
import { OfflineBanner } from './OfflineBanner';
import { InstallPrompt } from './InstallPrompt';

interface AppShellProps {
  children: ReactNode;
  showNav?: boolean;
}

export function AppShell({ children, showNav = true }: AppShellProps) {
  return (
    <ErrorBoundary fallbackMessage="Aurora encountered an error">
      <WalletProvider>
        <div className="min-h-screen bg-gray-950 max-w-md mx-auto relative">
          <OfflineBanner />
          <InstallPrompt />
          <NfaBanner />
          <main className={`page-transition ${showNav ? 'pb-20' : ''}`}>
            {children}
            <NfaFooter />
          </main>
          {showNav && (
            <Suspense>
              <BottomNav />
            </Suspense>
          )}
        </div>
      </WalletProvider>
    </ErrorBoundary>
  );
}
