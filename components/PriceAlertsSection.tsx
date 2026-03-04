'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, Plus, Trash2, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { clsx } from 'clsx';
import {
  loadAlerts, addAlert, deleteAlert,
  requestNotificationPermission, type PriceAlert,
} from '@/lib/alerts';

const SUPPORTED_TOKENS = ['SOL', 'JUP', 'BONK', 'WIF'];

export function PriceAlertsSection() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const [adding, setAdding] = useState(false);
  const [token, setToken] = useState('SOL');
  const [targetPrice, setTargetPrice] = useState('');
  const [direction, setDirection] = useState<'above' | 'below'>('above');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAlerts(loadAlerts());
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission);
    }
    if (granted) {
      new Notification('Aurora Agent', {
        body: 'Price alerts enabled! You\'ll be notified when your targets are hit.',
        icon: '/icon-192.png',
      });
    }
  };

  const handleAdd = () => {
    setError(null);
    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) {
      setError('Enter a valid price above 0');
      return;
    }
    addAlert(token, price, direction);
    setAlerts(loadAlerts());
    setTargetPrice('');
    setAdding(false);
  };

  const handleDelete = (id: string) => {
    deleteAlert(id);
    setAlerts(loadAlerts());
  };

  const activeAlerts = alerts.filter((a) => !a.triggered);
  const triggeredAlerts = alerts.filter((a) => a.triggered);

  return (
    <div>
      {/* Notification permission banner */}
      {notifPermission !== 'granted' && notifPermission !== 'denied' && (
        <div className="glass rounded-2xl p-4 mb-3 flex items-start gap-3">
          <Bell className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-white text-sm font-medium">Enable notifications</p>
            <p className="text-gray-400 text-xs mt-0.5">Get notified when price targets are hit, even when the app is in the background.</p>
            <button
              onClick={handleEnableNotifications}
              className="mt-2 text-xs font-medium text-violet-400 active:text-violet-300"
            >
              Allow notifications →
            </button>
          </div>
        </div>
      )}

      {notifPermission === 'denied' && (
        <div className="glass rounded-2xl p-3 mb-3 flex items-center gap-2 text-orange-400/80">
          <BellOff className="w-4 h-4 shrink-0" />
          <p className="text-xs">Notifications blocked. Enable in browser settings.</p>
        </div>
      )}

      {/* Alert list */}
      <div className="glass rounded-2xl overflow-hidden divide-y divide-gray-800/50 mb-3">
        {activeAlerts.length === 0 && !adding && (
          <div className="py-6 text-center text-gray-600 text-sm">
            No active price alerts
          </div>
        )}

        {activeAlerts.map((alert) => (
          <div key={alert.id} className="flex items-center gap-3 px-4 py-3">
            {alert.direction === 'above' ? (
              <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <span className="text-white text-sm font-medium">{alert.token}</span>
              <span className="text-gray-400 text-xs ml-1">
                {alert.direction} ${alert.targetPrice.toLocaleString()}
              </span>
            </div>
            <button
              onClick={() => handleDelete(alert.id)}
              aria-label="Delete alert"
              className="p-1 rounded-lg text-gray-600 active:text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {/* Add form */}
        {adding && (
          <div className="px-4 py-3 space-y-2">
            {/* Token selector */}
            <div className="flex gap-1.5">
              {SUPPORTED_TOKENS.map((t) => (
                <button
                  key={t}
                  onClick={() => setToken(t)}
                  className={clsx(
                    'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                    token === t ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Direction + price */}
            <div className="flex gap-2">
              <div className="flex rounded-lg overflow-hidden border border-gray-700">
                <button
                  onClick={() => setDirection('above')}
                  className={clsx(
                    'px-2.5 py-1.5 text-xs font-medium transition-colors',
                    direction === 'above' ? 'bg-emerald-600/30 text-emerald-400' : 'bg-gray-800 text-gray-500'
                  )}
                >
                  Above
                </button>
                <button
                  onClick={() => setDirection('below')}
                  className={clsx(
                    'px-2.5 py-1.5 text-xs font-medium transition-colors',
                    direction === 'below' ? 'bg-red-600/30 text-red-400' : 'bg-gray-800 text-gray-500'
                  )}
                >
                  Below
                </button>
              </div>
              <input
                type="number"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="Target price ($)"
                min="0"
                step="any"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-violet-500"
              />
            </div>

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                className="flex-1 py-1.5 rounded-lg bg-violet-600 text-white text-sm font-medium active:bg-violet-700"
              >
                Set Alert
              </button>
              <button
                onClick={() => { setAdding(false); setError(null); setTargetPrice(''); }}
                className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-400 text-sm active:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add button */}
      {!adding && (
        <button
          onClick={() => setAdding(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-gray-700 text-gray-400 text-sm hover:border-violet-500/50 hover:text-violet-400 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add price alert
        </button>
      )}

      {/* Triggered alerts */}
      {triggeredAlerts.length > 0 && (
        <div className="mt-4">
          <p className="text-gray-600 text-xs uppercase font-medium tracking-wider mb-2">Triggered</p>
          <div className="glass rounded-2xl overflow-hidden divide-y divide-gray-800/50 opacity-60">
            {triggeredAlerts.map((alert) => (
              <div key={alert.id} className="flex items-center gap-3 px-4 py-3">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="flex-1">
                  <span className="text-white text-sm">{alert.token}</span>
                  <span className="text-gray-500 text-xs ml-1">
                    {alert.direction} ${alert.targetPrice.toLocaleString()} — triggered
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(alert.id)}
                  className="p-1 text-gray-700 active:text-red-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
