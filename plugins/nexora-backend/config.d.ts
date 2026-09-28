export interface Config {
  nexora?: {
    /**
     * Where scaffolded product repositories are published. Read server-side
     * by the `nexora:scm:resolve-repo` scaffolder action, so no template
     * carries an operator's organisation. NXD-079.
     */
    scm?: {
      /** SCM host, e.g. `github.com`. @visibility frontend */
      host?: string;
      /** Organisation new product repositories are created in. @visibility frontend */
      organization?: string;
    };
    providers?: {
      /**
       * mock uses in-memory fixtures. remote proxies configured base URLs.
       * @visibility backend
       */
      mode?: 'mock' | 'remote';
      connectivity?: {
        /**
         * Optional connectivity provider base URL. Server-side only.
         */
        baseUrl?: string;
      };
      dataQuality?: {
        /**
         * Optional data-quality provider base URL. Server-side only.
         */
        baseUrl?: string;
      };
      contracts?: {
        /**
         * Optional contract provider base URL. Server-side only.
         */
        baseUrl?: string;
      };
    };
  };
}
