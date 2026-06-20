export type SelectOption = {
  value: string
  label: string
  disabled?: boolean
}

export function selectedOptionLabel(options: SelectOption[], value: string | undefined) {
  const selectedValue = value?.trim() ?? ""

  if (!selectedValue) {
    return ""
  }

  return options.find((option) => option.value === selectedValue)?.label ?? selectedValue
}

export function isAllowedSelectValue(options: SelectOption[], value: string) {
  return value !== "" || options.some((option) => option.value === "")
}
