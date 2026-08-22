export interface Config {
  nexora?: {
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
