"use client"

import { Card } from "@/components/ui/card"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

export default function SchedulesPage() {
  return (
    <SidebarInset>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-6" />
        <h1 className="text-lg font-semibold">Schedules</h1>
      </header>
      <div className="flex flex-1 flex-col overflow-auto p-6">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mb-6">
            <p className="text-muted-foreground">
              Configure scheduled webhook deliveries and recurring events
            </p>
          </div>

          <Card className="p-6">
            <div className="flex h-64 items-center justify-center">
              <p className="text-muted-foreground">
                Schedules feature coming soon...
              </p>
            </div>
          </Card>
        </div>
      </div>
    </SidebarInset>
  )
}

