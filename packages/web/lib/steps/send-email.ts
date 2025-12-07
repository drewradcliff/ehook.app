/**
 * Send Email Step
 * Sends an email using Inbound SDK with "use step" directive for Vercel Workflows
 */
import "server-only"

import { Inbound } from "@inboundemail/sdk"
import { type StepInput, withStepLogging } from "./step-handler"

type SendEmailResult =
  | {
      success: true
      data: { id?: string; messageId?: string; status: string }
    }
  | { success: false; error: string }

export type SendEmailInput = StepInput & {
  emailTo: string
  emailSubject: string
  emailBody?: string
}

/**
 * Send email logic (pure business logic, no step concerns)
 */
async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const { emailTo, emailSubject, emailBody } = input

  if (!emailTo) {
    return {
      success: false,
      error: "Send email failed: recipient email (to) is required",
    }
  }

  if (!emailSubject) {
    return {
      success: false,
      error: "Send email failed: subject is required",
    }
  }

  const apiKey = process.env.INBOUND_API_KEY
  if (!apiKey) {
    return {
      success: false,
      error:
        "Send email failed: INBOUND_API_KEY environment variable is not configured",
    }
  }

  const fromEmail = process.env.INBOUND_FROM_EMAIL
  if (!fromEmail) {
    return {
      success: false,
      error:
        "Send email failed: INBOUND_FROM_EMAIL environment variable is not configured",
    }
  }

  try {
    const inbound = new Inbound(apiKey)

    const response = await inbound.email.send({
      from: fromEmail,
      to: emailTo,
      subject: emailSubject,
      text: emailBody || "",
    })

    if (response.error) {
      return {
        success: false,
        error: `Send email failed: ${response.error}`,
      }
    }

    return {
      success: true,
      data: {
        id: response.data?.id,
        messageId: response.data?.messageId,
        status: response.data?.status || "sent",
      },
    }
  } catch (error) {
    return {
      success: false,
      error: `Send email failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

/**
 * Send Email Step with Vercel Workflow support
 * Uses "use step" directive for durability and observability
 */
// eslint-disable-next-line @typescript-eslint/require-await
export async function sendEmailStep(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  "use step"
  return withStepLogging(input, () => sendEmail(input))
}
sendEmailStep.maxRetries = 0

