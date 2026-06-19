import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { Site } from "@/types"

export function SiteSelect({
  value,
  onValueChange,
  sites,
  placeholder,
  className,
}: {
  value: string
  onValueChange: (value: string) => void
  sites: Site[]
  placeholder: string
  className?: string
}) {
  const selected = sites.find((site) => site.id === value)

  return (
    <Select value={value} onValueChange={onValueChange} disabled={sites.length === 0}>
      <SelectTrigger className={cn("w-full", className)} aria-label={placeholder}>
        {selected ? (
          <span className="flex min-w-0 items-center gap-2">
            <SiteIcon site={selected} />
            <span className="truncate">{selected.name}</span>
          </span>
        ) : (
          <SelectValue placeholder={placeholder} />
        )}
      </SelectTrigger>
      <SelectContent>
        {sites.map((site) => (
          <SelectItem key={site.id} value={site.id}>
            <span className="flex min-w-0 items-center gap-2">
              <SiteIcon site={site} />
              <span className="truncate">{site.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function SiteIcon({ site, className }: { site: Site; className?: string }) {
  return (
    <Avatar className={cn("size-5 rounded-md", className)}>
      <AvatarImage src={site.icon_url ?? undefined} />
      <AvatarFallback className="rounded-md text-[10px]">
        {site.name.slice(0, 1).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  )
}
