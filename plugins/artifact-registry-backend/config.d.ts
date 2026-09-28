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
  };
}
