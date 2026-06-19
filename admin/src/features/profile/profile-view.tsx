import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Save } from "lucide-react"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { z } from "zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { Field } from "@/components/field"
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
          <Field label={t("profile.avatarUrl")}>
            <Input {...form.register("avatarUrl")} />
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
