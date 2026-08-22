
import * as React from "react";
import { type PricingTier } from "@/components/ui/pricing-card";
import { PricingHeader } from "@/components/ui/pricing-header";
import { PricingGrid } from "@/components/ui/pricing-grid";
import { PricingFooter } from "@/components/ui/pricing-footer";

interface PricingSectionProps {
  title: string;
  subtitle: string;
  tiers: (PricingTier & {
    onSubscribe?: () => void;
    isLoading?: boolean;
    disabled?: boolean;
  })[];
  frequencies: string[];
  organizationTierId?: string;
  currentUserTier?: string;
  onFrequencyChange?: (frequency: string) => void;
  children?: React.ReactNode;
}

export function PricingSection({
  title,
  subtitle,
  tiers,
  frequencies,
  organizationTierId,
  currentUserTier,
  onFrequencyChange,
  children
}: PricingSectionProps) {
  const [selectedFrequency, setSelectedFrequency] = React.useState(frequencies[0] ?? 'monthly');

  const handleFrequencyChange = (frequency: string) => {
    setSelectedFrequency(frequency);
    if (onFrequencyChange) {
      onFrequencyChange(frequency);
    }
  };

  const filteredFrequencies = frequencies.filter(freq => freq === 'monthly' || freq === 'yearly');

  return (
    <section className="sm:py-8 py-2">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {children}

          <PricingHeader 
            title={title} 
            subtitle={subtitle} 
            frequencies={filteredFrequencies} 
            selectedFrequency={selectedFrequency} 
            onFrequencyChange={handleFrequencyChange} 
          />
        </div>

        <div className="mt-4 sm:mt-6">
          <PricingGrid 
            tiers={tiers} 
            paymentFrequency={selectedFrequency} 
            organizationTierId={organizationTierId}
            currentUserTier={currentUserTier}
          />
        </div>

        <PricingFooter />
      </div>
    </section>
  );
}
