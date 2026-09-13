/**
 * TraceMap — read-only capability → need → requirements → solution map.
 * Thin adapter over the shared NexoraGraphMap (interactive, with arrows,
 * pan/zoom, minimap and fullscreen).
 */

import { useMemo, type FC } from 'react';
import { NexoraGraphMap } from '@internal/plugin-nexora-common';
import type { NexoraGraphEdge, NexoraGraphNode } from '@internal/plugin-nexora-common';

export interface TraceMapRequirement {
  id: string;
  title: string;
  acCount: number;
}

export interface TraceMapProps {
  /** Capability id → display name. */
  capabilityNames: Record<string, string>;
  businessNeed: string;
  requirements: TraceMapRequirement[];
  solutionName: string;
}

export const TraceMap: FC<TraceMapProps> = ({
  capabilityNames,
  businessNeed,
  requirements,
  solutionName,
}) => {
  const capabilityEntries = Object.entries(capabilityNames);
  const graph = useMemo(() => {
    const nodes: NexoraGraphNode[] = [];
    const edges: NexoraGraphEdge[] = [];

    if (capabilityEntries.length === 0) {
      nodes.push({
        id: 'capability-none',
        kind: 'capability',
        label: 'No capabilities linked',
      });
    } else {
      for (const [id, name] of capabilityEntries) {
        const nodeId = `capability:${id}`;
        nodes.push({
          id: nodeId,
          kind: 'capability',
          label: name || id,
          ...(name && name !== id ? { subtitle: id } : {}),
        });
        edges.push({
          id: `edge:${nodeId}:need`,
          source: nodeId,
          target: 'business-need',
        });
      }
    }

    nodes.push({
      id: 'business-need',
      kind: 'business-need',
      label: businessNeed || '—',
    });

    if (requirements.length === 0) {
      nodes.push({
        id: 'requirement-none',
        kind: 'requirement',
        label: 'No requirements',
      });
    } else {
      for (const req of requirements) {
        const nodeId = `requirement:${req.id}`;
        nodes.push({
          id: nodeId,
          kind: 'requirement',
          label: req.title || req.id,
          subtitle: req.id,
          meta: [`AC: ${req.acCount}`],
        });
        edges.push({
          id: `edge:need:${nodeId}`,
          source: 'business-need',
          target: nodeId,
        });
        edges.push({
          id: `edge:${nodeId}:solution`,
          source: nodeId,
          target: 'solution',
        });
      }
    }

    nodes.push({
      id: 'solution',
      kind: 'solution',
      label: solutionName || '—',
    });

    return { nodes, edges };
  }, [capabilityEntries, businessNeed, requirements, solutionName]);

  return (
    <NexoraGraphMap
      nodes={graph.nodes}
      edges={graph.edges}
      layoutDirection="TB"
      height={620}
      data-testid="trace-map"
    />
  );
};
