/**
 * Versioning Service
 * Handles version number generation and comparison
 */

/**
 * Parse semantic version string
 * E.g., "1.0" → {major: 1, minor: 0}
 */
export function parseVersion(versionStr: string): { major: number; minor: number } {
  const parts = versionStr.split('.');
  const major = parseInt(parts[0], 10) || 0;
  const minor = parseInt(parts[1], 10) || 0;
  return { major, minor };
}

/**
 * Format version object to string
 */
export function formatVersion(major: number, minor: number): string {
  return `${major}.${minor}`;
}

/**
 * Generate next minor version
 * E.g., "1.0" → "1.1"
 */
export function nextMinorVersion(currentVersion: string): string {
  const { major, minor } = parseVersion(currentVersion);
  return formatVersion(major, minor + 1);
}

/**
 * Generate next major version
 * E.g., "1.5" → "2.0"
 */
export function nextMajorVersion(currentVersion: string): string {
  const { major } = parseVersion(currentVersion);
  return formatVersion(major + 1, 0);
}

/**
 * Compare two versions
 * Returns: -1 (v1 < v2), 0 (v1 == v2), 1 (v1 > v2)
 */
export function compareVersions(v1: string, v2: string): number {
  const p1 = parseVersion(v1);
  const p2 = parseVersion(v2);

  if (p1.major !== p2.major) {
    return p1.major < p2.major ? -1 : 1;
  }
  if (p1.minor !== p2.minor) {
    return p1.minor < p2.minor ? -1 : 1;
  }
  return 0;
}

/**
 * Check if version is higher
 */
export function isVersionHigher(v1: string, v2: string): boolean {
  return compareVersions(v1, v2) > 0;
}

/**
 * Get version number for comparison/sorting
 * E.g., "1.0" → 100, "1.5" → 105, "2.0" → 200
 */
export function getVersionNumber(versionStr: string): number {
  const { major, minor } = parseVersion(versionStr);
  return major * 100 + minor;
}
