
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
      <h1 className="text-5xl font-bold tracking-tight text-gray-900">
        {title}
      </h1>
      <p className="mt-6 text-xl leading-8 text-gray-600">
        {subtitle}
      </p>
      <div className="mt-8 flex justify-center">
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
      </div>
    </div>
  )
}
