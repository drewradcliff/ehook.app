"use server"

import { z } from "zod"

import { qstash } from "@/lib/qstash"

const scheduleSchema = z.object({
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(64)
    .regex(
      /^[a-zA-Z0-9._-]+$/,
      "Name must be alphanumeric, hyphen, underscore, or period",
    ),
  destination: z.url("Enter a valid URL"),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  cron: z.string().min(5, "Cron expression is required"),
  body: z.string().optional(),
})

export type CreateScheduleInput = z.infer<typeof scheduleSchema>

export type CreateScheduleResult =
  | {
      success: true
      scheduleId: string
    }
  | {
      success: false
      error: string
      fieldErrors?: Record<string, string[]>
    }

export async function createSchedule(
  input: CreateScheduleInput,
): Promise<CreateScheduleResult> {
  const parsed = scheduleSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    }
  }

  const { name, cron, destination, method, body } = parsed.data

  if (method === "GET" && body && body.trim().length > 0) {
    return {
      success: false,
      error: "GET requests cannot include a request body",
    }
  }

  let normalizedBody: string | undefined
  const headers: Record<string, string> = {}

  if (body && body.trim().length > 0) {
    try {
      const parsedBody = JSON.parse(body)
      normalizedBody = JSON.stringify(parsedBody)
      headers["Content-Type"] = "application/json"
    } catch {
      return {
        success: false,
        error: "Body must be valid JSON",
      }
    }
  }

  try {
    const response = await qstash.schedules.create({
      destination,
      cron,
      method,
      body: normalizedBody,
      headers: Object.keys(headers).length ? headers : undefined,
      label: name,
    })

    return {
      success: true,
      scheduleId: response.scheduleId,
    }
  } catch (error) {
    console.error("Error creating schedule:", error)
    return {
      success: false,
      error: "Failed to create schedule. Please try again.",
    }
  }
}

export type Schedule = {
  scheduleId: string
  cron: string
  destination: string
  method: string
  body?: string
  createdAt: number
  label?: string
}

export async function listSchedules(): Promise<Schedule[]> {
  try {
    const schedules = await qstash.schedules.list()
    return schedules as Schedule[]
  } catch (error) {
    console.error("Error listing schedules:", error)
    return []
  }
}

export type DeleteScheduleResult =
  | { success: true }
  | { success: false; error: string }

export async function deleteSchedule(
  scheduleId: string,
): Promise<DeleteScheduleResult> {
  try {
    await qstash.schedules.delete(scheduleId)
    return { success: true }
  } catch (error) {
    console.error("Error deleting schedule:", error)
    return {
      success: false,
      error: "Failed to delete schedule. Please try again.",
    }
  }
}
