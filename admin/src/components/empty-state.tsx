import type { ReactNode } from "react"

import { Card, CardContent } from "@/components/ui/card"

export function EmptyState({
  icon,
  title,
}: {
  icon: ReactNode
  title: string
}) {
  return (
    <Card className="min-h-60 justify-center">
      <CardContent className="flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground [&>svg]:size-5">
            {icon}
          </div>
          <div className="font-medium">{title}</div>
        </div>
      </CardContent>
    </Card>
  )
}
