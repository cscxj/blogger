import type { ReactNode } from "react"

import { Label } from "@/components/ui/label"

export function Field({
  label,
  children,
  required = false,
}: {
  label: string
  children: ReactNode
  required?: boolean
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </Label>
      {children}
    </div>
  )
}
