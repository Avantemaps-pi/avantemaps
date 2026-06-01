
import React from "react"
import { Tab } from "@/components/ui/pricing-tab"

interface PricingHeaderProps {
  title: string
  subtitle: string
  frequencies: string[]
  selectedFrequency: string
  onFrequencyChange: (frequency: string) => void
}

export function PricingHeader({
  title,
  subtitle,
  frequencies,
  selectedFrequency,
  onFrequencyChange,
}: PricingHeaderProps) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <h1 className="text-xl sm:text-2xl font-medium tracking-tight text-gray-900">
        {title}
      </h1>
      <p className="mt-1.5 sm:mt-2 text-[13px] sm:text-sm leading-5 sm:leading-6 text-gray-600">
        {subtitle}
      </p>
      <div className="mt-3 sm:mt-4 flex flex-col items-center gap-1.5">
        <div className="flex rounded-full bg-gray-100 p-1">
          {frequencies.map((freq) => (
            <Tab
              key={freq}
              text={freq.charAt(0).toUpperCase() + freq.slice(1)}
              selected={selectedFrequency === freq}
              setSelected={onFrequencyChange}
              discount={freq === "yearly"}
              discountAmount="20%"
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Save 20% with yearly billing</p>
      </div>
    </div>
  )
}
