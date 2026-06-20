import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  isAllowedSelectValue,
  selectedOptionLabel,
  type SelectOption,
} from "@/lib/select-options"
import { cn } from "@/lib/utils"

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
  const selectedLabel = selectedOptionLabel(options, value)

  return (
    <Select
      value={value}
      onValueChange={(nextValue) => {
        if (isAllowedSelectValue(options, nextValue)) {
          onValueChange(nextValue)
        }
      }}
      disabled={disabled || options.length === 0}
    >
      <SelectTrigger className={cn("w-full", className)} aria-label={ariaLabel}>
        <SelectValue placeholder={placeholder}>{selectedLabel || undefined}</SelectValue>
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
