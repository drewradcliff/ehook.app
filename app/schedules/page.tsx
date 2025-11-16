"use client"

import { format } from "date-fns"
import { Plus, Trash2 } from "lucide-react"
import type { FormEvent } from "react"
import { useEffect, useMemo, useState, useTransition } from "react"
import { toast } from "sonner"

import type { CreateScheduleInput, Schedule } from "@/app/actions/schedules"
import {
  createSchedule,
  deleteSchedule,
  listSchedules,
} from "@/app/actions/schedules"
import { Header } from "@/components/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SidebarInset } from "@/components/ui/sidebar"
import { Textarea } from "@/components/ui/textarea"

const INTERVAL_OPTIONS = [
  { value: "minutes", singular: "minute", plural: "minutes", min: 1, max: 59 },
  { value: "hours", singular: "hour", plural: "hours", min: 1, max: 23 },
  { value: "days", singular: "day", plural: "days", min: 1, max: 31 },
] as const

type IntervalUnit = (typeof INTERVAL_OPTIONS)[number]["value"]
type FieldErrors = Partial<Record<keyof CreateScheduleInput, string[]>>

function getIntervalOption(unit: IntervalUnit) {
  return INTERVAL_OPTIONS.find((option) => option.value === unit)!
}

function intervalToCron(value: number, unit: IntervalUnit) {
  if (!Number.isInteger(value) || value <= 0) {
    return { cron: undefined, error: "Interval must be a positive integer." }
  }

  const option = getIntervalOption(unit)
  if (value < option.min || value > option.max) {
    return {
      cron: undefined,
      error: `Choose between ${option.min}-${option.max} ${
        value === 1 ? option.singular : option.plural
      }.`,
    }
  }

  const step = value === 1 ? "*" : `*/${value}`

  if (unit === "minutes") {
    return { cron: value === 1 ? "* * * * *" : `*/${value} * * * *` }
  }

  if (unit === "hours") {
    return { cron: `0 ${step} * * *` }
  }

  return { cron: `0 0 ${step} * *` }
}

