import { AppRootWrapperBlueprint } from '@backstage/plugin-app-react';
import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { CreateSuccessGate } from './CreateSuccessGate';

const createSuccessWrapper = AppRootWrapperBlueprint.make({
  name: 'create-success',
  params: {
    component: ({ children }) => (
      <CreateSuccessGate>{children}</CreateSuccessGate>
    ),
  },
});

export const createModule = createFrontendModule({
  pluginId: 'app',
  extensions: [createSuccessWrapper],
});
