
import { PricingTier } from "@/components/ui/pricing-card";

export const TIERS: PricingTier[] = [
  {
    id: "individual",
    name: "Individual",
    description: "Perfect for casual users who want to discover businesses.",
    price: {
      monthly: 0,
      yearly: 0
    },
    features: [
      "Up to 1 business listing",
    ],
    cta: "Get Started Free",
  },
  {
    id: "small-business",
    name: "Small Business",
    description: "For business owners who want to increase visibility.",
    price: {
      monthly: 5,
      yearly: 48
    },
    features: [
      "Up to 3 business listings", 
      "All Individual features",
      "Highlighted business profile",
      "Business analytics",
      "Priority business support",
      "Verified business status",
    ],
    cta: "Switch to Business",
    highlighted: true,
    popular: true
  },
  {
    id: "organization",
    name: "Organization",
    description: "For larger organizations with multiple locations.",
    price: {
      monthly: 10,
      yearly: 96
    },
    features: [
      "Up to 5 business listings", 
      "All Small Business features",
      "Multiple business locations",
      "Advanced analytics",
      "Dedicated support team",
      "Custom business integration",
    ],
    cta: "Upgrade to Organization",
    highlighted: true
  }
];
