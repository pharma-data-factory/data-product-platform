/**
 * Multi-Registry Federation — W3-7.
 *
 * Defines the types and interfaces for federating multiple Artifact Registries.
 * A federated registry query fans out to all registered remote registries and
 * merges the results, de-duplicating by coordinate.
 *
 * This is the foundation layer. The HTTP client implementation lives in
 * `plugins/artifact-registry-backend/src/federatedRegistry.ts` (not yet
 * built — this types file establishes the contract).
 *
 * Federation levels:
 *   READ_ONLY   — external artifacts are visible but cannot be certified/published locally.
 *   MIRROR      — local cache of remote artifacts; updated on schedule or on-demand.
 *   BIDIRECTIONAL — both registries can publish to each other (future).
 */

/** A remote registry this installation federates with. */
export interface FederatedRegistry {
  /** Unique identifier for this federation link. */
  id: string;
  displayName: string;
  /** Base URL of the remote registry API (GET /artifacts, etc.). */
  baseUrl: string;
  /** Namespace filter — only artifacts in these namespaces are federated. */
  namespaces: string[];
  /** Federation level. */
  level: 'READ_ONLY' | 'MIRROR';
  /** Trust level assigned to artifacts from this registry. */
  defaultTrustLevel: 'PARTNER' | 'COMMUNITY';
  /** Whether to show artifacts from this registry in the Marketplace. */
  includeInMarketplace: boolean;
  /** Optional API key for authenticated remote registries. */
  apiKey?: string;
  /** Last successful synchronisation timestamp. */
  lastSyncAt?: Date;
  enabled: boolean;
}

/** An artifact resolved from a federated registry. */
export interface FederatedArtifact {
  /** The remote registry this artifact comes from. */
  registryId: string;
  /** Coordinate as reported by the remote registry. */
  namespace: string;
  name: string;
  version: string;
  displayName?: string;
  kind: string;
  lifecycle: string;
  certificationStatus?: string;
  /** Effective trust level (from FederatedRegistry.defaultTrustLevel). */
  trustLevel: 'PARTNER' | 'COMMUNITY';
}

/**
 * Result of a federated artifact search.
 * Local artifacts always take precedence over federated ones for the same coordinate.
 */
export interface FederatedSearchResult {
  /** Artifacts from the local registry. */
  local: FederatedArtifact[];
  /** Artifacts from remote registries (read-only). */
  remote: FederatedArtifact[];
  /** Registries that were unreachable during this search. */
  unreachable: string[];
}

/**
 * Configuration for the federation engine.
 * Loaded from `app-config.yaml` under `artifactRegistry.federation`.
 */
export interface FederationConfig {
  enabled: boolean;
  registries: FederatedRegistry[];
  /** Seconds between automatic mirror synchronisations. Default 3600. */
  syncIntervalSeconds?: number;
  /** Maximum number of artifacts to fetch per remote registry per sync. Default 500. */
  maxArtifactsPerSync?: number;
}
