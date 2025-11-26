"use client";

import { useReactFlow } from "@xyflow/react";
import { useAtom, useSetAtom } from "jotai";
import {
  Plus,
  Redo2,
  Undo2,
} from "lucide-react";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  addNodeAtom,
  canRedoAtom,
  canUndoAtom,
  isGeneratingAtom,
  nodesAtom,
  redoAtom,
  selectedNodeAtom,
  undoAtom,
  type WorkflowNode,
} from "@/lib/workflow-store";
import { Panel } from "../ai-elements/panel";

type WorkflowToolbarProps = {
  workflowId?: string;
};

export const WorkflowToolbar = ({ workflowId }: WorkflowToolbarProps) => {
  const [nodes] = useAtom(nodesAtom);
  const [isGenerating] = useAtom(isGeneratingAtom);
  const [canUndo] = useAtom(canUndoAtom);
  const [canRedo] = useAtom(canRedoAtom);
  const undo = useSetAtom(undoAtom);
  const redo = useSetAtom(redoAtom);
  const addNode = useSetAtom(addNodeAtom);
  const setSelectedNodeId = useSetAtom(selectedNodeAtom);
  const { screenToFlowPosition } = useReactFlow();

  const handleAddStep = () => {
    // Get the ReactFlow wrapper (the visible canvas container)
    const flowWrapper = document.querySelector(".react-flow");
    if (!flowWrapper) {
      return;
    }

    const rect = flowWrapper.getBoundingClientRect();
    // Calculate center in absolute screen coordinates
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Convert to flow coordinates
    const position = screenToFlowPosition({ x: centerX, y: centerY });

    // Adjust for node dimensions to center it properly
    // Action node is 192px wide and 192px tall (w-48 h-48 in Tailwind)
    const nodeWidth = 192;
    const nodeHeight = 192;
    position.x -= nodeWidth / 2;
    position.y -= nodeHeight / 2;

    // Check if there's already a node at this position
    const offset = 20; // Offset distance in pixels
    const threshold = 20; // How close nodes need to be to be considered overlapping

    const finalPosition = { ...position };
    let hasOverlap = true;
    let attempts = 0;
    const maxAttempts = 20; // Prevent infinite loop

    while (hasOverlap && attempts < maxAttempts) {
      hasOverlap = nodes.some((node) => {
        const dx = Math.abs(node.position.x - finalPosition.x);
        const dy = Math.abs(node.position.y - finalPosition.y);
        return dx < threshold && dy < threshold;
      });

      if (hasOverlap) {
        // Offset diagonally down-right
        finalPosition.x += offset;
        finalPosition.y += offset;
        attempts += 1;
      }
    }

    // Create new action node
    const newNode: WorkflowNode = {
      id: nanoid(),
      type: "action",
      position: finalPosition,
      data: {
        label: "",
        description: "",
        type: "action",
        config: {},
        status: "idle",
      },
    };

    addNode(newNode);
    setSelectedNodeId(newNode.id);
  };

  if (!workflowId) {
    return null;
  }

  return (
    <>
      <Panel
        className="flex flex-col gap-2 rounded-none border-none bg-transparent p-0 lg:flex-row lg:items-center"
        position="top-left"
      >
        <div className="flex h-9 items-center overflow-hidden rounded-md border bg-secondary text-secondary-foreground px-3">
          <p className="font-medium text-sm">Workflow Editor</p>
        </div>
      </Panel>

      <div className="pointer-events-auto absolute top-4 right-4 z-10">
        <div className="flex flex-col-reverse items-end gap-2 lg:flex-row lg:items-center">
          {/* Add Step */}
          <ButtonGroup className="hidden lg:flex" orientation="horizontal">
            <Button
              className="border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
              disabled={isGenerating}
              onClick={handleAddStep}
              size="icon"
              title="Add Step"
              variant="secondary"
            >
              <Plus className="size-4" />
            </Button>
          </ButtonGroup>

          {/* Undo/Redo */}
          <ButtonGroup className="hidden lg:flex" orientation="horizontal">
            <Button
              className="border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
              disabled={!canUndo || isGenerating}
              onClick={() => undo()}
              size="icon"
              title="Undo"
              variant="secondary"
            >
              <Undo2 className="size-4" />
            </Button>
            <Button
              className="border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
              disabled={!canRedo || isGenerating}
              onClick={() => redo()}
              size="icon"
              title="Redo"
              variant="secondary"
            >
              <Redo2 className="size-4" />
            </Button>
          </ButtonGroup>

          {/* Mobile Add Step */}
          <ButtonGroup className="flex lg:hidden" orientation="vertical">
            <Button
              className="border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
              disabled={isGenerating}
              onClick={handleAddStep}
              size="icon"
              title="Add Step"
              variant="secondary"
            >
              <Plus className="size-4" />
            </Button>
          </ButtonGroup>

          {/* Mobile Undo/Redo */}
          <ButtonGroup className="flex lg:hidden" orientation="vertical">
            <Button
              className="border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
              disabled={!canUndo || isGenerating}
              onClick={() => undo()}
              size="icon"
              title="Undo"
              variant="secondary"
            >
              <Undo2 className="size-4" />
            </Button>
            <Button
              className="border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
              disabled={!canRedo || isGenerating}
              onClick={() => redo()}
              size="icon"
              title="Redo"
              variant="secondary"
            >
              <Redo2 className="size-4" />
            </Button>
          </ButtonGroup>
        </div>
      </div>
    </>
  );
};

