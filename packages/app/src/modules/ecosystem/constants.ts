export const SOLUTIONS_PATH = '/solutions';
export const ACADEMY_PATH = '/academy';
export const TRUST_PATH = '/trust';
export const ECOSYSTEM_PATH = '/ecosystem';
export const ENTERPRISE_PATH = '/enterprise';

export const SOLUTION_SLUGS = [
  'life-sciences',
  'enterprise-it',
  'consultants',
  'partners',
  'developers',
] as const;

export type SolutionSlug = (typeof SOLUTION_SLUGS)[number];

function normalizePath(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/';
}

export function solutionSlugFromPathname(
  pathname: string,
): SolutionSlug | undefined {
  const normalized = normalizePath(pathname);
  if (!normalized.startsWith(`${SOLUTIONS_PATH}/`)) {
    return undefined;
  }
  const slug = normalized.slice(SOLUTIONS_PATH.length + 1);
  return (SOLUTION_SLUGS as readonly string[]).includes(slug)
    ? (slug as SolutionSlug)
    : undefined;
}

export function isPublicEcosystemPath(pathname: string): boolean {
  const normalized = normalizePath(pathname);
  if (
    normalized === SOLUTIONS_PATH ||
    normalized === ACADEMY_PATH ||
    normalized === TRUST_PATH ||
    normalized === ECOSYSTEM_PATH ||
    normalized === ENTERPRISE_PATH
  ) {
    return true;
  }
  return solutionSlugFromPathname(pathname) !== undefined;
}
