/**
 * Persistent agent action log — stores a history of every action Aurora proposes,
 * with timestamps and user decisions (approved/rejected/executed).
 * Stored in localStorage, displayed on dashboard as proof of autonomous reasoning.
 */

export interface ActionLogEntry {
  id: string;
  timestamp: string;
  type: 'stake' | 'swap' | 'alert' | 'analysis' | 'transfer';
  title: string;
  outcome: 'proposed' | 'approved' | 'rejected' | 'executed';
  protocol?: string;
  amount?: number;
  txSignature?: string;
}

const STORAGE_KEY = 'aurora-action-log';
const MAX_ENTRIES = 50;

export function getActionLog(): ActionLogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function logAction(entry: ActionLogEntry): void {
  if (typeof window === 'undefined') return;
  try {
    const log = getActionLog();
    // Update existing entry or add new
    const idx = log.findIndex(e => e.id === entry.id);
    if (idx >= 0) {
      log[idx] = { ...log[idx], ...entry };
    } else {
      log.unshift(entry);
    }
    // Trim to max
    localStorage.setItem(STORAGE_KEY, JSON.stringify(log.slice(0, MAX_ENTRIES)));
  } catch {
    // localStorage full or unavailable
  }
}

export function updateActionOutcome(
  id: string,
  outcome: ActionLogEntry['outcome'],
  txSignature?: string
): void {
  if (typeof window === 'undefined') return;
  try {
    const log = getActionLog();
    const entry = log.find(e => e.id === id);
    if (entry) {
      entry.outcome = outcome;
      if (txSignature) entry.txSignature = txSignature;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
    }
  } catch {
    // ignore
  }
}

export function getActionStats(): { total: number; executed: number; approved: number; rejected: number } {
  const log = getActionLog();
  return {
    total: log.length,
    executed: log.filter(e => e.outcome === 'executed').length,
    approved: log.filter(e => e.outcome === 'approved').length,
    rejected: log.filter(e => e.outcome === 'rejected').length,
  };
}
