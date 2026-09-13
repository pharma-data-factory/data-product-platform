export interface Config {
  auth?: {
    providers?: {
      /**
       * Guest sign-in for local development. The sign-in page renders the
       * "Continue as Guest" button only when this block reaches the frontend.
       */
      guest?: {
        /**
         * Entity ref of the guest user. Must match the catalog seed.
         * @visibility frontend
         */
        userEntityRef?: string;
        /**
         * Ownership refs assigned to the guest identity.
         * @visibility frontend
         */
        ownershipEntityRefs?: string[];
      };
      github?: {
        [authEnv: string]: {
          /**
           * GitHub OAuth App client ID for portal login.
           * Public by design; required so the sign-in page can detect GitHub.
           * @visibility frontend
           */
          clientId: string;
        };
      };
    };
  };
}
