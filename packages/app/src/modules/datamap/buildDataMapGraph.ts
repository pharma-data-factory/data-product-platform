/**
 * Data Map assembly — builds the platform-wide graph from public APIs of the
 * URS Composer, Validation Expert and Composer (products) plugins.
 * Read-only: nodes and edges only, no mutations.
 */

import type {
  NexoraGraphEdge,
  NexoraGraphNode,
} from '@internal/plugin-nexora-common';
import type { ComposerClient } from '../products/api';

export interface DataMapApi {
  composer: ComposerClient;
  urs: {
    listCapabilities(): Promise<{
      items: { id: string; name: string; domain?: string }[];
      total: number;
    }>;
    listRequirementSets(): Promise<{
      items: {
        id: string;
        requirementSetId: string;
        businessCapabilityRefs: string[];
        solutionName?: string;
        status: string;
      }[];
      total: number;
    }>;
  };
  validation: {
    getContexts(): Promise<
      {
        id: string;
        status: string;
        source: {
          requirementSetId: string;
          baselineId: string;
          businessCapabilityIds: string[];
        };
      }[]
    >;
  };
}

function nodeId(prefix: string, id: string): string {
  return `${prefix}:${id}`;
}

const URS_SET_PREFIX = 'urs-set:';

/** Extract the raw requirement-set id from a data-map node id. */
export function ursSetIdFromNodeId(id: string): string | undefined {
  return id.startsWith(URS_SET_PREFIX)
    ? id.slice(URS_SET_PREFIX.length)
    : undefined;
}

export async function buildDataMapGraph(
  api: DataMapApi,
): Promise<{ nodes: NexoraGraphNode[]; edges: NexoraGraphEdge[] }> {
  const nodes = new Map<string, NexoraGraphNode>();
  const edges = new Map<string, NexoraGraphEdge>();
  const addNode = (node: NexoraGraphNode) => {
    if (!nodes.has(node.id)) {
      nodes.set(node.id, node);
    }
  };
  const addEdge = (edge: NexoraGraphEdge) => {
    if (!edges.has(edge.id) && edge.source !== edge.target) {
      edges.set(edge.id, edge);
    }
  };

  const [capabilityResult, requirementSetResult, contexts] = await Promise.all([
    api.urs.listCapabilities(),
    api.urs.listRequirementSets(),
    api.validation.getContexts().catch(() => []),
  ]);

  for (const capability of capabilityResult.items) {
    addNode({
      id: nodeId('capability', capability.id),
      kind: 'capability',
      label: capability.name || capability.id,
      subtitle: capability.id,
      ...(capability.domain ? { meta: [capability.domain] } : {}),
    });
  }

  const requirementSets = requirementSetResult.items;
  for (const set of requirementSets) {
    const id = nodeId('urs-set', set.id);
    addNode({
      id,
      kind: 'requirement-set',
      label: set.solutionName || set.requirementSetId,
      subtitle: set.requirementSetId,
      meta: [set.status],
    });
    for (const capabilityRef of set.businessCapabilityRefs || []) {
      addEdge({
        id: `edge:${id}:${nodeId('capability', capabilityRef)}`,
        source: nodeId('capability', capabilityRef),
        target: id,
      });
    }
  }

  const products = await api.composer.listProducts();
  const approvedUrsBaselines = await api.composer
    .listApprovedUrsBaselines()
    .catch(() => []);

  for (const baseline of approvedUrsBaselines) {
    const id = nodeId('urs-baseline', baseline.id);
    addNode({
      id,
      kind: 'baseline',
      label: `URS Baseline v${baseline.baselineVersion}`,
      subtitle: baseline.requirementSetId
        ? `for ${baseline.requirementSetId}`
        : baseline.id,
      meta: baseline.status ? [baseline.status] : undefined,
    });
    if (baseline.requirementSetId) {
      addEdge({
        id: `edge:${id}:${nodeId('urs-set', baseline.requirementSetId)}`,
        source: id,
        target: nodeId('urs-set', baseline.requirementSetId),
      });
    }
  }

  for (const product of products.items) {
    const productNodeId = nodeId('product', product.id);
    addNode({
      id: productNodeId,
      kind: 'product',
      label: product.name,
      subtitle: product.productType,
      meta: product.status ? [product.status] : undefined,
    });

    const versions = await api.composer
      .listProductVersions(product.id)
      .catch(() => []);
    for (const version of versions) {
      const components = await api.composer
        .listProductComponents(version.id)
        .catch(() => []);
      for (const component of components) {
        const componentNodeId = nodeId('component', component.id);
        addNode({
          id: componentNodeId,
          kind: 'product-component',
          label: component.name,
          subtitle: component.componentType,
        });
        addEdge({
          id: `edge:${productNodeId}:${componentNodeId}`,
          source: productNodeId,
          target: componentNodeId,
        });
      }

      const baselines = await api.composer
        .listProductBaselines(version.id)
        .catch(() => []);
      for (const productBaseline of baselines) {
        const ursBaselineId = productBaseline.ursBaselineId;
        if (ursBaselineId) {
          addEdge({
            id: `edge:${productNodeId}:${nodeId('urs-baseline', ursBaselineId)}`,
            source: productNodeId,
            target: nodeId('urs-baseline', ursBaselineId),
          });
        }
      }
    }

    const traceability = await api.composer
      .getProductTraceability(product.id)
      .catch(() => null);
    if (traceability) {
      for (const link of traceability.links) {
        if (link.targetType?.toUpperCase().includes('COMPONENT')) {
          const componentNodeId = nodeId('component', link.targetId);
          const requirementVersionNodeId = nodeId(
            'requirement-version',
            link.sourceId,
          );
          addNode({
            id: requirementVersionNodeId,
            kind: 'requirement',
            label: link.sourceId,
            subtitle: 'requirement version',
          });
          addEdge({
            id: `edge:${requirementVersionNodeId}:${componentNodeId}`,
            source: requirementVersionNodeId,
            target: componentNodeId,
            label: link.relationshipType,
          });
        }
      }
    }
  }

  for (const context of contexts) {
    const id = nodeId('validation-context', context.id);
    addNode({
      id,
      kind: 'validation-context',
      label: `Validation ${context.id}`,
      meta: context.status ? [context.status] : undefined,
    });
    if (context.source.requirementSetId) {
      addEdge({
        id: `edge:${id}:${nodeId('urs-set', context.source.requirementSetId)}`,
        source: id,
        target: nodeId('urs-set', context.source.requirementSetId),
      });
    }
    if (context.source.baselineId) {
      addEdge({
        id: `edge:${id}:${nodeId('urs-baseline', context.source.baselineId)}`,
        source: id,
        target: nodeId('urs-baseline', context.source.baselineId),
      });
    }
  }

  return {
    nodes: Array.from(nodes.values()),
    edges: Array.from(edges.values()),
  };
}
