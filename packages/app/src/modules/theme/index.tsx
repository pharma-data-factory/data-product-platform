import LightIcon from '@material-ui/icons/Brightness7';
import DarkIcon from '@material-ui/icons/Brightness4';
import { UnifiedThemeProvider } from '@backstage/theme';
import { ThemeBlueprint } from '@backstage/plugin-app-react';
import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { nexoraHeroDeclarations } from '@internal/plugin-nexora-common';
import {
  pharmaDataFactoryDarkTheme,
  pharmaDataFactoryTheme,
} from './theme';

/**
 * NXD-169. Sets the page-hero custom properties (NEXORA_HERO_VAR) for the
 * theme the user picked under Settings → Appearance, which may differ from
 * the operating system's colour scheme.
 */
function HeroVars({ variant }: { variant: 'light' | 'dark' }) {
  return <style>{`:root { ${nexoraHeroDeclarations(variant)} }`}</style>;
}

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
          <HeroVars variant="light" />
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
          <HeroVars variant="dark" />
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
