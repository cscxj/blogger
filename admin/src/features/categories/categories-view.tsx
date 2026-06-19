import { zodResolver } from "@hookform/resolvers/zod"
import { FolderTree, Loader2, Plus, Trash2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { z } from "zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { EmptyState } from "@/components/empty-state"
import { Field } from "@/components/field"
import { Button } from "@/components/ui/button"
import {
  Card,
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
import type { Category, Site } from "@/types"

const categorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
})

type CategoryFormValues = z.infer<typeof categorySchema>

export function CategoriesView({
  token,
  site,
  categories,
}: {
  token: string
  site: Site | null
  categories: Category[]
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      description: "",
    },
  })

  const createMutation = useMutation({
    mutationFn: (values: CategoryFormValues) =>
      api.createCategory(token, site?.id ?? "", {
        name: values.name,
        slug: slugify(values.name),
        description: values.description || null,
      }),
    onSuccess: async () => {
      form.reset()
      toast.success(t("categories.created"))
      await queryClient.invalidateQueries({
        queryKey: queryKeys.categories(token, site?.id ?? null),
      })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : String(error))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (category: Category) =>
      api.deleteCategory(token, site?.id ?? "", category.id),
    onSuccess: async () => {
      toast.success(t("categories.deleted"))
      await queryClient.invalidateQueries({
        queryKey: queryKeys.categories(token, site?.id ?? null),
      })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : String(error))
    },
  })

  function deleteCategory(category: Category) {
    if (window.confirm(t("categories.confirmDelete", { name: category.name }))) {
      deleteMutation.mutate(category)
    }
  }

  if (!site) {
    return (
      <EmptyState
        icon={<FolderTree />}
        title={t("categories.createSiteFirst")}
      />
    )
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>{t("categories.new")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) =>
              createMutation.mutate(values)
            )}
          >
            <Field label={t("categories.name")}>
              <Input {...form.register("name")} />
            </Field>
            <Field label={t("categories.description")}>
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

      <Card>
        <CardHeader>
          <CardTitle>{t("categories.list")}</CardTitle>
          <CardDescription>{site.name}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center justify-between gap-4 rounded-lg border p-3"
            >
              <div className="min-w-0">
                <div className="font-medium">{category.name}</div>
                <div className="text-sm text-muted-foreground">
                  /{category.slug}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => deleteCategory(category)}
                aria-label={t("common.delete")}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
