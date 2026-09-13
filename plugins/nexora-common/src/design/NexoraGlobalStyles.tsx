import { useTheme } from '@material-ui/core/styles';
import { cssVariablesToDeclaration } from './cssVariables';
import type { NexoraColorMode } from './tokens';

function resolveMode(paletteType: string | undefined): NexoraColorMode {
  return paletteType === 'dark' ? 'dark' : 'light';
}

/**
 * Injects `:root` CSS variables for the active MUI theme variant.
 * Mount once inside each UnifiedThemeProvider so the light/dark switch
 * updates Landing, Home, and plugin surfaces that use `var(--nexora-*)`.
 */
export function NexoraGlobalStyles() {
  const theme = useTheme();
  const mode = resolveMode(
    (theme.palette as { type?: string; mode?: string }).type ??
      (theme.palette as { mode?: string }).mode,
  );
  const declaration = cssVariablesToDeclaration(mode);

  return (
    <style data-nexora-theme={mode}>{`
      :root {
        ${declaration}
      }
      .nexora-display {
        font-family: var(--nexora-font-display);
        letter-spacing: -0.02em;
      }
      .nexora-mono {
        font-family: var(--nexora-font-mono);
      }
    `}</style>
  );
}

/**
 * Light defaults for public pages that may render before a ThemeProvider.
 * Safe to mount alongside NexoraGlobalStyles (theme provider overrides :root).
 */
export function NexoraDefaultCssVariables() {
  const declaration = cssVariablesToDeclaration('light');
  return (
    <style data-nexora-theme="light-default">{`
      :root {
        ${declaration}
      }
    `}</style>
  );
}
