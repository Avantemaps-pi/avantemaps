import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { usePiPrice } from "@/hooks/usePiPrice";

export interface PricingTier {
  id: string;
  name: string;
  description: string;
  price: {
    monthly: number | string;
    yearly: number | string;
  };
  features: string[];
  cta: string;
  highlighted?: boolean;
  popular?: boolean;
  comingSoon?: boolean;
}

interface PricingCardProps {
  tier: PricingTier;
  paymentFrequency: string;
  id?: string;
  onSubscribe?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  isCurrentPlan?: boolean;
}

export function PricingCard({
  tier,
  paymentFrequency,
  id,
  onSubscribe,
  isLoading: isSubscribing,
  disabled,
  isCurrentPlan
}: PricingCardProps) {
  const {
    convertUsdToPi,
    isLoading: isPriceLoading
  } = usePiPrice();

  const price = tier.price[paymentFrequency as keyof typeof tier.price];
  const isCustom = typeof price === "string";
  const piPrice = !isCustom && typeof price === 'number' ? convertUsdToPi(price) : null;

  return (
    <div id={id} className="">
      {tier.popular && (
        <div className="absolute -top-3 left-8 rounded-full bg-blue-500 px-3 py-1 text-xs font-semibold text-white">
          Most popular
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h3 className="text-2xl font-semibold text-gray-900">{tier.name}</h3>
          <p className="mt-2 text-gray-500">{tier.description}</p>
        </div>
        
        <div className="flex flex-col gap-1">
          {piPrice ? (
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:flex-wrap gap-x-2">
              <div className="flex items-baseline flex-wrap gap-x-2">
                <div className="flex items-baseline">
                  <span className="text-3xl text-gray-900">π</span>
                  <span className="text-5xl font-bold tracking-tight text-gray-900 ml-1">
                    {piPrice}
                  </span>
                  <span className="ml-1 text-base font-normal text-gray-500">
                    Pi
                  </span>
                </div>
                <span className="text-base font-normal text-gray-500 sm:hidden">
                  / {paymentFrequency}
                </span>
              </div>
              {!isCustom && (
                <span className="text-2xl font-medium text-gray-600 leading-none mt-1 sm:mt-1">
                  (${price} USD)
                  {paymentFrequency === 'yearly' && typeof tier.price.monthly === 'number' && tier.price.monthly > 1 && (
                    <span className="ml-2 text-lg text-gray-400 line-through">
                      (${(tier.price.monthly as number) * 12} USD)
                    </span>
                  )}
                </span>
              )}
              <span className="hidden sm:inline text-base font-normal text-gray-500">
                / {paymentFrequency}
              </span>
            </div>
          ) : (
            <div className="flex items-baseline">
              {!isCustom && <span className="text-3xl text-gray-900">$</span>}
              <span className="text-5xl font-bold tracking-tight text-gray-900">
                {price}
              </span>
              {!isCustom && (
                <span className="ml-1 text-base font-normal text-gray-500">
                  / {paymentFrequency}
                </span>
              )}
            </div>
          )}
        </div>

        <ul className="space-y-4">
          {tier.features.map(feature => {
            // Check if feature contains "Small Business" and highlight it
            if (feature.includes("Small Business")) {
              const parts = feature.split("Small Business");
              return (
                <li key={feature} className="flex items-center gap-3">
                  <Check className="h-5 w-5 flex-shrink-0 text-blue-500" />
                  <span className="text-gray-600">
                    {parts[0]}
                    <span className="font-semibold text-blue-600">Small Business</span>
                    {parts[1]}
                  </span>
                </li>
              );
            }
            return (
              <li key={feature} className="flex items-center gap-3">
                <Check className="h-5 w-5 flex-shrink-0 text-blue-500" />
                <span className="text-gray-600">{feature}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <Button 
        className={cn(
          "mt-8 w-full text-base py-6", 
          tier.highlighted && "bg-avante-purple hover:bg-avante-purple/90",
          tier.popular && "bg-blue-500 hover:bg-blue-600"
        )} 
        onClick={onSubscribe} 
        disabled={isSubscribing || disabled}
      >
        {isSubscribing ? "Processing..." : isCurrentPlan ? "Current Plan" : tier.cta}
      </Button>
    </div>
  );
}
