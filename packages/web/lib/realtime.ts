import { Realtime, InferRealtimeEvents } from "@upstash/realtime"
import { redis } from "./redis"
import z from "zod"

const schema = {
  webhook: {
    received: z.object({
      id: z.string(),
      uuid: z.string(),
      type: z.enum(["webhook", "email"]).optional(),
      method: z.string(),
      url: z.string(),
      headers: z.record(z.string(), z.unknown()),
      body: z.any(),
      query: z.record(z.string(), z.unknown()),
      timestamp: z.number(),
      from: z.string().optional(),
      to: z.string().optional(),
      subject: z.string().optional(),
      emailHtml: z.string().optional(),
      emailText: z.string().optional(),
      attachments: z
        .array(
          z.object({
            filename: z.string(),
            contentType: z.string(),
            size: z.number(),
            url: z.string().optional(),
          })
        )
        .optional(),
    }),
  },
}

export const realtime = new Realtime({ schema, redis })
export type RealtimeEvents = InferRealtimeEvents<typeof realtime>
