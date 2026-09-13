/**
 * Generic graph model for the Nexora map visualization.
 * Domain adapters (TraceMap, Data Map) build these node/edge lists.
 */

export type NexoraNodeKind =
  | 'capability'
  | 'business-need'
  | 'requirement'
  | 'solution'
  | 'requirement-set'
  | 'baseline'
  | 'product'
  | 'product-component'
  | 'validation-context'
  | 'generic';

export interface NexoraGraphNode {
  id: string;
  kind: NexoraNodeKind;
  label: string;
  subtitle?: string;
  meta?: string[];
}

export interface NexoraGraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export type NexoraLayoutDirection = 'TB' | 'LR';

export interface NexoraGraphMapProps {
  nodes: NexoraGraphNode[];
  edges: NexoraGraphEdge[];
  layoutDirection?: NexoraLayoutDirection;
  minimap?: boolean;
  controls?: boolean;
  fitView?: boolean;
  /** Height of the canvas. */
  height?: number | string;
  /** Called when a node is clicked. */
  onNodeClick?: (node: NexoraGraphNode) => void;
  'data-testid'?: string;
}