function describeInterval(value: number, unit: IntervalUnit) {
  if (!Number.isInteger(value) || value <= 0) {
    return ""
  }

  const option = getIntervalOption(unit)
  const noun = value === 1 ? option.singular : option.plural

  return `${value} ${noun}`
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors || errors.length === 0) {
    return null
  }

  return (
    <div className="space-y-1">
      {errors.map((error, index) => (
        <p key={index} className="text-destructive text-sm">
          {error}
        </p>
      ))}
    </div>
  )
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [destination, setDestination] = useState("")
  const [method, setMethod] = useState<CreateScheduleInput["method"]>("POST")
  const [body, setBody] = useState('{\n  "hello": "world"\n}')
  const [intervalValue, setIntervalValue] = useState("5")
  const [intervalUnit, setIntervalUnit] = useState<IntervalUnit>("minutes")
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  useEffect(() => {
    loadSchedules()
  }, [])

  const loadSchedules = async () => {
    setIsLoading(true)
    const data = await listSchedules()
    setSchedules(data)
    setIsLoading(false)
  }

  const handleDelete = (scheduleId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return
    }

    startTransition(() => {
      deleteSchedule(scheduleId).then((result) => {
        if (result.success) {
          toast.success("Schedule deleted")
          setSchedules((prev) =>
            prev.filter((s) => s.scheduleId !== scheduleId),
          )
        } else {
          toast.error("Failed to delete schedule", {
            description: result.error,
          })
        }
      })
    })
  }

  const intervalNumber = Number(intervalValue)
  const isBodyDisabled = method === "GET"

  const cronResult = useMemo(
    () => intervalToCron(intervalNumber, intervalUnit),
    [intervalNumber, intervalUnit],
  )

  const intervalSummary = useMemo(
    () => describeInterval(intervalNumber, intervalUnit),
    [intervalNumber, intervalUnit],
  )

  const canSubmit =
    Boolean(name.trim()) &&
    Boolean(destination.trim()) &&
    Boolean(cronResult.cron) &&
    !isPending

  const resetForm = () => {
    setName("")
    setDestination("")
    setMethod("POST")
    setBody('{\n  "hello": "world"\n}')
    setIntervalValue("5")
    setIntervalUnit("minutes")
    setFormError(null)
    setFieldErrors({})
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    setFieldErrors({})

    if (!cronResult.cron) {
      setFormError(cronResult.error ?? "Interval is invalid")
      return
    }

    const payload: CreateScheduleInput = {
      name: name.trim(),
      destination: destination.trim(),
      method,
      cron: cronResult.cron,
      body: method === "GET" ? undefined : body.trim() ? body : undefined,
    }

    startTransition(() => {
      createSchedule(payload).then((result) => {
        if (result.success) {
          toast.success("Schedule created", {
            description: `Successfully created schedule: ${name}`,
          })
          setIsDialogOpen(false)
          resetForm()
          loadSchedules()
          return
        }

        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors)
        }

        setFormError(result.error)
        toast.error("Unable to create schedule", {
          description: result.error,
        })
      })
    })
  }

  return (
    <SidebarInset>
      <Header
        title="Schedules"
        actions={
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="size-4" />
            New Schedule
          </Button>
        }
      />
      <div className="flex flex-1 flex-col overflow-auto">
        <div>
          {isLoading ? (
            <div className="flex items-center justify-center pt-10">
              <p className="text-muted-foreground">Loading schedules...</p>
            </div>
          ) : schedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 pt-10">
              <p className="text-muted-foreground">No schedules yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-6 py-4 text-left text-sm font-medium">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium">
                      Destination
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium">
                      Method
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium">
                      Schedule
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium">
                      Created
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((schedule) => (
                    <tr
                      key={schedule.scheduleId}
                      className="border-b last:border-0"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium">
                          {schedule.label || "Untitled"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-muted-foreground max-w-xs truncate text-sm">
                          {schedule.destination}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline">{schedule.method}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-muted-foreground text-xs">
                          {schedule.cron}
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-muted-foreground text-sm">
                          {format(new Date(schedule.createdAt), "MMM d, yyyy")}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleDelete(
                              schedule.scheduleId,
                              schedule.label || "Untitled",
                            )
                          }
                          disabled={isPending}
                        >
                          <Trash2 className="text-destructive size-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Schedule</DialogTitle>
            <DialogDescription>
              Set up automated webhook calls on a precise schedule.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="schedule-name">Schedule name</Label>
              <Input
                id="schedule-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                aria-invalid={Boolean(fieldErrors.name?.length)}
                placeholder="Customer sync"
              />
              <FieldError errors={fieldErrors.name} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="destination">Destination URL</Label>
              <Input
                id="destination"
                type="url"
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                aria-invalid={Boolean(fieldErrors.destination?.length)}
                placeholder="https://api.yourapp.com/webhooks"
              />
              <FieldError errors={fieldErrors.destination} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>HTTP method</Label>
                <Select
                  value={method}
                  onValueChange={(value) =>
                    setMethod(value as CreateScheduleInput["method"])
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {["POST", "PUT", "PATCH", "DELETE", "GET"].map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={fieldErrors.method} />
              </div>

              <div className="space-y-2">
                <Label>Interval</Label>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,120px)_1fr]">
                  <Input
                    type="number"
                    min={1}
                    max={getIntervalOption(intervalUnit).max}
                    value={intervalValue}
                    onChange={(event) => setIntervalValue(event.target.value)}
                  />
                  <Select
                    value={intervalUnit}
                    onValueChange={(value) =>
                      setIntervalUnit(value as IntervalUnit)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Minutes" />
                    </SelectTrigger>
                    <SelectContent>
                      {INTERVAL_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.plural}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">JSON body (optional)</Label>
              <Textarea
                id="body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                aria-invalid={Boolean(fieldErrors.body?.length)}
                placeholder='{"status":"ok"}'
                disabled={isBodyDisabled}
              />
              {isBodyDisabled && (
                <p className="text-muted-foreground text-xs">
                  GET requests cannot include a body.
                </p>
              )}
              <FieldError errors={fieldErrors.body} />
            </div>

            <div className="bg-muted/40 rounded-lg border p-4 text-sm">
              <div className="flex items-center justify-between font-mono text-base">
                <span className="text-muted-foreground">Cron</span>
                <span>{cronResult.cron ?? "—"}</span>
              </div>
              {cronResult.error ? (
                <p className="text-destructive mt-2 text-sm">
                  {cronResult.error}
                </p>
              ) : (
                <p className="text-muted-foreground mt-2 text-xs">
                  Runs every {intervalSummary || "..."} (UTC).
                </p>
              )}
            </div>

            {formError && (
              <p className="text-destructive text-sm">{formError}</p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit}>
                {isPending ? "Creating..." : "Create schedule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SidebarInset>
  )
}
