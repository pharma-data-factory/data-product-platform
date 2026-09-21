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
    };
  };
}
