export interface PriceAlert {
  id: string;
  token: string;
  targetPrice: number;
  direction: 'above' | 'below';
  triggered: boolean;
  createdAt: number;
}

const STORAGE_KEY = 'aurora-price-alerts';

export function loadAlerts(): PriceAlert[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PriceAlert[]) : [];
  } catch {
    return [];
  }
}

export function saveAlerts(alerts: PriceAlert[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  } catch { /* ignore */ }
}

export function addAlert(token: string, targetPrice: number, direction: 'above' | 'below'): PriceAlert {
  const alert: PriceAlert = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    token,
    targetPrice,
    direction,
    triggered: false,
    createdAt: Date.now(),
  };
  const alerts = loadAlerts();
  alerts.push(alert);
  saveAlerts(alerts);
  return alert;
}

export function deleteAlert(id: string): void {
  const alerts = loadAlerts().filter((a) => a.id !== id);
  saveAlerts(alerts);
}

export function markTriggered(id: string): void {
  const alerts = loadAlerts().map((a) => (a.id === id ? { ...a, triggered: true } : a));
  saveAlerts(alerts);
}

/** Returns alerts that are triggered by the given current prices. Marks them triggered. */
export function checkAlerts(prices: Record<string, number>): PriceAlert[] {
  const alerts = loadAlerts();
  const triggered: PriceAlert[] = [];

  for (const alert of alerts) {
    if (alert.triggered) continue;
    const current = prices[alert.token];
    if (current == null) continue;

    const shouldFire =
      alert.direction === 'above' ? current >= alert.targetPrice : current <= alert.targetPrice;

    if (shouldFire) {
      triggered.push(alert);
    }
  }

  if (triggered.length > 0) {
    const updatedIds = new Set(triggered.map((a) => a.id));
    saveAlerts(alerts.map((a) => (updatedIds.has(a.id) ? { ...a, triggered: true } : a)));
  }

  return triggered;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function fireNotification(title: string, body: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    });
  }
}
