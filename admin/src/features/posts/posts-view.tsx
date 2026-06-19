import { zodResolver } from "@hookform/resolvers/zod"
import {
  FileText,
  Globe2,
  Loader2,
  Plus,
  Save,
  Search,
  Trash2,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { z } from "zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { EmptyState } from "@/components/empty-state"
import { Field } from "@/components/field"
import { SimpleSelect } from "@/components/simple-select"
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
import { formatDate, slugify } from "@/lib/utils"
import type { Category, Post, PostPayload, Site } from "@/types"

const NONE_VALUE = "__none__"

const postSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  status: z.enum(["draft", "published"]),
  markdownContent: z.string(),
  categoryId: z.string(),
  excerpt: z.string().optional(),
  coverImageUrl: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  canonicalUrl: z.string().optional(),
})

type PostFormValues = z.infer<typeof postSchema>

const emptyPostForm: PostFormValues = {
  title: "",
  slug: "",
  status: "draft",
  markdownContent: "",
  categoryId: NONE_VALUE,
  excerpt: "",
  coverImageUrl: "",
  metaTitle: "",
  metaDescription: "",
  canonicalUrl: "",
}

export function PostsView({
  token,
  site,
  categories,
  posts,
}: {
  token: string
  site: Site | null
  categories: Category[]
  posts: Post[]
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [query, setQuery] = useState("")
  const [editing, setEditing] = useState<Post | null>(null)
  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: emptyPostForm,
  })

  useEffect(() => {
    form.reset(editing ? formFromPost(editing) : emptyPostForm)
  }, [editing, form])

  const filteredPosts = useMemo(() => {
    const value = query.toLowerCase()
    return posts.filter((post) => {
      return (
        post.title.toLowerCase().includes(value) ||
        post.slug.toLowerCase().includes(value)
      )
    })
  }, [posts, query])

  const saveMutation = useMutation({
    mutationFn: ({
      values,
      postId,
    }: {
      values: PostFormValues
      postId?: string
    }) => {
      const payload = normalizePostPayload(values)
      if (postId) {
        return api.updatePost(token, site?.id ?? "", postId, payload)
      }
      return api.createPost(token, site?.id ?? "", payload)
    },
    onSuccess: async (saved) => {
      setEditing(saved)
      toast.success(t("posts.saved"))
      await queryClient.invalidateQueries({
        queryKey: queryKeys.posts(token, site?.id ?? null),
      })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : String(error))
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({
      post,
      action,
    }: {
      post: Post
      action: "publish" | "unpublish"
    }) =>
      action === "publish"
        ? api.publishPost(token, site?.id ?? "", post.id)
        : api.unpublishPost(token, site?.id ?? "", post.id),
    onSuccess: async (saved, variables) => {
      if (editing?.id === saved.id) {
        setEditing(saved)
      }
      toast.success(
        variables.action === "publish"
          ? t("posts.publishedMessage")
          : t("posts.draftMessage")
      )
      await queryClient.invalidateQueries({
        queryKey: queryKeys.posts(token, site?.id ?? null),
      })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : String(error))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (post: Post) => api.deletePost(token, site?.id ?? "", post.id),
    onSuccess: async (_value, deletedPost) => {
      if (editing?.id === deletedPost.id) {
        setEditing(null)
      }
      toast.success(t("posts.deleted"))
      await queryClient.invalidateQueries({
        queryKey: queryKeys.posts(token, site?.id ?? null),
      })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : String(error))
    },
  })

  function submit(values: PostFormValues) {
    saveMutation.mutate({
      values,
      postId: editing?.id,
    })
  }

  function deletePost(post: Post) {
    if (window.confirm(t("posts.confirmDelete", { title: post.title }))) {
      deleteMutation.mutate(post)
    }
  }

  function handleTitleChange(value: string) {
    form.setValue("title", value, { shouldDirty: true })
    if (!form.getValues("slug")) {
      form.setValue("slug", slugify(value), { shouldDirty: true })
    }
  }

  if (!site) {
    return <EmptyState icon={<Globe2 />} title={t("posts.createSiteFirst")} />
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(320px,420px),1fr]">
      <Card className="content-start">
        <CardHeader>
          <div>
            <CardTitle>{t("nav.posts")}</CardTitle>
            <CardDescription>{site.name}</CardDescription>
          </div>
          <CardAction>
            <Button variant="secondary" size="sm" onClick={() => setEditing(null)}>
              <Plus />
              {t("common.new")}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder={t("posts.search")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="max-h-[calc(100svh-230px)] space-y-2 overflow-auto pr-1">
            {filteredPosts.map((post) => (
              <button
                key={post.id}
                type="button"
                onClick={() => setEditing(post)}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  editing?.id === post.id
                    ? "border-primary bg-muted"
                    : "bg-card hover:bg-muted"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {post.title}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {t("posts.path", { slug: post.slug })}
                    </div>
                  </div>
                  <Badge
                    variant={post.status === "published" ? "default" : "outline"}
                  >
                    {post.status === "published"
                      ? t("common.published")
                      : t("common.draft")}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <FileText className="size-3" />
                  {post.author.nickname || post.author.email}
                  <span>{formatDate(post.updated_at)}</span>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>
                {editing ? t("posts.edit") : t("posts.new")}
              </CardTitle>
              <CardDescription>
                {editing ? editing.id : site.slug}
              </CardDescription>
            </div>
            <CardAction className="flex items-center gap-2">
              {editing ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    statusMutation.mutate({
                      post: editing,
                      action:
                        editing.status === "published"
                          ? "unpublish"
                          : "publish",
                    })
                  }
                >
                  {editing.status === "published"
                    ? t("posts.unpublish")
                    : t("posts.publish")}
                </Button>
              ) : null}
              {editing ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-sm"
                  onClick={() => deletePost(editing)}
                  aria-label={t("common.delete")}
                >
                  <Trash2 />
                </Button>
              ) : null}
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Save />
                )}
                {t("common.save")}
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("posts.title")}>
                <Controller
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <Input
                      value={field.value}
                      onChange={(event) => handleTitleChange(event.target.value)}
                    />
                  )}
                />
              </Field>
              <Field label={t("posts.slug")}>
                <Controller
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <Input
                      value={field.value}
                      onChange={(event) =>
                        form.setValue("slug", slugify(event.target.value), {
                          shouldDirty: true,
                        })
                      }
                    />
                  )}
                />
              </Field>
              <Field label={t("posts.status")}>
                <Controller
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <SimpleSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      options={[
                        { value: "draft", label: t("common.draft") },
                        {
                          value: "published",
                          label: t("common.published"),
                        },
                      ]}
                    />
                  )}
                />
              </Field>
              <Field label={t("posts.category")}>
                <Controller
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <SimpleSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      options={[
                        { value: NONE_VALUE, label: t("common.none") },
                        ...categories.map((category) => ({
                          value: category.id,
                          label: category.name,
                        })),
                      ]}
                    />
                  )}
                />
              </Field>
            </div>
            <Field label={t("posts.markdown")}>
              <Textarea
                className="min-h-72 font-mono"
                {...form.register("markdownContent")}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("posts.seo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("posts.metaTitle")}>
                <Input {...form.register("metaTitle")} />
              </Field>
              <Field label={t("posts.canonicalUrl")}>
                <Input {...form.register("canonicalUrl")} />
              </Field>
            </div>
            <Field label={t("posts.metaDescription")}>
              <Textarea
                className="min-h-20"
                {...form.register("metaDescription")}
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("posts.coverImage")}>
                <Input {...form.register("coverImageUrl")} />
              </Field>
              <Field label={t("posts.excerpt")}>
                <Input {...form.register("excerpt")} />
              </Field>
            </div>
          </CardContent>
        </Card>

        {editing ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("posts.htmlPreview")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="prose-preview rounded-lg border bg-background p-4"
                dangerouslySetInnerHTML={{ __html: editing.html_content }}
              />
            </CardContent>
          </Card>
        ) : null}
      </form>
    </div>
  )
}

function formFromPost(post: Post): PostFormValues {
  return {
    title: post.title,
    slug: post.slug,
    status: post.status,
    markdownContent: post.markdown_content,
    categoryId: post.category_id || NONE_VALUE,
    excerpt: post.excerpt || "",
    coverImageUrl: post.cover_image_url || "",
    metaTitle: post.meta_title || "",
    metaDescription: post.meta_description || "",
    canonicalUrl: post.canonical_url || "",
  }
}

function normalizePostPayload(values: PostFormValues): PostPayload {
  return {
    title: values.title,
    slug: values.slug,
    status: values.status,
    markdown_content: values.markdownContent,
    excerpt: values.excerpt || null,
    cover_image_url: values.coverImageUrl || null,
    meta_title: values.metaTitle || null,
    meta_description: values.metaDescription || null,
    canonical_url: values.canonicalUrl || null,
    category_id: values.categoryId === NONE_VALUE ? null : values.categoryId,
  }
}
