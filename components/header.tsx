import { ReactNode } from "react"
import { Separator } from "./ui/separator"
import { SidebarTrigger } from "./ui/sidebar"

export function Header({
  title,
  actions,
}: {
  title: string
  actions?: ReactNode
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <Separator
          orientation="vertical"
          className="data-[orientation=vertical]:h-14"
        />
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
      {actions}
    </header>
  )
}
