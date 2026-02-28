'use client';

import { type ReactNode } from 'react';
import { WalletProvider } from './WalletProvider';
import { BottomNav } from './BottomNav';

interface AppShellProps {
  children: ReactNode;
  showNav?: boolean;
}

export function AppShell({ children, showNav = true }: AppShellProps) {
  return (
    <WalletProvider>
      <div className="min-h-screen bg-gray-950 max-w-md mx-auto relative">
        <main className={showNav ? 'pb-20' : ''}>{children}</main>
        {showNav && <BottomNav />}
      </div>
    </WalletProvider>
  );
}
