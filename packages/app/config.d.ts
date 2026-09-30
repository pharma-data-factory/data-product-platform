export interface Config {
  auth?: {
    providers?: {
      github?: {
        [authEnv: string]: {
          /**
           * GitHub OAuth App client ID for portal login.
           * Public by design, so the sign-in page can detect GitHub.
           *
           * Optional: AUTH_GITHUB_CLIENT_ID is frequently unset in local
           * development, which drops the key entirely. Declaring it required
           * fails app bundle validation at startup instead.
           * @visibility frontend
           */
          clientId?: string;
        };
      };
      /**
       * Token-based Guest identity, local development only. Opt-in via
       * AUTH_GUEST_ENABLED=true, which loads app-config.guest.yaml.
       *
       * Frontend visibility is declared here, in the schema. A visibility
       * comment in app-config.yaml has no effect; without the declaration
       * below the key is stripped from the frontend config and
       * LandingSignInPage never renders the Guest button, because it keys off
       * the presence of auth.providers.guest.
       *
       * This package is registered as a schema source through the
       * "configSchema" field in package.json. Without that field the whole
       * file is ignored.
       */
      guest?: {
        /**
         * Catalog user the Guest session maps to.
         * @visibility frontend
         */
        userEntityRef?: string;
      };
      /**
       * Named demo identities, local development only (NXD-057). Loaded by
       * app-config.demo.yaml.
       *
       * The same trap the Guest note above describes, found again by the
       * first end-to-end test of the approval chain (NXD-097): the
       * `@visibility frontend` comment in app-config.demo.yaml did nothing,
       * the list was stripped from the frontend config, and the sign-in page
       * never offered a single "Continue as demo-…" button — so the chain
       * NXD-057 exists to demonstrate could not be walked in a browser.
       */
      demo?: {
        /**
         * The closed allow-list of identities the sign-in page offers.
         * @visibility frontend
         */
        users?: string[];
      };
    };
  };
}
