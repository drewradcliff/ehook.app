/**
 * Workflow executor using "use workflow" directive for Vercel Workflows
 * Provides durability, observability, and longer execution times
 */
import "server-only"

import {
  httpRequestStep,
  sendEmailStep,
  triggerStep,
  type StepContext,
} from "./steps"
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
 * Execute a single action step using the appropriate step function
 */
async function executeActionStep(
  actionType: string,
  config: Record<string, unknown>,
  context: StepContext,
  outputs: NodeOutputs,
): Promise<ExecutionResult> {
  // Process templates in config
  const processedConfig = processTemplates(config, outputs)

  switch (actionType) {
    case "HTTP Request": {
      const result = await httpRequestStep({
        endpoint: processedConfig.endpoint as string,
        httpMethod: (processedConfig.httpMethod as string) || "POST",
        httpHeaders: processedConfig.httpHeaders as string | undefined,
        httpBody: processedConfig.httpBody as string | undefined,
        _context: context,
      })
      return {
        success: result.success,
        data: result.success ? result.data : undefined,
        error: result.success ? undefined : result.error,
      }
    }
    case "Send Email": {
      const result = await sendEmailStep({
        emailTo: processedConfig.emailTo as string,
        emailSubject: processedConfig.emailSubject as string,
        emailBody: processedConfig.emailBody as string | undefined,
        _context: context,
      })
      return {
        success: result.success,
        data: result.success ? result.data : undefined,
        error: result.success ? undefined : result.error,
      }
    }
    default:
      return {
        success: false,
        error: `Unknown action type: ${actionType}`,
      }
  }
}

/**
 * Main workflow executor function with Vercel Workflow support
 * Uses "use workflow" directive for durability and observability
 */
export async function executeWorkflow(
  input: WorkflowExecutionInput,
): Promise<{ success: boolean; results: Record<string, ExecutionResult> }> {
  "use workflow"

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

        // Execute trigger step
        const triggerResult = await triggerStep({
          triggerData: {
            triggered: true,
            timestamp: Date.now(),
            ...triggerInput,
          },
          _context: context,
        })

        result = {
          success: triggerResult.success,
          data: triggerResult.data,
        }
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

    // Log workflow completion via trigger step
    await triggerStep({
      triggerData: {},
      _workflowComplete: {
        executionId,
        status: finalSuccess ? "success" : "error",
        output: Object.values(results).at(-1)?.data,
        error: Object.values(results).find((r) => !r.success)?.error,
        startTime: workflowStartTime,
      },
    })

    return { success: finalSuccess, results }
  } catch (error) {
    console.error(
      "[Workflow Executor] Fatal error during workflow execution:",
      error,
    )

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error"

    // Log workflow error via trigger step
    await triggerStep({
      triggerData: {},
      _workflowComplete: {
        executionId,
        status: "error",
        error: errorMessage,
        startTime: workflowStartTime,
      },
    })

    return { success: false, results }
  }
}
