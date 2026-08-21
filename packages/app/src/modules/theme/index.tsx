import { UnifiedThemeProvider } from '@backstage/theme';
import { ThemeBlueprint } from '@backstage/plugin-app-react';
import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { pharmaDataFactoryTheme } from './theme';

const pharmaThemeExtension = ThemeBlueprint.make({
  name: 'pharma-data-factory',
  params: {
    theme: {
      id: 'pharma-data-factory',
      title: 'Pharma Data Factory',
      variant: 'light',
      Provider: ({ children }) => (
        <UnifiedThemeProvider theme={pharmaDataFactoryTheme}>
          {children}
        </UnifiedThemeProvider>
      ),
    },
  },
});

export const themeModule = createFrontendModule({
  pluginId: 'app',
  extensions: [pharmaThemeExtension],
});
