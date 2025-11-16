
import { SubscriptionTier } from '../piNetwork';
import { PricingStructure } from './types';

// USD pricing structure for different subscription tiers (source of truth)
const SUBSCRIPTION_USD_PRICES: PricingStructure = {
  [SubscriptionTier.INDIVIDUAL]: { monthly: 0, yearly: 0 },
  [SubscriptionTier.SMALL_BUSINESS]: { monthly: 5, yearly: 48 },
  [SubscriptionTier.ORGANIZATION]: { monthly: 10, yearly: 96 },
};

/**
 * Determines the correct USD price based on tier and frequency
 * This returns USD amounts that will be converted to Pi by the payment hook
 */
export const getSubscriptionPrice = (
  tier: SubscriptionTier,
  frequency: string
): number => {
  // Default to monthly price if frequency is invalid
  const validFrequency = frequency === 'yearly' ? 'yearly' : 'monthly';
  
  return SUBSCRIPTION_USD_PRICES[tier][validFrequency] || 0;
};
