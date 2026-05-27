
import * as React from "react"
import { cn } from "@/lib/utils"

interface TabProps {
  text: string
  selected: boolean
  setSelected: (value: string) => void
  discount?: boolean
  discountAmount?: string
}

export function Tab({ text, selected, setSelected, discount = false, discountAmount = "20%" }: TabProps) {
  return (
    <button
      onClick={() => setSelected(text.toLowerCase())}
      className={cn(
        "relative flex h-10 items-center justify-center gap-2 rounded-full px-6 text-sm font-medium transition text-gray-600",
        selected
          ? "bg-white text-black shadow-sm"
          : "hover:text-black"
      )}
    >
      {text}
      {discount && (
        <span className="flex h-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
          Save {discountAmount}
        </span>
      )}
    </button>
  )
}
