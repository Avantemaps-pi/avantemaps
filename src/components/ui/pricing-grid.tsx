
import React from "react"
import { PricingCard, type PricingTier } from "@/components/ui/pricing-card"

interface PricingGridProps {
  tiers: (PricingTier & {
    onSubscribe?: () => void
    isLoading?: boolean
    disabled?: boolean
  })[]
  paymentFrequency: string
  organizationTierId?: string
  currentUserTier?: string
}

export function PricingGrid({
  tiers,
  paymentFrequency,
  organizationTierId,
  currentUserTier,
}: PricingGridProps) {
  // Debug log to see current user tier
  console.log('PricingGrid - currentUserTier:', currentUserTier);
  console.log('PricingGrid - tier IDs:', tiers.map(t => t.id));
  
  return (
    <div className="mx-auto max-w-[1400px] px-4 lg:px-6">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-4">
        {tiers.map((tier) => {
          const isCurrentPlan = currentUserTier === tier.id;
          console.log(`Tier ${tier.id}: isCurrentPlan = ${isCurrentPlan} (user: ${currentUserTier})`);
          
          return (
            <PricingCard
              key={tier.name}
              tier={tier}
              paymentFrequency={paymentFrequency}
              {...(tier.id === organizationTierId ? { id: `tier-${tier.id}` } : {})}
              {...(tier.onSubscribe !== undefined ? { onSubscribe: tier.onSubscribe } : {})}
              {...(tier.isLoading !== undefined ? { isLoading: tier.isLoading } : {})}
              {...(tier.disabled !== undefined ? { disabled: tier.disabled } : {})}
              isCurrentPlan={isCurrentPlan}
            />
          );
        })}
      </div>
    </div>
  );
}
