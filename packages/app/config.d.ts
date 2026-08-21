export interface Config {
  auth?: {
    providers?: {
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
