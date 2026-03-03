'use client';

export type SolanaNetwork = 'devnet' | 'mainnet';

export interface AppSettings {
  network: SolanaNetwork;
  customRpc: string;
  chatModel: string;
  actionsModel: string;
  defiProtocols: string[];
  anthropicApiKey: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  network: 'devnet',
  customRpc: '',
  chatModel: 'llama-3.3-70b-versatile',
  actionsModel: 'llama-3.3-70b-versatile',
  defiProtocols: ['Jito', 'Marinade', 'Jupiter'],
  anthropicApiKey: '',
};

const STORAGE_KEY = 'aurora-settings';

export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

export const CHAT_MODELS = [
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (Free)', provider: 'groq' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', provider: 'anthropic' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', provider: 'anthropic' },
  { id: 'claude-opus-4-6', label: 'Claude Opus 4.6', provider: 'anthropic' },
];

export const ACTIONS_MODELS = [
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (Free)', provider: 'groq' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (Fast)', provider: 'anthropic' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', provider: 'anthropic' },
];

export const DEFI_PROTOCOLS = [
  'Jito', 'Marinade', 'Jupiter', 'Kamino', 'MarginFi', 'BlazeStake', 'Orca', 'Raydium',
];

export function getModelProvider(modelId: string): 'groq' | 'anthropic' {
  return modelId.startsWith('claude') ? 'anthropic' : 'groq';
}
