import type { Site, SiteLanguage } from "@/types"

export const defaultSiteLanguages: SiteLanguage[] = [{ key: "en", label: "English" }]

export function siteLanguageOptions(site: Site | null) {
  return (site?.languages?.length ? site.languages : defaultSiteLanguages).map((language) => ({
    value: language.key,
    label: `${language.label} (${language.key})`,
  }))
}

export function languageOptionsWithValue(site: Site | null, value: string) {
  const options = siteLanguageOptions(site)
  const selectedValue = value.trim()

  if (!selectedValue || options.some((option) => option.value === selectedValue)) {
    return options
  }

  return [{ value: selectedValue, label: selectedValue }, ...options]
}

export function firstSiteLanguage(site: Site | null) {
  return siteLanguageOptions(site)[0]?.value ?? "en"
}

export function siteLanguageLabel(site: Site | null, key: string) {
  return siteLanguageOptions(site).find((language) => language.value === key)?.label ?? key
}
