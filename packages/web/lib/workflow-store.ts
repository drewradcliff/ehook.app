import type { Edge, EdgeChange, Node, NodeChange } from "@xyflow/react";
import { applyEdgeChanges, applyNodeChanges } from "@xyflow/react";
import { atom } from "jotai";

export type WorkflowNodeType = "trigger" | "action" | "add";

export type WorkflowNodeData = {
  label: string;
  description?: string;
  type: WorkflowNodeType;
  config?: Record<string, unknown>;
  status?: "idle" | "running" | "success" | "error";
  onClick?: () => void; // For the "add" node type
};

export type WorkflowNode = Node<WorkflowNodeData>;
export type WorkflowEdge = Edge;

// Atoms for workflow state
export const nodesAtom = atom<WorkflowNode[]>([]);
export const edgesAtom = atom<WorkflowEdge[]>([]);
export const selectedNodeAtom = atom<string | null>(null);
export const selectedEdgeAtom = atom<string | null>(null);
export const isExecutingAtom = atom(false);
export const isLoadingAtom = atom(false);
export const isGeneratingAtom = atom(false);
export const currentWorkflowIdAtom = atom<string | null>(null);
export const currentWorkflowNameAtom = atom<string>("");

// UI state atoms
export const propertiesPanelActiveTabAtom = atom<string>("properties");
export const showMinimapAtom = atom(false);
export const selectedExecutionIdAtom = atom<string | null>(null);
export const rightPanelWidthAtom = atom<string | null>(null);
export const isPanelAnimatingAtom = atom<boolean>(false);
export const hasSidebarBeenShownAtom = atom<boolean>(false);
export const isSidebarCollapsedAtom = atom<boolean>(false);
export const isTransitioningFromHomepageAtom = atom<boolean>(false);

// Execution log entry type for storing run outputs per node
export type ExecutionLogEntry = {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: "pending" | "running" | "success" | "error";
  output?: unknown;
};

// Map of nodeId -> execution log entry for the currently selected execution
export const executionLogsAtom = atom<Record<string, ExecutionLogEntry>>({});

// Workflow toolbar UI state atoms
export const showClearDialogAtom = atom(false);
export const showDeleteDialogAtom = atom(false);
export const isSavingAtom = atom(false);
export const hasUnsavedChangesAtom = atom(false);
export const workflowNotFoundAtom = atom(false);

// Undo/Redo state
type HistoryState = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

const historyAtom = atom<HistoryState[]>([]);
const futureAtom = atom<HistoryState[]>([]);

// Derived atoms for node/edge operations
export const onNodesChangeAtom = atom(
  null,
  (get, set, changes: NodeChange[]) => {
    const currentNodes = get(nodesAtom);

    // Filter out deletion attempts on trigger nodes
    const filteredChanges = changes.filter((change) => {
      if (change.type === "remove") {
        const nodeToRemove = currentNodes.find((n) => n.id === change.id);
        // Prevent deletion of trigger nodes
        return nodeToRemove?.data.type !== "trigger";
      }
      return true;
    });

    const newNodes = applyNodeChanges(
      filteredChanges,
      currentNodes
    ) as WorkflowNode[];
    set(nodesAtom, newNodes);

    // Sync selection state with selectedNodeAtom
    const selectedNode = newNodes.find((n) => n.selected);
    if (selectedNode) {
      set(selectedNodeAtom, selectedNode.id);
      // Clear edge selection when a node is selected
      set(selectedEdgeAtom, null);
    } else if (get(selectedNodeAtom)) {
      // If no node is selected in ReactFlow but we have a selection, clear it
      const currentSelection = get(selectedNodeAtom);
      const stillExists = newNodes.find((n) => n.id === currentSelection);
      if (!stillExists) {
        set(selectedNodeAtom, null);
      }
    }

    // Check if there were any deletions to mark unsaved changes
    const hadDeletions = filteredChanges.some(
      (change) => change.type === "remove"
    );
    if (hadDeletions) {
      set(hasUnsavedChangesAtom, true);
      return;
    }

    // Check if there were any position changes (node moved) to mark unsaved changes
    const hadPositionChanges = filteredChanges.some(
      (change) => change.type === "position" && change.dragging === false
    );
    if (hadPositionChanges) {
      set(hasUnsavedChangesAtom, true);
    }
  }
);

