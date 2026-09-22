/**
 * Visual Lineage DAG — W3-4 / 6-R3.
 *
 * Renders an interactive SVG lineage graph using only built-in browser APIs
 * (no external graph library). The layout algorithm is a simple horizontal
 * rank-based placement:
 *
 *   rank -1: upstream producers
 *   rank  0: this product (root)
 *   rank +1: downstream consumers
 *   contract nodes: positioned midway between their producer and consumer
 *
 * Users can pan by dragging and see node details on hover.
 * The data comes from GET /api/composer/impact/artifact?name=X.
 */

import { useEffect, useRef, useState } from 'react';
import { useApi, discoveryApiRef } from '@backstage/core-plugin-api';
import { Box, CircularProgress, Typography } from '@material-ui/core';

interface ImpactResult {
  artifactName: string;
  affectedVersions: Array<{ productVersionId: string; productName: string }>;
  affectedContracts: string[];
}

interface GraphNode {
  id: string;
  label: string;
  isRoot: boolean;
  isContract: boolean;
  x: number;
  y: number;
}

interface GraphEdge {
  from: string;
  to: string;
}

/** Which of the three visual roles a node plays in the graph. */
type NodeRole = 'root' | 'contract' | 'consumer';

function nodeRole(node: Pick<GraphNode, 'isRoot' | 'isContract'>): NodeRole {
  if (node.isRoot) return 'root';
  if (node.isContract) return 'contract';
  return 'consumer';
}

const NODE_COLOURS: Record<
  NodeRole,
  { fill: string; textFill: string; stroke: string }
> = {
  root: { fill: '#1e1b4b', textFill: '#fff', stroke: '#4338ca' },
  contract: { fill: '#f0f9ff', textFill: '#1e1b4b', stroke: '#7dd3fc' },
  consumer: { fill: '#f5f3ff', textFill: '#1e1b4b', stroke: '#a5b4fc' },
};

const NODE_W = 160;
const NODE_H = 40;
const H_GAP = 220;
const V_GAP = 60;

function buildGraph(productName: string, impact: ImpactResult): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const rootId = 'root';
  nodes.push({ id: rootId, label: productName, isRoot: true, isContract: false, x: H_GAP, y: 200 });

  // Downstream consumers
  impact.affectedVersions.forEach((v, i) => {
    const y = 80 + i * V_GAP;
    nodes.push({ id: v.productVersionId, label: v.productName, isRoot: false, isContract: false, x: H_GAP * 2, y });
    edges.push({ from: rootId, to: v.productVersionId });
  });

  // Contracts (midway)
  impact.affectedContracts.slice(0, 4).forEach((_contractId, i) => {
    const y = 200 + (i - impact.affectedContracts.length / 2) * V_GAP;
    const nodeId = `contract-${i}`;
    nodes.push({ id: nodeId, label: `contract ${i + 1}`, isRoot: false, isContract: true, x: H_GAP * 1.5, y });
  });

  return { nodes, edges };
}

