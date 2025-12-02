/**
 * Workflow executor for running workflows
 * Handles trigger and action node execution with proper logging
 */

import { db } from "@/db"
import { workflowExecutionLogs, workflowExecutions } from "@/db/schema"
import { Inbound } from "@inboundemail/sdk"
import { eq } from "drizzle-orm"
import type { WorkflowEdge, WorkflowNode } from "./workflow-store"

type ExecutionResult = {
  success: boolean
  data?: unknown
  error?: string
}

type NodeOutputs = Record<string, { label: string; data: unknown }>

export type WorkflowExecutionInput = {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  triggerInput?: Record<string, unknown>
  executionId: string
  workflowId: string
}

export type StepContext = {
  executionId: string
  nodeId: string
  nodeName: string
  nodeType: string
}

/**
 * Process template variables in config
 * Replaces {{@nodeId:Label.field}} with actual values from previous node outputs
 */
function processTemplates(
  config: Record<string, unknown>,
  outputs: NodeOutputs,
): Record<string, unknown> {
  const processed: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(config)) {
    if (typeof value === "string") {
      let processedValue = value
      const templatePattern = /\{\{@([^:]+):([^}]+)\}\}/g
      processedValue = processedValue.replace(
        templatePattern,
        (match, nodeId, rest) => {
          const sanitizedNodeId = nodeId.replace(/[^a-zA-Z0-9]/g, "_")
          const output = outputs[sanitizedNodeId]
          if (!output) {
            return match
          }

          const dotIndex = rest.indexOf(".")
          if (dotIndex === -1) {
            const data = output.data
            if (data === null || data === undefined) {
              return ""
            }
            if (typeof data === "object") {
              return JSON.stringify(data)
            }
            return String(data)
          }

          if (output.data === null || output.data === undefined) {
            return ""
          }

          const fieldPath = rest.substring(dotIndex + 1)
          const fields = fieldPath.split(".")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let current: any = output.data

          for (const field of fields) {
            if (current && typeof current === "object") {
              current = current[field]
            } else {
              return ""
            }
          }

          if (current === null || current === undefined) {
            return ""
          }
          if (typeof current === "object") {
            return JSON.stringify(current)
          }
          return String(current)
        },
      )

      processed[key] = processedValue
    } else {
      processed[key] = value
    }
  }

  return processed
}

/**
 * Log step start - direct database write
 */
async function logStepStart(
  context: StepContext,
  input: unknown,
): Promise<{ logId: string; startTime: number }> {
  try {
    const [log] = await db
      .insert(workflowExecutionLogs)
      .values({
        executionId: context.executionId,
        nodeId: context.nodeId,
        nodeName: context.nodeName,
        nodeType: context.nodeType,
        status: "running",
        input,
        startedAt: new Date(),
      })
      .returning()

    return {
      logId: log.id,
      startTime: Date.now(),
    }
  } catch (error) {
    console.error("[Workflow Executor] Failed to log step start:", error)
    return { logId: "", startTime: Date.now() }
  }
}

/**
 * Log step completion - direct database write
 */
async function logStepComplete(
  logId: string,
  startTime: number,
  status: "success" | "error",
  output?: unknown,
  error?: string,
): Promise<void> {
  if (!logId) return

  try {
    const duration = Date.now() - startTime
    await db
      .update(workflowExecutionLogs)
      .set({
        status,
        output,
        error,
        completedAt: new Date(),
        durationMs: duration.toString(),
      })
      .where(eq(workflowExecutionLogs.id, logId))
  } catch (err) {
    console.error("[Workflow Executor] Failed to log step complete:", err)
  }
}

/**
 * Log workflow completion - direct database write
 */
async function logWorkflowComplete(
  executionId: string,
  status: "success" | "error",
  startTime: number,
  output?: unknown,
  error?: string,
): Promise<void> {
  try {
    const duration = Date.now() - startTime
    await db
      .update(workflowExecutions)
      .set({
        status,
        output,
        error,
        completedAt: new Date(),
        durationMs: duration.toString(),
      })
      .where(eq(workflowExecutions.id, executionId))
  } catch (err) {
    console.error("[Workflow Executor] Failed to log workflow complete:", err)
  }
}

