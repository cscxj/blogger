import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Save, Upload } from "lucide-react"
import { useEffect } from "react"
import { useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { z } from "zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { Field } from "@/components/field"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { queryKeys } from "@/hooks/use-blogger-queries"
import { api } from "@/lib/api"
import type { User } from "@/types"

const profileSchema = z.object({
  nickname: z.string().optional(),
  avatarUrl: z.string().optional(),
})

type ProfileFormValues = z.infer<typeof profileSchema>

export function ProfileView({
  token,
  user,
  onUserChange,
}: {
  token: string
  user: User
  onUserChange: (user: User) => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      nickname: user.nickname || "",
      avatarUrl: user.avatar_url || "",
    },
  })
  const avatarUrl = useWatch({ control: form.control, name: "avatarUrl" })

  useEffect(() => {
    form.reset({
      nickname: user.nickname || "",
      avatarUrl: user.avatar_url || "",
    })
  }, [form, user])

  const updateMutation = useMutation({
    mutationFn: (values: ProfileFormValues) =>
      api.updateMe(token, {
        nickname: values.nickname || null,
        avatar_url: values.avatarUrl || null,
      }),
    onSuccess: async (saved) => {
      onUserChange(saved)
      toast.success(t("profile.saved"))
      await queryClient.invalidateQueries({ queryKey: queryKeys.me(token) })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : String(error))
    },
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.uploadImage(token, file, "avatar"),
    onSuccess: (response) => {
      form.setValue("avatarUrl", response.url, { shouldDirty: true })
      toast.success(t("uploads.avatarUploaded"))
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : String(error))
    },
  })

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{t("profile.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))}
        >
          <Field label={t("common.email")}>
            <Input value={user.email} readOnly />
          </Field>
          <Field label={t("common.nickname")}>
            <Input {...form.register("nickname")} />
          </Field>
          <Field label={t("profile.avatar")}>
            <div className="flex items-center gap-4">
              <Avatar className="size-16">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback>{user.email.slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex flex-1 items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) uploadMutation.mutate(file)
                  }}
                />
                <Button type="button" variant="outline" size="icon" disabled={uploadMutation.isPending}>
                  {uploadMutation.isPending ? <Loader2 className="animate-spin" /> : <Upload />}
                </Button>
              </div>
            </div>
          </Field>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Save />
            )}
            {t("common.save")}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
