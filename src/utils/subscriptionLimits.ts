import { SubscriptionTier } from './piNetwork';

export const BUSINESS_LIMITS: Record<SubscriptionTier, number> = {
  [SubscriptionTier.INDIVIDUAL]: 1,
  [SubscriptionTier.SMALL_BUSINESS]: 3,
  [SubscriptionTier.ORGANIZATION]: 5,
};

export const getBusinessLimit = (tier: SubscriptionTier | string): number => {
  return BUSINESS_LIMITS[tier as SubscriptionTier] || BUSINESS_LIMITS[SubscriptionTier.INDIVIDUAL];
};

export const canRegisterBusiness = (currentCount: number, tier: SubscriptionTier | string): boolean => {
  const limit = getBusinessLimit(tier);
  return currentCount < limit;
};