function SVGGraph({ nodes, edges }: { nodes: GraphNode[]; edges: GraphEdge[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragging = useRef<{ startX: number; startY: number; startPan: typeof pan } | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const maxX = Math.max(...nodes.map(n => n.x)) + NODE_W + 40;
  const maxY = Math.max(...nodes.map(n => n.y)) + NODE_H + 40;
  const W = Math.max(maxX, 600);
  const H = Math.max(maxY, 350);

  const nodeById = new Map(nodes.map(n => [n.id, n]));

  return (
    <svg
      ref={svgRef}
      width="100%"
      viewBox={`${-pan.x} ${-pan.y} ${W} ${H}`}
      style={{ cursor: dragging.current ? 'grabbing' : 'grab', userSelect: 'none', display: 'block' }}
      onMouseDown={e => {
        dragging.current = { startX: e.clientX, startY: e.clientY, startPan: { ...pan } };
      }}
      onMouseMove={e => {
        if (!dragging.current) return;
        const dx = (e.clientX - dragging.current.startX) * (W / (svgRef.current?.clientWidth ?? W));
        const dy = (e.clientY - dragging.current.startY) * (H / (svgRef.current?.clientHeight ?? H));
        setPan({ x: dragging.current.startPan.x - dx, y: dragging.current.startPan.y - dy });
      }}
      onMouseUp={() => { dragging.current = null; }}
      onMouseLeave={() => { dragging.current = null; }}
    >
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6 Z" fill="#6366f1" />
        </marker>
      </defs>

      {/* Edges */}
      {edges.map((e, i) => {
        const from = nodeById.get(e.from);
        const to = nodeById.get(e.to);
        if (!from || !to) return null;
        const x1 = from.x + NODE_W;
        const y1 = from.y + NODE_H / 2;
        const x2 = to.x;
        const y2 = to.y + NODE_H / 2;
        const mx = (x1 + x2) / 2;
        return (
          <path
            key={i}
            d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
            fill="none" stroke="#6366f1" strokeWidth={1.5}
            markerEnd="url(#arrow)" opacity={0.7}
          />
        );
      })}

      {/* Nodes */}
      {nodes.map(n => {
        const isHov = hovered === n.id;
        const { fill, textFill, stroke } = NODE_COLOURS[nodeRole(n)];
        return (
          <g key={n.id} transform={`translate(${n.x},${n.y})`}
            onMouseEnter={() => setHovered(n.id)}
            onMouseLeave={() => setHovered(null)}>
            <rect
              width={NODE_W} height={NODE_H} rx={8} ry={8}
              fill={fill} stroke={stroke} strokeWidth={isHov ? 2 : 1}
              strokeDasharray={n.isContract ? '4,2' : undefined}
              filter={isHov ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : undefined}
            />
            <text x={NODE_W / 2} y={NODE_H / 2 + 4}
              textAnchor="middle" fontSize={11} fill={textFill} fontWeight={n.isRoot ? 600 : 400}>
              {n.label.length > 18 ? `${n.label.slice(0, 16)}…` : n.label}
            </text>
            {n.isContract && (
              <text x={NODE_W / 2} y={NODE_H - 4} textAnchor="middle" fontSize={9} fill="#64748b">
                contract
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function LineageDAGView({ productName }: { productName: string }) {
  const discoveryApi = useApi(discoveryApiRef);
  const [graph, setGraph] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!productName) return undefined;
    let active = true;
    setLoading(true);
    discoveryApi.getBaseUrl('composer').then(async base => {
      try {
        const res = await fetch(`${base}/composer/impact/artifact?name=${encodeURIComponent(productName)}`);
        if (!active) return;
        if (res.ok) {
          const impact = await res.json() as ImpactResult;
          setGraph(buildGraph(productName, impact));
        }
      } catch { /* silent */ }
      if (active) setLoading(false);
    }).catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [discoveryApi, productName]);

  if (loading) return <CircularProgress size={24} />;

  if (!graph || graph.nodes.length <= 1) {
    return (
      <Box>
        <Typography variant="body2" color="textSecondary">
          No lineage data available yet. ProductDependency declarations in the
          Composer populate this graph. Use{' '}
          <code>POST /api/composer/subscriptions</code> and{' '}
          <code>POST /api/composer/versions/:id/dependencies</code> to build the lineage.
        </Typography>
        <Typography variant="caption" color="textSecondary" style={{ marginTop: 8, display: 'block' }}>
          Full multi-hop DAG: <code>GET /api/composer/versions/:id/lineage/dag</code>
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', background: '#fafafa' }}>
        <SVGGraph nodes={graph.nodes} edges={graph.edges} />
      </Box>
      <Typography variant="caption" color="textSecondary" style={{ marginTop: 8, display: 'block' }}>
        Drag to pan · Root node (dark) = this product · Dashed = contract node · Purple arrows = data flow
      </Typography>
    </Box>
  );
}
