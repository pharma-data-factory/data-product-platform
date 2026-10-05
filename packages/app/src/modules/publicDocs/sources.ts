/**
 * The public documents, bundled into the frontend at build time (NXD-114).
 *
 * The Backstage bundler emits an imported `.md` file as a static asset and
 * hands back its URL. Static assets are served without authentication, so the
 * page can fetch them before anyone has signed in — and needs no backend
 * route, no database and no GitHub. The files are read from the repository at
 * build time, which also means the image does not have to ship README.md or
 * START.md.
 *
 * Kept apart from the page so tests can replace the loader.
 */

// These imports reach outside the package on purpose: the documents live at
// the repository root and in docs/, where GitHub and TechDocs read them too.
// Embedding them at build time keeps one copy of each instead of a second,
// drifting one under packages/app. The app package is private and always built
// inside the monorepo, which is what the rule protects against otherwise.
/* eslint-disable @backstage/no-relative-monorepo-imports */
import readme from '../../../../../README.md';
import start from '../../../../../START.md';
import githubSetup from '../../../../../docs/github-setup.md';
import identityAndRbac from '../../../../../docs/identity-and-rbac.md';
import dockerProduction from '../../../../../docs/deployment/docker-production.md';
import portainer from '../../../../../docs/deployment/portainer.md';
/* eslint-enable @backstage/no-relative-monorepo-imports */

const ASSET_URLS: Record<string, string> = {
  'README.md': readme,
  'START.md': start,
  'docs/github-setup.md': githubSetup,
  'docs/identity-and-rbac.md': identityAndRbac,
  'docs/deployment/docker-production.md': dockerProduction,
  'docs/deployment/portainer.md': portainer,
};

export type DocumentLoader = (path: string) => Promise<string>;

export const loadBundledDocument: DocumentLoader = async path => {
  const url = ASSET_URLS[path];
  if (!url) {
    throw new Error(`Not a public document: ${path}`);
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load ${path} (${response.status})`);
  }
  return response.text();
};
