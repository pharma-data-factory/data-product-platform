/**
 * The public installation docs (NXD-114): which documents, under which URL.
 *
 * A curated set, not the documentation tree. The repository also holds audits,
 * commercial strategy and decision records; on a customer instance those stay
 * behind sign-in in TechDocs. These are the documents an administrator needs
 * *before* sign-in works — which is exactly when TechDocs is out of reach.
 */

import type { ConfigApi } from '@backstage/core-plugin-api';

export const PUBLIC_DOCS_PATH = '/install';

export interface PublicDoc {
  /** URL segment: `/install/<slug>`. */
  slug: string;
  /** Repository path, for resolving the relative links inside it. */
  path: string;
  title: string;
  summary: string;
  /** Only this section of the file, from its heading to the next sibling. */
  section?: string;
}

export const PUBLIC_DOCS: readonly PublicDoc[] = [
  {
    slug: 'overview',
    path: 'README.md',
    section: 'Installation for administrators',
    title: 'Installation overview',
    summary:
      'Topologies (one container, separate containers, workspace with the database in Docker), how the parts connect, and the configuration files.',
  },
  {
    slug: 'start',
    path: 'START.md',
    title: 'Starting Nexora',
    summary:
      'Step-by-step for local Docker, a remote workspace, the dev server and the production image, with troubleshooting.',
  },
  {
    slug: 'github',
    path: 'docs/github-setup.md',
    title: 'GitHub setup checklist',
    summary:
      'OAuth App for sign-in, GitHub App for publishing and team sync, permissions, teams, environment and verification.',
  },
  {
    slug: 'users-and-roles',
    path: 'docs/identity-and-rbac.md',
    title: 'Users and roles',
    summary:
      'The first administrator, adding people in Admin → Users & Roles, and the role model.',
  },
  {
    slug: 'docker-production',
    path: 'docs/deployment/docker-production.md',
    title: 'Docker production',
    summary: 'Running the production image, and the smoke checklist.',
  },
  {
    slug: 'portainer',
    path: 'docs/deployment/portainer.md',
    title: 'Portainer',
    summary: 'The hosted stack and its environment file.',
  },
];

/** Repository path → portal URL, for resolving links between the documents. */
export const PUBLIC_DOC_URLS: ReadonlyMap<string, string> = new Map(
  PUBLIC_DOCS.map(doc => [doc.path, `${PUBLIC_DOCS_PATH}/${doc.slug}`]),
);

function normalize(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/';
}

export function isPublicDocsPath(pathname: string): boolean {
  const normalized = normalize(pathname);
  return (
    normalized === PUBLIC_DOCS_PATH ||
    normalized.startsWith(`${PUBLIC_DOCS_PATH}/`)
  );
}

/** The document for `/install/<slug>`; undefined for the index or an unknown slug. */
export function publicDocFor(pathname: string): PublicDoc | undefined {
  const slug = normalize(pathname).slice(PUBLIC_DOCS_PATH.length + 1);
  return PUBLIC_DOCS.find(doc => doc.slug === slug);
}

/** On unless `nexora.publicDocs.enabled` says otherwise. */
export function publicDocsEnabled(
  config: Pick<ConfigApi, 'getOptionalBoolean'>,
): boolean {
  return config.getOptionalBoolean('nexora.publicDocs.enabled') ?? true;
}
