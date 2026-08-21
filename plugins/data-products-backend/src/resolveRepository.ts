import {
  ANNOTATION_SOURCE_LOCATION,
  ANNOTATION_VIEW_URL,
  Entity,
  getEntitySourceLocation,
} from '@backstage/catalog-model';

import { GithubRepoRef } from './types';

const GITHUB_PROJECT_SLUG = 'github.com/project-slug';

export function resolveGithubRepository(
  entity: Entity,
): GithubRepoRef | undefined {
  const annotations = entity.metadata.annotations ?? {};
  const slug = annotations[GITHUB_PROJECT_SLUG]?.trim();
  if (slug) {
    const fromSlug = parseOwnerRepo(slug, 'github.com');
    if (fromSlug) {
      return fromSlug;
    }
  }

  const candidates: string[] = [];
  const sourceLocation = annotations[ANNOTATION_SOURCE_LOCATION];
  if (sourceLocation) {
    candidates.push(stripLocationPrefix(sourceLocation));
  }

  try {
    candidates.push(getEntitySourceLocation(entity).target);
  } catch {
    // Source location is optional for locally registered example entities.
  }

  const viewUrl = annotations[ANNOTATION_VIEW_URL];
  if (viewUrl) {
    candidates.push(viewUrl);
  }

  for (const link of entity.metadata.links ?? []) {
    if (/repository/i.test(link.title ?? '') && link.url) {
      candidates.push(link.url);
    }
  }

  for (const candidate of candidates) {
    const parsed = parseGithubUrl(candidate);
    if (parsed) {
      return parsed;
    }
  }

  return undefined;
}

function stripLocationPrefix(value: string): string {
  const match = value.match(/^(?:url|file):(.+)$/i);
  return match ? match[1] : value;
}

function parseOwnerRepo(
  slug: string,
  host: string,
): GithubRepoRef | undefined {
  const parts = slug.replace(/^\/+|\/+$/g, '').split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return undefined;
  }
  const repo = parts[1].replace(/\.git$/i, '');
  return {
    host,
    owner: parts[0],
    repo,
    url: `https://${host}/${parts[0]}/${repo}`,
  };
}

export function parseGithubUrl(raw: string): GithubRepoRef | undefined {
  try {
    const url = new URL(stripLocationPrefix(raw));
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return undefined;
    }
    const parts = url.pathname.replace(/^\/+|\/+$/g, '').split('/');
    if (parts.length < 2) {
      return undefined;
    }
    const [owner, repoRaw] = parts;
    const reserved = new Set([
      'orgs',
      'users',
      'settings',
      'marketplace',
      'topics',
      'apps',
      'org',
      'login',
    ]);
    if (!owner || !repoRaw || reserved.has(owner.toLowerCase())) {
      return undefined;
    }
    const repo = repoRaw.replace(/\.git$/i, '');
    return {
      host: url.host,
      owner,
      repo,
      url: `https://${url.host}/${owner}/${repo}`,
    };
  } catch {
    return undefined;
  }
}
