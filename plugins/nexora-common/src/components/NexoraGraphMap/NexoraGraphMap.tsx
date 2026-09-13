/**
 * NexoraGraphMap — interactive node/edge map built on React Flow.
 * Domain adapters build `NexoraGraphNode`/`NexoraGraphEdge` lists; this
 * component owns layout, rendering, pan/zoom, minimap and fullscreen.
 */

import { useMemo, useRef, type CSSProperties, type FC } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  ControlButton,
  MiniMap,
  MarkerType,
  Handle,
  Position,
  useNodesState,
  type Node,
  type NodeProps,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { makeStyles, useTheme } from '@material-ui/core';
import { nexoraColors, nexoraThemeColor, type NexoraColorMode } from '../../design';
import type {
  NexoraGraphMapProps,
  NexoraLayoutDirection,
  NexoraNodeKind,
} from './types';
import { layoutGraph } from './layout';

export type {
  NexoraGraphEdge,
  NexoraGraphMapProps,
  NexoraGraphNode,
  NexoraLayoutDirection,
  NexoraNodeKind,
} from './types';

type NexoraMapNodeData = {
  kind: NexoraNodeKind;
  label: string;
  subtitle?: string;
  meta?: string[];
  direction: NexoraLayoutDirection;
  clickable: boolean;
};

type NexoraMapNode = Node<NexoraMapNodeData>;

const KIND_ACCENT: Record<NexoraNodeKind, string> = {
  capability: `var(--nexora-color-accent-readable, ${nexoraColors.light.accentReadable})`,
  'business-need': `var(--nexora-color-accent-readable, ${nexoraColors.light.accentReadable})`,
  solution: `var(--nexora-color-accent-readable, ${nexoraColors.light.accentReadable})`,
  requirement: `var(--nexora-color-border-strong, ${nexoraColors.light.borderStrong})`,
  'requirement-set': `var(--nexora-color-primary, ${nexoraColors.light.primary})`,
  product: `var(--nexora-color-accent, ${nexoraColors.light.accent})`,
  'product-component': `var(--nexora-color-border-strong, ${nexoraColors.light.borderStrong})`,
  baseline: `var(--nexora-color-security, ${nexoraColors.light.security})`,
  'validation-context': `var(--nexora-color-compliance, ${nexoraColors.light.compliance})`,
  generic: `var(--nexora-color-border-strong, ${nexoraColors.light.borderStrong})`,
};

