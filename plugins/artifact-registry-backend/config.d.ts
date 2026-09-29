export interface Config {
  artifactRegistry?: {
    manifests?: {
      /**
       * Directory the registry loads `nexora.yaml` manifests from at startup,
       * relative to the process working directory. Defaults to
       * `catalog/artifacts`. A missing directory is not an error.
       *
       * @visibility backend
       */
      directory?: string;
      /**
       * Further manifest sources, loaded alongside `directory`.
       *
       * Each entry is resolved by whichever content provider claims it: an
       * `http://` or `https://` URL is fetched and must answer with a single
       * YAML manifest; anything else is treated as a directory. A source that
       * is not there — a missing directory, or a URL answering 404 — is
       * reported and skipped, not a startup failure.
       *
       * This is the second provider that makes the seam an abstraction rather
       * than an interface with one implementation. See NXD-076.
       *
       * @visibility backend
       */
      sources?: string[];
    };
    /**
     * Who this installation is. Federation attributes content to an origin by
     * it, so the id must be unique across installations that talk to each
     * other — not merely within one deployment.
     */
    installation?: {
      /** @visibility frontend */
      id?: string;
      /** @visibility frontend */
      displayName?: string;
      /**
       * The edition this installation runs, by id from the edition catalogue.
       *
       * Absent means no edition scoping: every artifact is visible, which is
       * the behaviour every installation had before editions were loaded. A
       * value the catalogue does not declare fails startup rather than
       * falling back — it is almost always a typo, and the fallback would
       * hand an operator an unrestricted installation while they believed
       * they had a scoped one.
       *
       * @visibility frontend
       */
      edition?: string;
    };
    editions?: {
      /**
       * Edition catalogue, relative to the working directory. Defaults to
       * `catalog/editions.yaml`. A missing file is not an error; a malformed
       * one fails startup.
       *
       * @visibility backend
       */
      file?: string;
    };
    /**
     * Upstream registries this installation reads from.
     *
     * `loadFederationConfig` has read these keys since W3-7, but no schema
     * declared them — and Backstage rejects a config key no schema knows, so
     * writing this block failed startup and the feature was unreachable by
     * configuration rather than by code. Declared here with T3 (NXD-087),
     * because opening the read routes to a service principal is pointless
     * while the caller cannot be configured to use them.
     *
     * Reading is all this does. Nothing here publishes, and a federated
     * result is not yet persisted or rendered — see T4.
     */
    federation?: {
      /**
       * Off unless set. An installation with no upstream is the normal case.
       *
       * @visibility backend
       */
      enabled?: boolean;
      /**
       * How often the sync scheduler fans out, in seconds. Defaults to 3600.
       *
       * @visibility backend
       */
      syncIntervalSeconds?: number;
      registries?: Array<{
        /**
         * Stable id for this upstream, used in logs and in the `unreachable`
         * list a federated search returns.
         *
         * @visibility backend
         */
        id: string;
        /** @visibility backend */
        displayName: string;
        /**
         * Base URL of the upstream registry's API, e.g.
         * `https://nexora.example.com/api/artifact-registry`.
         *
         * @visibility backend
         */
        baseUrl: string;
        /**
         * Namespaces to accept from this upstream. An empty list accepts all
         * of them.
         *
         * @visibility backend
         */
        namespaces: string[];
        /** @visibility backend */
        level?: 'READ_ONLY' | 'READ_WRITE';
        /**
         * Trust level stamped onto every artifact from this upstream. It is a
         * property of the relationship, not a claim the upstream makes about
         * itself — an artifact cannot federate its own trustworthiness.
         *
         * @visibility backend
         */
        defaultTrustLevel?:
          | 'COMMUNITY'
          | 'PARTNER'
          | 'VERIFIED'
          | 'NEXORA_CERTIFIED';
        /** @visibility backend */
        includeInMarketplace?: boolean;
        /**
         * Bearer token presented to the upstream. It must match a
         * `backend.auth.externalAccess` entry there, which resolves it to a
         * service principal — the credential IS the consumer registration
         * (`TARGET_OPERATING_MODEL.md` §6.5).
         *
         * Server-side only. Never give this `@visibility frontend`.
         *
         * @visibility secret
         */
        apiKey?: string;
        /**
         * Set false to keep an upstream configured but silent.
         *
         * @visibility backend
         */
        enabled?: boolean;
      }>;
    };
  };
}
