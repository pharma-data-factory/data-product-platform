import {
  nexoraColors,
  nexoraTypography,
  type NexoraColorMode,
} from './tokens';

/** CSS custom property map for the active color mode. */
export function getNexoraCssVariables(
  mode: NexoraColorMode = 'light',
): Record<string, string> {
  const c = nexoraColors[mode];
  return {
    '--nexora-color-surface': c.surface,
    '--nexora-color-surface-raised': c.surfaceRaised,
    '--nexora-color-section': c.section,
    '--nexora-color-text': c.text,
    '--nexora-color-text-muted': c.textMuted,
    '--nexora-color-text-on-dark': c.textOnDark,
    '--nexora-color-text-on-dark-muted': c.textOnDarkMuted,
    '--nexora-color-border': c.border,
    '--nexora-color-border-strong': c.borderStrong,
    '--nexora-color-accent': c.accent,
    '--nexora-color-accent-hover': c.accentHover,
    '--nexora-color-accent-readable': c.accentReadable,
    '--nexora-color-accent-on-dark': c.accentOnDark,
    '--nexora-color-primary': c.primary,
    '--nexora-color-primary-dark': c.primaryDark,
    '--nexora-color-primary-light': c.primaryLight,
    '--nexora-color-primary-contrast': c.primaryContrast,
    '--nexora-color-nav-bg': c.navBg,
    '--nexora-color-nav-hover': c.navHover,
    '--nexora-color-nav-color': c.navColor,
    '--nexora-color-nav-selected': c.navSelected,
    '--nexora-color-submenu-bg': c.submenuBg,
    '--nexora-color-card-hover': c.cardHover,
    '--nexora-color-glass': c.glass,
    '--nexora-color-focus': c.focus,
    '--nexora-color-link': c.link,
    '--nexora-color-compliance': c.compliance,
    '--nexora-color-security': c.security,
    '--nexora-color-hero-from': c.heroFrom,
    '--nexora-color-hero-to': c.heroTo,
    '--nexora-color-table-head': c.tableHeadBg,
    '--nexora-color-cyan-tint': c.cyanTint,
    '--nexora-shadow': c.shadow,
    '--nexora-font-sans': nexoraTypography.fontFamily.sans,
    '--nexora-font-display': nexoraTypography.fontFamily.display,
    '--nexora-font-mono': nexoraTypography.fontFamily.mono,
    // Legacy HomeStyles bridge (--nx-*) → same semantic source
    '--nx-bg': c.heroTo,
    '--nx-bg-deep': c.heroFrom,
    '--nx-surface': c.heroTo,
    '--nx-surface-2': mode === 'dark' ? '#12243A' : '#12243A',
    '--nx-cyan': c.accent,
    '--nx-cyan-bright': c.accentOnDark,
    '--nx-cyan-soft': c.accentOnDark,
    '--nx-text': c.textOnDark,
    '--nx-text-muted': '#b6c3d2',
    '--nx-border': 'rgba(94, 228, 240, 0.22)',
    '--nx-border-strong': 'rgba(0, 194, 217, 0.45)',
  };
}

/** Inline style object for React `style={nexoraRootStyle(mode)}`. */
export function nexoraRootStyle(
  mode: NexoraColorMode = 'light',
): Record<string, string> {
  return getNexoraCssVariables(mode);
}

/** Serialize CSS variables for a `<style>` block. */
export function cssVariablesToDeclaration(
  mode: NexoraColorMode = 'light',
): string {
  return Object.entries(getNexoraCssVariables(mode))
    .map(([key, value]) => `${key}: ${value};`)
    .join('\n      ');
}
