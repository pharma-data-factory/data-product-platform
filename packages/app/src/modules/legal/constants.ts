export const LEGAL_PATHS = {
  legal: '/legal',
  privacy: '/privacy',
  terms: '/terms',
  openSource: '/open-source',
} as const;

export const LEGAL_NAV = [
  { id: 'legal', path: LEGAL_PATHS.legal, title: 'Legal' },
  { id: 'privacy', path: LEGAL_PATHS.privacy, title: 'Privacy' },
  { id: 'terms', path: LEGAL_PATHS.terms, title: 'Terms' },
  { id: 'open-source', path: LEGAL_PATHS.openSource, title: 'Open source' },
] as const;

export function isPublicLegalPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  return Object.values(LEGAL_PATHS).includes(
    normalized as (typeof LEGAL_PATHS)[keyof typeof LEGAL_PATHS],
  );
}

export function legalPageId(pathname: string): keyof typeof LEGAL_PATHS | 'legal' {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  if (normalized === LEGAL_PATHS.privacy) {
    return 'privacy';
  }
  if (normalized === LEGAL_PATHS.terms) {
    return 'terms';
  }
  if (normalized === LEGAL_PATHS.openSource) {
    return 'openSource';
  }
  return 'legal';
}