/**
 * Execute HTTP request action
 */
async function executeHttpRequest(
  config: Record<string, unknown>,
): Promise<ExecutionResult> {
  const endpoint = config.endpoint as string
  const method = (config.httpMethod as string) || "POST"
  const headersStr = config.httpHeaders as string | undefined
  const bodyStr = config.httpBody as string | undefined

  if (!endpoint) {
    return {
      success: false,
      error: "HTTP request failed: URL is required",
    }
  }

  try {
    // Parse headers
    let headers: Record<string, string> = {}
    if (headersStr) {
      try {
        headers = JSON.parse(headersStr)
      } catch {
        // Ignore parse errors
      }
    }

    // Parse body
    let body: string | undefined
    if (method !== "GET" && bodyStr) {
      try {
        const parsedBody = JSON.parse(bodyStr)
        body =
          Object.keys(parsedBody).length > 0
            ? JSON.stringify(parsedBody)
            : undefined
      } catch {
        const trimmed = bodyStr.trim()
        body = trimmed && trimmed !== "{}" ? bodyStr : undefined
      }
    }

    const response = await fetch(endpoint, {
      method,
      headers,
      body,
    })

    // Parse response
    const contentType = response.headers.get("content-type")
    let data: unknown
    if (contentType?.includes("application/json")) {
      data = await response.json()
    } else {
      data = await response.text()
    }

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP request failed with status ${response.status}`,
        data,
      }
    }

    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: `HTTP request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

/**
 * Execute Send Email action using Inbound SDK
 */
async function executeSendEmail(
  config: Record<string, unknown>,
): Promise<ExecutionResult> {
  const to = config.emailTo as string
  const subject = config.emailSubject as string
  const body = config.emailBody as string

  if (!to) {
    return {
      success: false,
      error: "Send email failed: recipient email (to) is required",
    }
  }

  if (!subject) {
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
      to,
      subject,
      text: body,
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
 * Execute a single action step
 */
async function executeActionStep(
  actionType: string,
  config: Record<string, unknown>,
  context: StepContext,
  outputs: NodeOutputs,
): Promise<ExecutionResult> {
  // Process templates in config
  const processedConfig = processTemplates(config, outputs)

  // Log step start
  const { logId, startTime } = await logStepStart(context, processedConfig)

  let result: ExecutionResult

  try {
    switch (actionType) {
      case "HTTP Request":
        result = await executeHttpRequest(processedConfig)
        break
      case "Send Email":
        result = await executeSendEmail(processedConfig)
        break
      default:
        result = {
          success: false,
          error: `Unknown action type: ${actionType}`,
        }
    }

    // Log step completion
    await logStepComplete(
      logId,
      startTime,
      result.success ? "success" : "error",
      result.data,
      result.error,
    )

    return result
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error"
    await logStepComplete(logId, startTime, "error", undefined, errorMessage)
    return { success: false, error: errorMessage }
  }
}

/**
 * Main workflow executor function
 */
export async function executeWorkflow(
  input: WorkflowExecutionInput,
): Promise<{ success: boolean; results: Record<string, ExecutionResult> }> {
  console.log("[Workflow Executor] Starting workflow execution")

  const { nodes, edges, triggerInput = {}, executionId, workflowId } = input

  console.log("[Workflow Executor] Input:", {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    executionId,
    workflowId,
  })

  const outputs: NodeOutputs = {}
  const results: Record<string, ExecutionResult> = {}
  const workflowStartTime = Date.now()

  // Build node and edge maps
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const edgesBySource = new Map<string, string[]>()
  for (const edge of edges) {
    const targets = edgesBySource.get(edge.source) || []
    targets.push(edge.target)
    edgesBySource.set(edge.source, targets)
  }

  // Find trigger nodes (nodes with no incoming edges)
  const nodesWithIncoming = new Set(edges.map((e) => e.target))
  const triggerNodes = nodes.filter(
    (node) => node.data.type === "trigger" && !nodesWithIncoming.has(node.id),
  )

  console.log("[Workflow Executor] Found", triggerNodes.length, "trigger nodes")

  // Helper to get a meaningful node name
  function getNodeName(node: WorkflowNode): string {
    if (node.data.label) {
      return node.data.label
    }
    if (node.data.type === "action") {
      const actionType = node.data.config?.actionType as string
      return actionType || "Action"
    }
    if (node.data.type === "trigger") {
      return (node.data.config?.triggerType as string) || "Trigger"
    }
    return node.data.type
  }

  // Helper to execute a single node
  async function executeNode(
    nodeId: string,
    visited: Set<string> = new Set(),
  ): Promise<void> {
    console.log("[Workflow Executor] Executing node:", nodeId)

    if (visited.has(nodeId)) {
      console.log("[Workflow Executor] Node already visited, skipping")
      return
    }
    visited.add(nodeId)

    const node = nodeMap.get(nodeId)
    if (!node) {
      console.log("[Workflow Executor] Node not found:", nodeId)
      return
    }

    const context: StepContext = {
      executionId,
      nodeId: node.id,
      nodeName: getNodeName(node),
      nodeType: node.data.type,
    }

    try {
      let result: ExecutionResult

      if (node.data.type === "trigger") {
        console.log("[Workflow Executor] Executing trigger node")

        // Log trigger step
        const { logId, startTime } = await logStepStart(context, triggerInput)

        const triggerData = {
          triggered: true,
          timestamp: Date.now(),
          ...triggerInput,
        }

        result = { success: true, data: triggerData }

        await logStepComplete(logId, startTime, "success", triggerData)
      } else if (node.data.type === "action") {
        const config = node.data.config || {}
        const actionType = config.actionType as string | undefined

        console.log("[Workflow Executor] Executing action node:", actionType)

        if (!actionType) {
          result = {
            success: false,
            error: `Action node "${node.data.label || node.id}" has no action type configured`,
          }
        } else {
          result = await executeActionStep(actionType, config, context, outputs)
        }
      } else {
        console.log("[Workflow Executor] Unknown node type:", node.data.type)
        result = {
          success: false,
          error: `Unknown node type: ${node.data.type}`,
        }
      }

      // Store results
      results[nodeId] = result

      // Store outputs for template processing
      const sanitizedNodeId = nodeId.replace(/[^a-zA-Z0-9]/g, "_")
      outputs[sanitizedNodeId] = {
        label: node.data.label || nodeId,
        data: result.data,
      }

      console.log("[Workflow Executor] Node execution completed:", {
        nodeId,
        success: result.success,
      })

      // Execute next nodes if successful
      if (result.success) {
        const nextNodes = edgesBySource.get(nodeId) || []
        console.log(
          "[Workflow Executor] Executing",
          nextNodes.length,
          "next nodes",
        )
        await Promise.all(
          nextNodes.map((nextNodeId) => executeNode(nextNodeId, visited)),
        )
      }
    } catch (error) {
      console.error("[Workflow Executor] Error executing node:", nodeId, error)
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error"
      results[nodeId] = { success: false, error: errorMessage }
    }
  }

  // Execute from each trigger node
  try {
    console.log("[Workflow Executor] Starting execution from trigger nodes")

    await Promise.all(triggerNodes.map((trigger) => executeNode(trigger.id)))

    const finalSuccess = Object.values(results).every((r) => r.success)

    console.log("[Workflow Executor] Workflow execution completed:", {
      success: finalSuccess,
      resultCount: Object.keys(results).length,
    })

    // Log workflow completion
    await logWorkflowComplete(
      executionId,
      finalSuccess ? "success" : "error",
      workflowStartTime,
      Object.values(results).at(-1)?.data,
      Object.values(results).find((r) => !r.success)?.error,
    )

    return { success: finalSuccess, results }
  } catch (error) {
    console.error(
      "[Workflow Executor] Fatal error during workflow execution:",
      error,
    )

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error"

    await logWorkflowComplete(
      executionId,
      "error",
      workflowStartTime,
      undefined,
      errorMessage,
    )

    return { success: false, results }
  }
}
