import { NextRequest, NextResponse } from "next/server"
import { redis } from "@/lib/redis"
import { realtime } from "@/lib/realtime"
import { v4 as uuidv4 } from "uuid"
import { isInboundWebhook, type InboundWebhookPayload } from "@inboundemail/sdk"

export async function POST(request: NextRequest) {
  try {
    // Parse the email payload from Inbound.new
    const payload: InboundWebhookPayload = await request.json()

    if (!isInboundWebhook(payload)) {
      return NextResponse.json(
        { error: "Invalid webhook payload" },
        { status: 400 }
      )
    }

    // Verify this is an email.received event
    if (payload.event !== "email.received") {
      return NextResponse.json(
        { success: false, error: "Invalid event type" },
        { status: 400 }
      )
    }

    // Extract UUID from the recipient email address (UUID@live.ehook.app)
    const recipientEmail = payload.email.recipient
    const uuid = recipientEmail.split("@")[0]

    if (!uuid || !recipientEmail.includes("@live.ehook.app")) {
      return NextResponse.json(
        { success: false, error: "Invalid recipient email" },
        { status: 400 }
      )
    }

    const timestamp = Date.now()
    const eventId = uuidv4()

    // Use the cleaned content for display
    const cleanedContent = payload.email.cleanedContent

    // Convert headers to Record<string, unknown> format
    const headers: Record<string, unknown> = {}
    Object.entries(cleanedContent.headers).forEach(([key, value]) => {
      headers[key] = value
    })

    const emailEvent = {
      id: eventId,
      uuid,
      type: "email" as const,
      method: "EMAIL",
      url: `mailto:${recipientEmail}`,
      headers,
      body: cleanedContent.text || cleanedContent.html || "",
      query: {},
      timestamp,
      from: payload.email.from?.text || "",
      to: payload.email.to?.text || "",
      subject: payload.email.subject ?? undefined,
      emailHtml: cleanedContent.html || undefined,
      emailText: cleanedContent.text || undefined,
      attachments:
        cleanedContent.attachments.length > 0
          ? cleanedContent.attachments
              .filter(
                (att) =>
                  att.filename && att.contentType && att.size !== undefined
              )
              .map((att) => ({
                filename: att.filename!,
                contentType: att.contentType!,
                size: att.size!,
                url: att.downloadUrl,
              }))
          : undefined,
    }

    // Store in Redis (keep last 50 events)
    const redisKey = `webhook:${uuid}:events`

    // Add to sorted set with timestamp as score
    await redis.zadd(redisKey, {
      score: timestamp,
      member: JSON.stringify(emailEvent),
    })

    // Keep only last 50 events
    const count = await redis.zcard(redisKey)
    if (count > 50) {
      await redis.zremrangebyrank(redisKey, 0, count - 51)
    }

    // Emit real-time event to specific channel
    await realtime
      .channel(`webhook:${uuid}`)
      .emit("webhook.received", emailEvent)

    return NextResponse.json(
      { success: true, message: "Email received" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error processing email:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
