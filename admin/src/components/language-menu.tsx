import { Languages } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { i18n, languages, LOCALE_STORAGE_KEY } from "@/lib/i18n"

export function LanguageMenu() {
  const { t } = useTranslation()
  const currentLanguage = i18n.language === "en" ? "en" : "zh"

  function changeLanguage(value: string) {
    localStorage.setItem(LOCALE_STORAGE_KEY, value)
    void i18n.changeLanguage(value)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("common.language")}
        >
          <Languages className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        <DropdownMenuLabel>{t("common.language")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={currentLanguage}
          onValueChange={changeLanguage}
        >
          {languages.map((language) => (
            <DropdownMenuRadioItem key={language.value} value={language.value}>
              {language.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
