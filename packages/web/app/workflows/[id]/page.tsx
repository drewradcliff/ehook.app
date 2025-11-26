"use client";

import { WorkflowCanvas } from "@/components/workflow/workflow-canvas";
import {
  currentWorkflowIdAtom,
  currentWorkflowNameAtom,
  edgesAtom,
  hasUnsavedChangesAtom,
  nodesAtom,
  type WorkflowEdge,
  type WorkflowNode,
} from "@/lib/workflow-store";
import { ReactFlowProvider } from "@xyflow/react";
import { useSetAtom } from "jotai";
import { use, useEffect } from "react";

type WorkflowPageProps = {
  params: Promise<{ id: string }>;
};

function WorkflowEditor({ workflowId }: { workflowId: string }) {
  const setNodes = useSetAtom(nodesAtom);
  const setEdges = useSetAtom(edgesAtom);
  const setCurrentWorkflowId = useSetAtom(currentWorkflowIdAtom);
  const setCurrentWorkflowName = useSetAtom(currentWorkflowNameAtom);
  const setHasUnsavedChanges = useSetAtom(hasUnsavedChangesAtom);

  useEffect(() => {
    const loadWorkflow = async () => {
      try {
        const response = await fetch(`/api/workflows/${workflowId}`);
        if (response.ok) {
          const workflow = await response.json();
          
          // Parse nodes and edges from JSON if needed
          const parsedNodes: WorkflowNode[] = typeof workflow.nodes === 'string' 
            ? JSON.parse(workflow.nodes) 
            : (workflow.nodes || []);
          const parsedEdges: WorkflowEdge[] = typeof workflow.edges === 'string' 
            ? JSON.parse(workflow.edges) 
            : (workflow.edges || []);
          
          // Reset all node statuses to idle when loading
          const nodesWithIdleStatus = parsedNodes.map((node: WorkflowNode) => ({
            ...node,
            data: {
              ...node.data,
              status: "idle" as const,
            },
          }));

          setNodes(nodesWithIdleStatus);
          setEdges(parsedEdges);
          setCurrentWorkflowId(workflow.id);
          setCurrentWorkflowName(workflow.name || "Untitled Workflow");
          setHasUnsavedChanges(false);
        } else if (response.status === 404) {
          // Workflow not found - set default empty state
          setNodes([]);
          setEdges([]);
          setCurrentWorkflowId(workflowId);
          setCurrentWorkflowName("Untitled Workflow");
          setHasUnsavedChanges(false);
        }
      } catch (error) {
        console.error("Failed to load workflow:", error);
      }
    };

    // Handle "new" workflow
    if (workflowId === "new") {
      setNodes([
        {
          id: "trigger-1",
          type: "trigger",
          position: { x: 250, y: 200 },
          data: {
            label: "Manual",
            description: "Trigger",
            type: "trigger",
            config: { triggerType: "Manual" },
            status: "idle",
          },
        },
      ]);
      setEdges([]);
      setCurrentWorkflowId(null);
      setCurrentWorkflowName("New Workflow");
      setHasUnsavedChanges(false);
    } else {
      loadWorkflow();
    }
  }, [workflowId, setNodes, setEdges, setCurrentWorkflowId, setCurrentWorkflowName, setHasUnsavedChanges]);

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden">
      <WorkflowCanvas />
    </div>
  );
}

export default function WorkflowPage({ params }: WorkflowPageProps) {
  const { id } = use(params);

  return (
    <ReactFlowProvider>
      <WorkflowEditor workflowId={id} />
    </ReactFlowProvider>
  );
}

