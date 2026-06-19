import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { SimpleSelect } from "@/components/simple-select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { queryKeys } from "@/hooks/use-blogger-queries"
import { api } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import type { User, UserRole } from "@/types"

export function UsersView({ token, users }: { token: string; users: User[] }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [savingId, setSavingId] = useState("")

  const updateMutation = useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: Partial<Pick<User, "role" | "is_active">> }) =>
      api.updateUser(token, userId, payload),
    onMutate: ({ userId }) => setSavingId(userId),
    onSuccess: async () => {
      toast.success(t("users.saved"))
      await queryClient.invalidateQueries({ queryKey: queryKeys.users(token) })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : String(error)),
    onSettled: () => setSavingId(""),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("nav.users")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.email")}</TableHead>
                <TableHead>{t("common.nickname")}</TableHead>
                <TableHead>{t("users.role")}</TableHead>
                <TableHead>{t("users.state")}</TableHead>
                <TableHead>{t("users.createdAt")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-7">
                        <AvatarImage src={user.avatar_url ?? undefined} />
                        <AvatarFallback>{user.email.slice(0, 1).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span>{user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>{user.nickname}</TableCell>
                  <TableCell>
                    <SimpleSelect
                      className="w-40"
                      value={user.role}
                      onValueChange={(role) =>
                        updateMutation.mutate({ userId: user.id, payload: { role: role as UserRole } })
                      }
                      disabled={savingId === user.id}
                      options={[
                        { value: "super_admin", label: t("users.superAdmin") },
                        { value: "operator", label: t("users.operator") },
                      ]}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={user.is_active ? "outline" : "destructive"}>
                        {user.is_active ? t("common.active") : t("users.inactive")}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={savingId === user.id}
                        onClick={() =>
                          updateMutation.mutate({
                            userId: user.id,
                            payload: { is_active: !user.is_active },
                          })
                        }
                      >
                        {user.is_active ? t("users.disable") : t("users.enable")}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(user.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
