import { SignInPageBlueprint } from '@backstage/plugin-app-react';
import { createFrontendModule } from '@backstage/frontend-plugin-api';

const landingSignInPage = SignInPageBlueprint.make({
  params: {
    loader: async () => {
      const { LandingSignInPage } = await import('./LandingSignInPage');
      return LandingSignInPage;
    },
  },
});

export const identityModule = createFrontendModule({
  pluginId: 'app',
  extensions: [landingSignInPage],
});
