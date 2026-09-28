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
  };
}
