import { BlockList, isIP } from 'net';
import { lookup as dnsLookup } from 'dns/promises';
import type { Entity } from '@backstage/catalog-model';

/**
 * NXD-091. Resolves the upstream a consume query may be proxied to, and
 * refuses the ones a catalog author could aim at the Control Plane's own
 * network.
 *
 * Two sources, two trust levels:
 *
 * - `dataProducts.consume.baseUrls`, keyed by product name or template id, is
 *   written by the operator. It is used as given, loopback included — the
 *   Model Company upstream is `http://127.0.0.1:18080`, and a plant historian
 *   is normally on a private network. Configuration is the operator's
 *   decision, not an attack surface.
 * - The `dataprod.platform/consume-base-url` annotation is written by whoever
 *   controls a `catalog-info.yaml`. It is accepted only if its origin is in
 *   `dataProducts.consume.allowedOrigins`, and only if every address its host
 *   resolves to is public.
 *
 * The `consume-rest-path` annotation is catalog-authored under both sources,
 * so the joined URL must keep the base's origin: `@evil.example/x` appended
 * to a trusted base would otherwise move the request to another host.
 */

const ANNOTATION_BASE_URL = 'dataprod.platform/consume-base-url';
const ANNOTATION_REST_PATH = 'dataprod.platform/consume-rest-path';
const DEFAULT_REST_PATH = '/api/v1';

const BLOCKED = new BlockList();
// IPv4: "this network", RFC 1918, CGNAT, loopback, link-local (including the
// cloud metadata endpoint 169.254.169.254), and multicast/reserved.
BLOCKED.addSubnet('0.0.0.0', 8, 'ipv4');
BLOCKED.addSubnet('10.0.0.0', 8, 'ipv4');
BLOCKED.addSubnet('100.64.0.0', 10, 'ipv4');
BLOCKED.addSubnet('127.0.0.0', 8, 'ipv4');
BLOCKED.addSubnet('169.254.0.0', 16, 'ipv4');
BLOCKED.addSubnet('172.16.0.0', 12, 'ipv4');
BLOCKED.addSubnet('192.168.0.0', 16, 'ipv4');
BLOCKED.addSubnet('224.0.0.0', 3, 'ipv4');
// IPv6: unspecified, loopback, unique-local, link-local, multicast.
// IPv4-mapped addresses (::ffff:127.0.0.1) are matched against the IPv4
// subnets above by BlockList itself.
BLOCKED.addAddress('::', 'ipv6');
BLOCKED.addAddress('::1', 'ipv6');
BLOCKED.addSubnet('fc00::', 7, 'ipv6');
BLOCKED.addSubnet('fe80::', 10, 'ipv6');
BLOCKED.addSubnet('ff00::', 8, 'ipv6');

export function isBlockedAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 0) {
    return true;
  }
  return BLOCKED.check(address, family === 4 ? 'ipv4' : 'ipv6');
}

export type HostLookup = (hostname: string) => Promise<string[]>;

const defaultLookup: HostLookup = async hostname =>
  (await dnsLookup(hostname, { all: true, verbatim: true })).map(
    entry => entry.address,
  );

export type UpstreamResolution =
  | { kind: 'none' }
  | { kind: 'upstream'; url: string; source: 'config' | 'annotation' }
  | { kind: 'refused'; reason: string };

export interface ResolveUpstreamOptions {
  baseUrls: Record<string, string>;
  allowedOrigins: readonly string[];
  lookup?: HostLookup;
}

function parseHttpUrl(value: string): URL | undefined {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url
      : undefined;
  } catch {
    return undefined;
  }
}

/** Normalizes configured origins so `https://Host:443/` matches `https://host`. */
export function normalizeOrigins(values: readonly string[]): string[] {
  return values
    .map(value => parseHttpUrl(value)?.origin)
    .filter((origin): origin is string => Boolean(origin));
}

function joinPath(base: URL, rawPath: string): URL | undefined {
  // Checked textually before URL parsing collapses it: a leading "//" is a
  // protocol-relative reference, and "\" is treated as "/" by the WHATWG
  // parser for http(s).
  if (
    !rawPath.startsWith('/') ||
    rawPath.startsWith('//') ||
    rawPath.includes('\\')
  ) {
    return undefined;
  }
  const joined = parseHttpUrl(`${base.href.replace(/\/$/, '')}${rawPath}`);
  if (!joined || joined.origin !== base.origin) {
    return undefined;
  }
  return joined;
}

export async function resolveUpstream(
  entity: Entity,
  options: ResolveUpstreamOptions,
): Promise<UpstreamResolution> {
  const annotations = entity.metadata.annotations ?? {};
  const configured =
    options.baseUrls[entity.metadata.name] ||
    options.baseUrls[annotations['dataprod.platform/template'] ?? ''];
  const annotated = annotations[ANNOTATION_BASE_URL];

  const rawBase = configured || annotated;
  if (!rawBase) {
    return { kind: 'none' };
  }
  const source = configured ? 'config' : 'annotation';

  const base = parseHttpUrl(rawBase);
  if (!base) {
    return { kind: 'refused', reason: 'UPSTREAM_URL_INVALID' };
  }

  if (source === 'annotation') {
    if (base.username || base.password) {
      return { kind: 'refused', reason: 'UPSTREAM_URL_INVALID' };
    }
    if (!normalizeOrigins(options.allowedOrigins).includes(base.origin)) {
      return { kind: 'refused', reason: 'UPSTREAM_ORIGIN_NOT_ALLOWED' };
    }
    const hostname = base.hostname.replace(/^\[(.*)\]$/, '$1');
    let addresses: string[];
    if (isIP(hostname)) {
      addresses = [hostname];
    } else {
      try {
        addresses = await (options.lookup ?? defaultLookup)(hostname);
      } catch {
        return { kind: 'refused', reason: 'UPSTREAM_UNRESOLVABLE' };
      }
    }
    if (addresses.length === 0 || addresses.some(isBlockedAddress)) {
      return { kind: 'refused', reason: 'UPSTREAM_ADDRESS_NOT_PUBLIC' };
    }
  }

  const url = joinPath(base, annotations[ANNOTATION_REST_PATH] ?? DEFAULT_REST_PATH);
  if (!url) {
    return { kind: 'refused', reason: 'UPSTREAM_PATH_INVALID' };
  }
  return { kind: 'upstream', url: url.href, source };
}
