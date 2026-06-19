import { zodResolver } from "@hookform/resolvers/zod"
import { BookOpen, Loader2 } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { z } from "zod"

import { Field } from "@/components/field"
import { LanguageMenu } from "@/components/language-menu"
import { ThemeMenu } from "@/components/theme-menu"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/context/auth-context"
import { api } from "@/lib/api"

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  nickname: z.string().optional(),
})

type AuthFormValues = z.infer<typeof authSchema>

export function AuthScreen() {
  const { t } = useTranslation()
  const { setAuthenticated } = useAuth()
  const [mode, setMode] = useState<"login" | "register">("login")
  const form = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: "",
      password: "",
      nickname: "",
    },
  })

  async function submit(values: AuthFormValues) {
    try {
      const response =
        mode === "login"
          ? await api.login(values.email, values.password)
          : await api.register(
              values.email,
              values.password,
              values.nickname || undefined
            )
      setAuthenticated(response.access_token, response.user)
      toast.success(t("auth.signedIn"))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    }
  }

  const isSubmitting = form.formState.isSubmitting

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4 py-8">
      <div className="fixed right-4 top-4 flex items-center gap-1">
        <LanguageMenu />
        <ThemeMenu />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-3 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BookOpen className="size-5" aria-hidden="true" />
            </div>
            <div>
              <CardTitle>{t("app.admin")}</CardTitle>
              <CardDescription>
                {mode === "login"
                  ? t("auth.loginSubtitle")
                  : t("auth.registerSubtitle")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
            <Field label={t("common.email")}>
              <Input
                type="email"
                autoComplete="email"
                {...form.register("email")}
              />
            </Field>
            {mode === "register" ? (
              <Field label={t("common.nickname")}>
                <Input
                  autoComplete="nickname"
                  {...form.register("nickname")}
                />
              </Field>
            ) : null}
            <Field label={t("common.password")}>
              <Input
                type="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                {...form.register("password")}
              />
            </Field>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : null}
              {mode === "login" ? t("auth.signIn") : t("auth.register")}
            </Button>
          </form>
          <Button
            className="mt-3 w-full"
            variant="ghost"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login"
              ? t("auth.createAccount")
              : t("auth.useExisting")}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
