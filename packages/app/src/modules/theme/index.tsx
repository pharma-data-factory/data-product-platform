import LightIcon from '@material-ui/icons/Brightness7';
import DarkIcon from '@material-ui/icons/Brightness4';
import { UnifiedThemeProvider } from '@backstage/theme';
import { ThemeBlueprint } from '@backstage/plugin-app-react';
import { createFrontendModule } from '@backstage/frontend-plugin-api';
import {
  pharmaDataFactoryDarkTheme,
  pharmaDataFactoryTheme,
} from './theme';

/**
 * Two branded themes enable Backstage's built-in top-right theme switch
 * (User Settings / appearance). Default app light/dark stay disabled in
 * app-config.yaml so only Nexora themes appear.
 */
const nexoraLightTheme = ThemeBlueprint.make({
  name: 'nexora-light',
  params: {
    theme: {
      id: 'nexora-light',
      title: 'Light',
      variant: 'light',
      icon: <LightIcon />,
      Provider: ({ children }) => (
        <UnifiedThemeProvider theme={pharmaDataFactoryTheme}>
          {children}
        </UnifiedThemeProvider>
      ),
    },
  },
});

const nexoraDarkTheme = ThemeBlueprint.make({
  name: 'nexora-dark',
  params: {
    theme: {
      id: 'nexora-dark',
      title: 'Dark',
      variant: 'dark',
      icon: <DarkIcon />,
      Provider: ({ children }) => (
        <UnifiedThemeProvider theme={pharmaDataFactoryDarkTheme}>
          {children}
        </UnifiedThemeProvider>
      ),
    },
  },
});

export const themeModule = createFrontendModule({
  pluginId: 'app',
  extensions: [nexoraLightTheme, nexoraDarkTheme],
});
