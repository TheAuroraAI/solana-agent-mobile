'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const NFA_DISMISSED_KEY = 'aurora-nfa-dismissed';

export function NfaBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(NFA_DISMISSED_KEY) === 'true');
  }, []);

  if (dismissed) return null;

  return (
    <div className="mx-4 mt-2 mb-0 flex items-start gap-2 px-3 py-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-xs">
      <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-yellow-300 font-medium">Not Financial Advice</p>
        <p className="text-yellow-200/60 mt-0.5 leading-relaxed">
          Aurora provides informational analysis only. APYs, prices, and risk scores are estimates and may be inaccurate.
          Always do your own research before executing any transaction. You are solely responsible for your financial decisions.
        </p>
      </div>
      <button
        onClick={() => {
          localStorage.setItem(NFA_DISMISSED_KEY, 'true');
          setDismissed(true);
        }}
        className="text-yellow-400/60 hover:text-yellow-300 flex-shrink-0 p-0.5"
        aria-label="Dismiss disclaimer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function NfaFooter() {
  return (
    <p className="text-gray-600 text-[10px] text-center mt-4 mb-2 px-4 leading-relaxed">
      Not financial advice. Aurora is an AI tool for informational purposes only.
      Verify all data independently before making financial decisions.
    </p>
  );
}
