/**
 * Centralized feature flags.
 *
 * Toggle features without scattering environment checks across the codebase.
 * Flags default to OFF and should only be turned on when the underlying
 * dependency is production-ready.
 */

export const FEATURE_FLAGS = {
  /**
   * PiRC2 — Pi Network Subscription Smart Contract integration.
   *
   * Spec: https://github.com/PiNetwork/PiRC/tree/main/PiRC2
   *
   * Status: DRAFT spec only. No deployed Soroban contract address has been
   * published by Pi Network. Keep OFF until:
   *   1. Pi publishes a live Subscription contract address on Mainnet.
   *   2. The Pi SDK exposes a way to call the contract from the browser
   *      (or we accept driving it server-side via Stellar SDK).
   *   3. We migrate our `subscriptions` table to the PiRC2 model
   *      (services, plans, allowances, lifecycle states).
   *
   * See: docs/pirc2-integration.md for the full migration plan.
   */
  pirc2Subscriptions: false as boolean,
};

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export const isFeatureEnabled = (flag: FeatureFlag): boolean =>
  FEATURE_FLAGS[flag] === true;
