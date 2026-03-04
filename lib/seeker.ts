/**
 * Seeker device detection for Solana Mobile.
 * Detects if the user is browsing from a Solana Mobile Seeker device
 * and provides device-specific features and messaging.
 */

export interface SeekerInfo {
  isSeeker: boolean;
  model?: string;
  features: string[];
}

/**
 * Detect Seeker device from user agent.
 * Seeker devices identify as "SolanaMobile" in their UA string.
 * Chapter 2 devices include "Seeker" specifically.
 */
export function detectSeeker(): SeekerInfo {
  if (typeof navigator === 'undefined') {
    return { isSeeker: false, features: [] };
  }

  const ua = navigator.userAgent;

  // Seeker Chapter 2 device
  if (ua.includes('Seeker') || ua.includes('SolanaMobile')) {
    return {
      isSeeker: true,
      model: ua.includes('Seeker') ? 'Seeker' : 'Saga',
      features: [
        'Native dApp Store access',
        'SKR token airdrop eligible',
        'Guardian staking support',
        'Mobile-first DeFi optimized',
      ],
    };
  }

  // Also detect Saga (original Solana Mobile phone)
  if (ua.includes('Saga')) {
    return {
      isSeeker: true,
      model: 'Saga',
      features: [
        'Native dApp Store access',
        'BONK airdrop history',
        'Guardian staking support',
      ],
    };
  }

  return { isSeeker: false, features: [] };
}

/**
 * Check if the device supports Solana Mobile Stack (SMS) features.
 * This is broader than Seeker detection — includes any Android device
 * that might have the Solana dApp Store installed.
 */
export function isMobileWalletCapable(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Android/i.test(ua);
}
