import { zodResolver } from "@hookform/resolvers/zod"
import { Check, Globe2, Loader2, Plus, Trash2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { z } from "zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { Field } from "@/components/field"
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
import { slugify } from "@/lib/utils"
import type { Site } from "@/types"

const siteSchema = z.object({
  name: z.string().min(1),
  baseUrl: z.string().optional(),
  description: z.string().optional(),
})

type SiteFormValues = z.infer<typeof siteSchema>

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
    },
  })

  const createMutation = useMutation({
    mutationFn: (values: SiteFormValues) =>
      api.createSite(token, {
        name: values.name,
        slug: slugify(values.name),
        base_url: values.baseUrl || null,
        description: values.description || null,
      }),
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
    <div className="grid gap-4 xl:grid-cols-[420px,1fr]">
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
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Globe2 className="size-4" />
                </div>
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelectSite(site.id)}
              >
                {t("common.select")}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