export const onEdgesChangeAtom = atom(
  null,
  (get, set, changes: EdgeChange[]) => {
    const currentEdges = get(edgesAtom);
    const newEdges = applyEdgeChanges(changes, currentEdges) as WorkflowEdge[];
    set(edgesAtom, newEdges);

    // Sync selection state with selectedEdgeAtom
    const selectedEdge = newEdges.find((e) => e.selected);
    if (selectedEdge) {
      set(selectedEdgeAtom, selectedEdge.id);
      // Clear node selection when an edge is selected
      set(selectedNodeAtom, null);
    } else if (get(selectedEdgeAtom)) {
      // If no edge is selected in ReactFlow but we have a selection, clear it
      const currentSelection = get(selectedEdgeAtom);
      const stillExists = newEdges.find((e) => e.id === currentSelection);
      if (!stillExists) {
        set(selectedEdgeAtom, null);
      }
    }

    // Check if there were any deletions to mark unsaved changes
    const hadDeletions = changes.some((change) => change.type === "remove");
    if (hadDeletions) {
      set(hasUnsavedChangesAtom, true);
    }
  }
);

export const addNodeAtom = atom(null, (get, set, node: WorkflowNode) => {
  // Save current state to history before making changes
  const currentNodes = get(nodesAtom);
  const currentEdges = get(edgesAtom);
  const history = get(historyAtom);
  set(historyAtom, [...history, { nodes: currentNodes, edges: currentEdges }]);
  set(futureAtom, []);

  // Deselect all existing nodes and add new node as selected
  const updatedNodes = currentNodes.map((n) => ({ ...n, selected: false }));
  const newNode = { ...node, selected: true };
  const newNodes = [...updatedNodes, newNode];
  set(nodesAtom, newNodes);

  // Auto-select the newly added node
  set(selectedNodeAtom, node.id);

  // Mark as having unsaved changes
  set(hasUnsavedChangesAtom, true);
});

export const updateNodeDataAtom = atom(
  null,
  (get, set, { id, data }: { id: string; data: Partial<WorkflowNodeData> }) => {
    const currentNodes = get(nodesAtom);

    const newNodes = currentNodes.map((node) => {
      if (node.id === id) {
        return { ...node, data: { ...node.data, ...data } };
      }
      return node;
    });

    set(nodesAtom, newNodes);

    // Mark as having unsaved changes (except for status updates during execution)
    if (!data.status) {
      set(hasUnsavedChangesAtom, true);
    }
  }
);

export const deleteNodeAtom = atom(null, (get, set, nodeId: string) => {
  const currentNodes = get(nodesAtom);

  // Prevent deletion of trigger nodes
  const nodeToDelete = currentNodes.find((node) => node.id === nodeId);
  if (nodeToDelete?.data.type === "trigger") {
    return;
  }

  // Save current state to history before making changes
  const currentEdges = get(edgesAtom);
  const history = get(historyAtom);
  set(historyAtom, [...history, { nodes: currentNodes, edges: currentEdges }]);
  set(futureAtom, []);

  const newNodes = currentNodes.filter((node) => node.id !== nodeId);
  const newEdges = currentEdges.filter(
    (edge) => edge.source !== nodeId && edge.target !== nodeId
  );

  set(nodesAtom, newNodes);
  set(edgesAtom, newEdges);

  if (get(selectedNodeAtom) === nodeId) {
    set(selectedNodeAtom, null);
  }

  // Mark as having unsaved changes
  set(hasUnsavedChangesAtom, true);
});

export const deleteEdgeAtom = atom(null, (get, set, edgeId: string) => {
  // Save current state to history before making changes
  const currentNodes = get(nodesAtom);
  const currentEdges = get(edgesAtom);
  const history = get(historyAtom);
  set(historyAtom, [...history, { nodes: currentNodes, edges: currentEdges }]);
  set(futureAtom, []);

  const newEdges = currentEdges.filter((edge) => edge.id !== edgeId);
  set(edgesAtom, newEdges);

  if (get(selectedEdgeAtom) === edgeId) {
    set(selectedEdgeAtom, null);
  }

  // Mark as having unsaved changes
  set(hasUnsavedChangesAtom, true);
});

