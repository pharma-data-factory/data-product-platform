/**
 * Where an entity's documentation opens in the TechDocs reader.
 *
 * NXD-102. Two annotations decide it, and the frontend knew only one:
 *
 * - `backstage.io/techdocs-ref` — the entity builds its own docs, read at
 *   `/docs/<namespace>/<kind>/<name>`. The kind was hard-coded to
 *   `component`, so an API entity's link pointed at a component that does
 *   not exist.
 * - `backstage.io/techdocs-entity` (+ optional `techdocs-entity-path`) — the
 *   entity borrows another entity's docs, which is how samples and the UNS
 *   component now reach the platform documentation instead of a
 *   `dir:../../docs` TechDocs refuses to build.
 *
 * The platform-components mapper used to hand back the raw `techdocs-ref`
 * value (`dir:.`) as a link target; this returns a route or nothing.
 */

export interface TechDocsEntityLike {
  kind?: string;
  metadata: { name: string; namespace?: string; annotations?: Record<string, string> };
}

const TECHDOCS_REF = 'backstage.io/techdocs-ref';
const TECHDOCS_ENTITY = 'backstage.io/techdocs-entity';
const TECHDOCS_ENTITY_PATH = 'backstage.io/techdocs-entity-path';

/** `kind:namespace/name`, `kind:name` or `name` → reader path segments. */
function refSegments(
  ref: string,
): { kind: string; namespace: string; name: string } | undefined {
  const match = /^(?:([^:/]+):)?(?:([^:/]+)\/)?([^:/]+)$/.exec(ref.trim());
  if (!match) {
    return undefined;
  }
  return {
    kind: (match[1] ?? 'component').toLowerCase(),
    namespace: (match[2] ?? 'default').toLowerCase(),
    name: match[3],
  };
}

export function techDocsPath(entity: TechDocsEntityLike): string | undefined {
  const annotations = entity.metadata.annotations ?? {};

  const external = annotations[TECHDOCS_ENTITY];
  if (external) {
    const target = refSegments(external);
    if (!target) {
      return undefined;
    }
    const subPath = (annotations[TECHDOCS_ENTITY_PATH] ?? '').replace(/^\/+/, '');
    return `/docs/${target.namespace}/${target.kind}/${target.name}${
      subPath ? `/${subPath}` : ''
    }`;
  }

  if (annotations[TECHDOCS_REF]) {
    const kind = (entity.kind ?? 'component').toLowerCase();
    const namespace = (entity.metadata.namespace ?? 'default').toLowerCase();
    return `/docs/${namespace}/${kind}/${entity.metadata.name}`;
  }

  return undefined;
}