const useStyles = makeStyles(theme => ({
  root: {
    position: 'relative',
    border: `1px solid ${nexoraThemeColor.border}`,
    borderRadius: 4,
    width: '100%',
  },
  node: {
    minWidth: 190,
    maxWidth: 260,
    padding: '8px 12px',
    borderRadius: 6,
    border: `1px solid ${nexoraThemeColor.border}`,
    borderLeft: `3px solid var(--nexora-graph-accent)`,
    backgroundColor: nexoraThemeColor.surfaceRaised,
    boxShadow: '0 1px 2px rgba(11, 31, 58, 0.08)',
    fontSize: 13,
    lineHeight: 1.35,
  },
  nodeClickable: {
    cursor: 'pointer',
    '&:hover': {
      borderColor: nexoraThemeColor.borderStrong,
      boxShadow: '0 2px 6px rgba(11, 31, 58, 0.14)',
    },
  },
  nodeTitle: {
    color: nexoraThemeColor.text,
    fontWeight: 600,
    overflowWrap: 'break-word',
  },
  nodeSubtitle: {
    color: nexoraThemeColor.textMuted,
    fontSize: 11,
    marginTop: 2,
    overflowWrap: 'break-word',
  },
  nodeMeta: {
    color: nexoraThemeColor.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  handle: {
    width: 7,
    height: 7,
    background: nexoraThemeColor.borderStrong,
    border: `1px solid ${nexoraThemeColor.border}`,
  },
  minimap: {
    backgroundColor: nexoraThemeColor.surface,
    borderRadius: 4,
  },
  fullscreenIcon: {
    width: 14,
    height: 14,
    fill: theme.palette.text.secondary,
  },
}));

function NexoraMapNodeComponent({ data }: NodeProps<NexoraMapNode>) {
  const classes = useStyles();
  const horizontal = data.direction === 'LR';
  return (
    <div
      className={`${classes.node}${data.clickable ? ` ${classes.nodeClickable}` : ''}`}
      style={
        { '--nexora-graph-accent': KIND_ACCENT[data.kind] } as CSSProperties
      }
      data-testid={`graph-node-${data.label}`}
    >
      <Handle
        type="target"
        position={horizontal ? Position.Left : Position.Top}
        className={classes.handle}
      />
      <div className={classes.nodeTitle}>{data.label}</div>
      {data.subtitle ? (
        <div className={classes.nodeSubtitle}>{data.subtitle}</div>
      ) : null}
      {(data.meta ?? []).map(meta => (
        <div key={meta} className={classes.nodeMeta}>
          {meta}
        </div>
      ))}
      <Handle
        type="source"
        position={horizontal ? Position.Right : Position.Bottom}
        className={classes.handle}
      />
    </div>
  );
}

const nodeTypes = { nexora: NexoraMapNodeComponent };

function FullscreenIcon() {
  const classes = useStyles();
  return (
    <svg viewBox="0 0 24 24" className={classes.fullscreenIcon} aria-hidden>
      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
    </svg>
  );
}

export const NexoraGraphMap: FC<NexoraGraphMapProps> = ({
  nodes,
  edges,
  layoutDirection = 'TB',
  minimap = true,
  controls = true,
  fitView = true,
  height = 520,
  onNodeClick,
  'data-testid': dataTestid = 'nexora-graph-map',
}) => {
  const classes = useStyles();
  const theme = useTheme();
  const colorMode: NexoraColorMode =
    theme.palette.type === 'dark' ? 'dark' : 'light';
  const containerRef = useRef<HTMLDivElement | null>(null);

  const rfNodes: NexoraMapNode[] = useMemo(
    () =>
      layoutGraph(nodes, edges, layoutDirection).map(node => ({
        id: node.id,
        type: 'nexora',
        position: node.position,
        sourcePosition:
          layoutDirection === 'LR' ? Position.Right : Position.Bottom,
        targetPosition: layoutDirection === 'LR' ? Position.Left : Position.Top,
        data: {
          kind: node.kind,
          label: node.label,
          subtitle: node.subtitle,
          meta: node.meta,
          direction: layoutDirection,
          clickable: Boolean(onNodeClick),
        },
      })),
    [nodes, edges, layoutDirection, onNodeClick],
  );

  const rfEdges: Edge[] = useMemo(
    () =>
      edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        style: { stroke: nexoraColors[colorMode].borderStrong },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 16,
          height: 16,
          color: nexoraColors[colorMode].borderStrong,
        },
      })),
    [edges, colorMode],
  );

  const [stateNodes, , onNodesChange] = useNodesState(rfNodes);

  // Remount when the node set changes (e.g. search/filter) so fitView
  // re-applies and dagre positions stay consistent.
  const layoutKey = useMemo(
    () =>
      `${layoutDirection}|${nodes
        .map(n => n.id)
        .sort()
        .join(',')}`,
    [layoutDirection, nodes],
  );

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen();
    }
  };

  return (
    <div
      ref={containerRef}
      className={classes.root}
      style={{ height }}
      data-testid={dataTestid}
    >
      <ReactFlow
        key={layoutKey}
        nodes={stateNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={
          onNodeClick
            ? (_, rfNode) => {
                const original = nodes.find(n => n.id === rfNode.id);
                if (original) {
                  onNodeClick(original);
                }
              }
            : undefined
        }
        fitView={fitView}
        colorMode={colorMode}
        minZoom={0.15}
        maxZoom={2.5}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={22}
          size={1.2}
          color={nexoraColors[colorMode].border}
        />
        {minimap ? (
          <MiniMap className={classes.minimap} pannable zoomable />
        ) : null}
        {controls ? (
          <Controls>
            <ControlButton
              onClick={toggleFullscreen}
              title="Toggle fullscreen"
              aria-label="Toggle fullscreen"
            >
              <FullscreenIcon />
            </ControlButton>
          </Controls>
        ) : null}
      </ReactFlow>
    </div>
  );
};
