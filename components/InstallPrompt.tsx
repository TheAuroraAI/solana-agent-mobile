'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

const INSTALL_DISMISSED_KEY = 'aurora-install-dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setDismissed(localStorage.getItem(INSTALL_DISMISSED_KEY) === 'true');
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (dismissed || isStandalone || !deferredPrompt) return null;

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="mx-4 mt-2 flex items-center gap-2 px-3 py-2.5 bg-violet-500/10 border border-violet-500/20 rounded-xl">
      <Download className="w-4 h-4 text-violet-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-violet-300 text-xs font-medium">Install Aurora Agent</p>
        <p className="text-violet-200/50 text-[10px]">Add to home screen for the full mobile experience.</p>
      </div>
      <button
        onClick={handleInstall}
        className="text-xs bg-violet-500/30 text-violet-300 px-2.5 py-1 rounded-lg font-medium hover:bg-violet-500/40 transition-colors flex-shrink-0"
      >
        Install
      </button>
      <button
        onClick={() => {
          localStorage.setItem(INSTALL_DISMISSED_KEY, 'true');
          setDismissed(true);
        }}
        className="text-violet-400/40 hover:text-violet-300 flex-shrink-0"
        aria-label="Dismiss install prompt"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
