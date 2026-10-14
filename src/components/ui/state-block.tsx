import * as React from "react"
import { Loader2, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface StateBlockAction {
  label: string
  onClick: () => void
  loading?: boolean
}

interface StateBlockProps {
  kind: "empty" | "error"
  icon: LucideIcon
  title: string
  body?: string
  action?: StateBlockAction
  className?: string
}

function StateBlock({ kind, icon: Icon, title, body, action, className }: StateBlockProps) {
  const isError = kind === "error"

  return (
    <div
      role={isError ? "alert" : "status"}
      className={cn("mx-auto flex max-w-xs flex-col items-center gap-2 px-4 py-8 text-center", className)}
    >
      <span
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full",
          isError ? "bg-muted text-destructive" : "bg-accent text-primary"
        )}
      >
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <h2 className="text-[17px] leading-6 font-semibold text-foreground">{title}</h2>
      {body && <p className="text-sm leading-5 text-muted-foreground">{body}</p>}
      {action && (
        <Button
          type="button"
          variant={isError ? "outline" : "default"}
          onClick={action.onClick}
          disabled={action.loading}
          aria-busy={action.loading || undefined}
          className={cn(
            "mt-2 h-11 sm:h-11 shrink-0 px-5 text-sm font-semibold disabled:opacity-100 [&_svg]:size-[18px] sm:[&_svg]:size-[18px] motion-safe:[&_svg]:animate-spin",
            isError && "bg-transparent"
          )}
        >
          {action.loading && <Loader2 aria-hidden="true" />}
          {action.label}
        </Button>
      )}
    </div>
  )
}

export { StateBlock }
export type { StateBlockProps }
