/**
 * Deterministic auto-layout for Nexora graphs via dagre.
 */

import { graphlib, layout } from '@dagrejs/dagre';
import type { NexoraGraphEdge, NexoraGraphNode, NexoraLayoutDirection } from './types';

const NODE_WIDTH = 240;
const NODE_HEIGHT = 72;

export interface PositionedNode extends NexoraGraphNode {
  position: { x: number; y: number };
}

export function layoutGraph(
  nodes: NexoraGraphNode[],
  edges: NexoraGraphEdge[],
  direction: NexoraLayoutDirection,
): PositionedNode[] {
  const g = new graphlib.Graph();
  g.setGraph({
    rankdir: direction,
    nodesep: 36,
    ranksep: 80,
    marginx: 24,
    marginy: 24,
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    if (!g.hasNode(edge.source) || !g.hasNode(edge.target)) {
      continue;
    }
    g.setEdge(edge.source, edge.target);
  }

  layout(g);

  return nodes.map(node => {
    const position = g.node(node.id);
    return {
      ...node,
      position: {
        x: position.x - NODE_WIDTH / 2,
        y: position.y - NODE_HEIGHT / 2,
      },
    };
  });
}
