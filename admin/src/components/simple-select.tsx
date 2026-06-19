import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export type SelectOption = {
  value: string
  label: string
  disabled?: boolean
}

export function SimpleSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select",
  className,
  disabled,
  "aria-label": ariaLabel,
}: {
  value: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
  disabled?: boolean
  "aria-label"?: string
}) {
  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      disabled={disabled || options.length === 0}
    >
      <SelectTrigger className={cn("w-full", className)} aria-label={ariaLabel}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