export const deleteSelectedItemsAtom = atom(null, (get, set) => {
  // Save current state to history before making changes
  const currentNodes = get(nodesAtom);
  const currentEdges = get(edgesAtom);
  const history = get(historyAtom);
  set(historyAtom, [...history, { nodes: currentNodes, edges: currentEdges }]);
  set(futureAtom, []);

  // Get all selected nodes, excluding trigger nodes
  const selectedNodeIds = currentNodes
    .filter((node) => node.selected && node.data.type !== "trigger")
    .map((node) => node.id);

  // Delete selected nodes (excluding trigger nodes) and their connected edges
  const newNodes = currentNodes.filter((node) => {
    // Keep trigger nodes even if selected
    if (node.data.type === "trigger") {
      return true;
    }
    // Remove other selected nodes
    return !node.selected;
  });

  const newEdges = currentEdges.filter(
    (edge) =>
      !(
        edge.selected ||
        selectedNodeIds.includes(edge.source) ||
        selectedNodeIds.includes(edge.target)
      )
  );

  set(nodesAtom, newNodes);
  set(edgesAtom, newEdges);
  set(selectedNodeAtom, null);
  set(selectedEdgeAtom, null);

  // Mark as having unsaved changes
  set(hasUnsavedChangesAtom, true);
});

export const clearWorkflowAtom = atom(null, (get, set) => {
  // Save current state to history before making changes
  const currentNodes = get(nodesAtom);
  const currentEdges = get(edgesAtom);
  const history = get(historyAtom);
  set(historyAtom, [...history, { nodes: currentNodes, edges: currentEdges }]);
  set(futureAtom, []);

  set(nodesAtom, []);
  set(edgesAtom, []);
  set(selectedNodeAtom, null);
  set(selectedEdgeAtom, null);

  // Mark as having unsaved changes
  set(hasUnsavedChangesAtom, true);
});

// Undo atom
export const undoAtom = atom(null, (get, set) => {
  const history = get(historyAtom);
  if (history.length === 0) {
    return;
  }

  const currentNodes = get(nodesAtom);
  const currentEdges = get(edgesAtom);
  const future = get(futureAtom);

  // Save current state to future
  set(futureAtom, [...future, { nodes: currentNodes, edges: currentEdges }]);

  // Pop from history and set as current
  const newHistory = [...history];
  const previousState = newHistory.pop();
  if (!previousState) {
    return;
  }
  set(historyAtom, newHistory);
  set(nodesAtom, previousState.nodes);
  set(edgesAtom, previousState.edges);

  // Mark as having unsaved changes
  set(hasUnsavedChangesAtom, true);
});

// Redo atom
export const redoAtom = atom(null, (get, set) => {
  const future = get(futureAtom);
  if (future.length === 0) {
    return;
  }

  const currentNodes = get(nodesAtom);
  const currentEdges = get(edgesAtom);
  const history = get(historyAtom);

  // Save current state to history
  set(historyAtom, [...history, { nodes: currentNodes, edges: currentEdges }]);

  // Pop from future and set as current
  const newFuture = [...future];
  const nextState = newFuture.pop();
  if (!nextState) {
    return;
  }
  set(futureAtom, newFuture);
  set(nodesAtom, nextState.nodes);
  set(edgesAtom, nextState.edges);

  // Mark as having unsaved changes
  set(hasUnsavedChangesAtom, true);
});

// Can undo/redo atoms
export const canUndoAtom = atom((get) => get(historyAtom).length > 0);
export const canRedoAtom = atom((get) => get(futureAtom).length > 0);

// Clear all node statuses (used when clearing runs)
export const clearNodeStatusesAtom = atom(null, (get, set) => {
  const currentNodes = get(nodesAtom);
  const newNodes = currentNodes.map((node) => ({
    ...node,
    data: { ...node.data, status: "idle" as const },
  }));
  set(nodesAtom, newNodes);
});

