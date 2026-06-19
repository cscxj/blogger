import { zodResolver } from "@hookform/resolvers/zod"
import { Check, Loader2, Plus, Trash2 } from "lucide-react"
import { useEffect } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import type { UseFormRegisterReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { z } from "zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { Field } from "@/components/field"
import { SiteIcon } from "@/components/site-select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { queryKeys } from "@/hooks/use-blogger-queries"
import { api } from "@/lib/api"
import { defaultSiteLanguages } from "@/lib/languages"
import { slugify } from "@/lib/utils"
import type { Site } from "@/types"

const languageSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/),
  label: z.string().trim().min(1).max(120),
})

const languagesSchema = z.array(languageSchema).min(1).max(50).superRefine((languages, context) => {
  const keys = new Set<string>()
  languages.forEach((language, index) => {
    if (keys.has(language.key)) {
      context.addIssue({
        code: "custom",
        message: "Language keys must be unique",
        path: [index, "key"],
      })
    }
    keys.add(language.key)
  })
})

const siteSchema = z.object({
  name: z.string().min(1),
  baseUrl: z.string().optional(),
  description: z.string().optional(),
  languages: languagesSchema,
})

type SiteFormValues = z.infer<typeof siteSchema>
type LanguagesFormValues = Pick<SiteFormValues, "languages">

export function SitesView({
  token,
  sites,
  selectedSiteId,
  onSelectSite,
}: {
  token: string
  sites: Site[]
  selectedSiteId: string
  onSelectSite: (id: string) => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const form = useForm<SiteFormValues>({
    resolver: zodResolver(siteSchema),
    defaultValues: {
      name: "",
      baseUrl: "",
      description: "",
      languages: defaultSiteLanguages,
    },
  })
  const createLanguages = useFieldArray({ control: form.control, name: "languages" })

  const createMutation = useMutation({
    mutationFn: (values: SiteFormValues) => {
      const slug = slugify(values.name)
      if (!slug) {
        throw new Error(t("sites.slugRequired"))
      }

      return api.createSite(token, {
        name: values.name,
        slug,
        base_url: values.baseUrl || null,
        description: values.description || null,
        languages: values.languages,
      })
    },
    onSuccess: async (site) => {
      form.reset()
      onSelectSite(site.id)
      toast.success(t("sites.created"))
      await queryClient.invalidateQueries({ queryKey: queryKeys.sites(token) })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : String(error))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (site: Site) => api.deleteSite(token, site.id),
    onSuccess: async (_value, deletedSite) => {
      const nextSites = sites.filter((site) => site.id !== deletedSite.id)
      onSelectSite(nextSites[0]?.id ?? "")
      toast.success(t("sites.deleted"))
      await queryClient.invalidateQueries({ queryKey: queryKeys.sites(token) })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : String(error))
    },
  })

  function deleteSite(site: Site) {
    if (window.confirm(t("sites.confirmDelete", { name: site.name }))) {
      deleteMutation.mutate(site)
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>{t("sites.new")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) =>
              createMutation.mutate(values)
            )}
          >
            <Field label={t("sites.name")}>
              <Input {...form.register("name")} />
            </Field>
            <Field label={t("sites.baseUrl")}>
              <Input
                placeholder="https://example.com"
                {...form.register("baseUrl")}
              />
            </Field>
            <Field label={t("sites.description")}>
              <Textarea {...form.register("description")} />
            </Field>
            <LanguageFields
              fields={createLanguages.fields}
              registerKey={(index) => form.register(`languages.${index}.key`)}
              registerLabel={(index) => form.register(`languages.${index}.label`)}
              onAdd={() => createLanguages.append({ key: "", label: "" })}
              onRemove={createLanguages.remove}
              removeDisabled={createLanguages.fields.length <= 1}
            />
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Plus />
              )}
              {t("common.create")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid content-start gap-3 md:grid-cols-2">
        {sites.map((site) => (
          <Card
            key={site.id}
            className={selectedSiteId === site.id ? "ring-primary" : undefined}
          >
            <CardHeader>
              <div className="flex min-w-0 items-start gap-3">
                <SiteIcon site={site} className="size-8" />
                <div className="min-w-0">
                  <CardTitle className="truncate">{site.name}</CardTitle>
                  <CardDescription className="truncate">
                    {site.slug}
                  </CardDescription>
                </div>
              </div>
              <CardAction className="flex items-center gap-1">
                {selectedSiteId === site.id ? (
                  <Badge variant="outline">
                    <Check />
                    {t("common.select")}
                  </Badge>
                ) : null}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => deleteSite(site)}
                  aria-label={t("common.delete")}
                >
                  <Trash2 />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-3">
              {site.base_url ? (
                <div className="truncate text-sm text-muted-foreground">
                  {site.base_url}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {site.languages.map((language) => (
                  <Badge key={language.key} variant="secondary">
                    {language.label} ({language.key})
                  </Badge>
                ))}
              </div>
              <SiteLanguagesEditor token={token} site={site} />
              <Button variant="outline" size="sm" onClick={() => onSelectSite(site.id)}>
                {t("common.select")}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function SiteLanguagesEditor({ token, site }: { token: string; site: Site }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const form = useForm<LanguagesFormValues>({
    resolver: zodResolver(z.object({ languages: languagesSchema })),
    defaultValues: { languages: site.languages.length ? site.languages : defaultSiteLanguages },
  })
  const languages = useFieldArray({ control: form.control, name: "languages" })
  const updateMutation = useMutation({
    mutationFn: (values: LanguagesFormValues) => api.updateSite(token, site.id, { languages: values.languages }),
    onSuccess: async () => {
      toast.success(t("sites.languagesSaved"))
      await queryClient.invalidateQueries({ queryKey: queryKeys.sites(token) })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : String(error)),
  })

  useEffect(() => {
    form.reset({ languages: site.languages.length ? site.languages : defaultSiteLanguages })
  }, [form, site.languages])

  return (
    <form className="space-y-3 rounded-lg border p-3" onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))}>
      <LanguageFields
        fields={languages.fields}
        registerKey={(index) => form.register(`languages.${index}.key`)}
        registerLabel={(index) => form.register(`languages.${index}.label`)}
        onAdd={() => languages.append({ key: "", label: "" })}
        onRemove={languages.remove}
        removeDisabled={languages.fields.length <= 1}
      />
      <Button type="submit" size="sm" disabled={updateMutation.isPending}>
        {updateMutation.isPending ? <Loader2 className="animate-spin" /> : <Check />}
        {t("sites.saveLanguages")}
      </Button>
    </form>
  )
}

function LanguageFields({
  fields,
  registerKey,
  registerLabel,
  onAdd,
  onRemove,
  removeDisabled,
}: {
  fields: Array<{ id: string }>
  registerKey: (index: number) => UseFormRegisterReturn
  registerLabel: (index: number) => UseFormRegisterReturn
  onAdd: () => void
  onRemove: (index: number) => void
  removeDisabled: boolean
}) {
  const { t } = useTranslation()

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{t("sites.languages")}</div>
      {fields.map((field, index) => (
        <div key={field.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <Input placeholder={t("sites.languageKey")} {...registerKey(index)} />
          <Input placeholder={t("sites.languageLabel")} {...registerLabel(index)} />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={removeDisabled}
            onClick={() => onRemove(index)}
            aria-label={t("common.delete")}
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={onAdd}>
        <Plus />
        {t("sites.addLanguage")}
      </Button>
    </div>
  )
}
