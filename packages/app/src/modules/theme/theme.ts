import {
  createUnifiedTheme,
  genPageTheme,
  palettes,
  shapes,
} from '@backstage/theme';
import {
  nexoraColors,
  nexoraPrimitives,
  nexoraTypography,
} from '@internal/plugin-nexora-common';
import {
  C,
  PHARMA_NAVY,
  PHARMA_TEAL,
  PHARMA_TEAL_LIGHT,
} from './tokens';

export {
  BRAND_NAME,
  BRAND_WORDMARK,
  C,
  PHARMA_NAVY,
  PHARMA_NAVY_DARK,
  PHARMA_PAPER,
  PHARMA_SURFACE,
  PHARMA_TEAL,
  PHARMA_TEAL_DARK,
  PHARMA_TEAL_LIGHT,
  PHARMA_TEXT,
} from './tokens';

const light = nexoraColors.light;
const dark = nexoraColors.dark;

const pageThemes = {
  home: genPageTheme({
    colors: [PHARMA_NAVY, PHARMA_TEAL],
    shape: shapes.wave,
    options: { fontColor: nexoraPrimitives.white },
  }),
  app: genPageTheme({
    colors: [PHARMA_NAVY, nexoraPrimitives.navyMid],
    shape: shapes.wave,
    options: { fontColor: nexoraPrimitives.white },
  }),
  documentation: genPageTheme({
    colors: [PHARMA_NAVY, PHARMA_TEAL],
    shape: shapes.round,
    options: { fontColor: nexoraPrimitives.white },
  }),
  tool: genPageTheme({
    colors: [PHARMA_NAVY, nexoraPrimitives.navyMid],
    shape: shapes.wave,
    options: { fontColor: nexoraPrimitives.white },
  }),
  service: genPageTheme({
    colors: [PHARMA_NAVY, PHARMA_TEAL],
    shape: shapes.wave,
    options: { fontColor: nexoraPrimitives.white },
  }),
  website: genPageTheme({
    colors: [PHARMA_NAVY, PHARMA_TEAL],
    shape: shapes.wave,
    options: { fontColor: nexoraPrimitives.white },
  }),
  library: genPageTheme({
    colors: [nexoraPrimitives.navyMid, PHARMA_TEAL],
    shape: shapes.round,
    options: { fontColor: nexoraPrimitives.white },
  }),
  other: genPageTheme({
    colors: [PHARMA_NAVY, nexoraPrimitives.navyMid],
    shape: shapes.wave,
    options: { fontColor: nexoraPrimitives.white },
  }),
  apis: genPageTheme({
    colors: [PHARMA_NAVY, PHARMA_TEAL],
    shape: shapes.wave,
    options: { fontColor: nexoraPrimitives.white },
  }),
};

/** Light Control Plane theme (default). */
export const pharmaDataFactoryTheme = createUnifiedTheme({
  palette: {
    ...palettes.light,
    type: 'light',
    mode: 'light',
    background: {
      default: light.surface,
      paper: light.surfaceRaised,
    },
    primary: {
      main: light.primary,
      dark: light.primaryDark,
      light: light.primaryLight,
      contrastText: light.primaryContrast,
    },
    secondary: {
      main: light.accent,
      dark: light.accentHover,
      light: PHARMA_TEAL_LIGHT,
      contrastText: light.primaryContrast,
    },
    text: {
      primary: light.text,
      secondary: light.textMuted,
    },
    divider: light.border,
    navigation: {
      ...palettes.light.navigation,
      background: light.navBg,
      indicator: light.accent,
      color: light.navColor,
      selectedColor: light.navSelected,
      navItem: {
        hoverBackground: light.navHover,
      },
      submenu: {
        background: light.submenuBg,
      },
    },
    status: {
      ...palettes.light.status,
      ok: light.statusOk,
      running: light.statusRunning,
      pending: light.statusPending,
    },
    link: light.link,
    linkHover: light.linkHover,
    tabbar: {
      indicator: light.accent,
    },
  },
  fontFamily: nexoraTypography.fontFamily.sans,
  defaultPageTheme: 'home',
  pageTheme: pageThemes,
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontWeight: 600,
          textTransform: 'none',
        },
        containedPrimary: {
          backgroundColor: light.primary,
          color: light.primaryContrast,
          fontWeight: 600,
          textTransform: 'none',
          '&:hover': {
            backgroundColor: light.primaryDark,
          },
        },
        containedSecondary: {
          backgroundColor: light.accent,
          color: light.primaryDark,
          fontWeight: 600,
          textTransform: 'none',
          '&:hover': {
            backgroundColor: light.accentHover,
          },
        },
        outlinedPrimary: {
          borderColor: C.border,
          color: light.primary,
          textTransform: 'none',
          '&:hover': {
            backgroundColor: light.cyanTint,
            borderColor: light.accent,
          },
        },
        textPrimary: {
          color: light.primary,
          fontWeight: 600,
          textTransform: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 600,
        },
        colorPrimary: {
          backgroundColor: light.primary,
          color: light.primaryContrast,
        },
        outlined: {
          borderColor: C.border,
          color: light.text,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: light.surfaceRaised,
          border: `1px solid ${C.border}`,
          boxShadow: light.shadow,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '14px 16px',
          verticalAlign: 'middle',
        },
        head: {
          fontWeight: 600,
          whiteSpace: 'nowrap',
        },
      },
    },
  },
});

/** Dark Control Plane theme — selectable via the top-right theme switch. */
export const pharmaDataFactoryDarkTheme = createUnifiedTheme({
  palette: {
    ...palettes.dark,
    type: 'dark',
    mode: 'dark',
    background: {
      default: dark.surface,
      paper: dark.surfaceRaised,
    },
    primary: {
      main: dark.primary,
      dark: dark.primaryDark,
      light: dark.primaryLight,
      contrastText: dark.primaryContrast,
    },
    secondary: {
      main: dark.accentOnDark,
      dark: dark.accent,
      light: nexoraPrimitives.cyanSoft,
      contrastText: dark.primaryContrast,
    },
    text: {
      primary: dark.text,
      secondary: dark.textMuted,
    },
    divider: dark.border,
    navigation: {
      ...palettes.dark.navigation,
      background: dark.navBg,
      indicator: dark.accent,
      color: dark.navColor,
      selectedColor: dark.navSelected,
      navItem: {
        hoverBackground: dark.navHover,
      },
      submenu: {
        background: dark.submenuBg,
      },
    },
    status: {
      ...palettes.dark.status,
      ok: dark.statusOk,
      running: dark.statusRunning,
      pending: dark.statusPending,
    },
    link: dark.link,
    linkHover: dark.linkHover,
    tabbar: {
      indicator: dark.accent,
    },
  },
  fontFamily: nexoraTypography.fontFamily.sans,
  defaultPageTheme: 'home',
  pageTheme: pageThemes,
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontWeight: 600,
          textTransform: 'none',
        },
        containedPrimary: {
          backgroundColor: dark.primary,
          color: dark.primaryContrast,
          fontWeight: 600,
          textTransform: 'none',
          '&:hover': {
            backgroundColor: dark.primaryDark,
          },
        },
        containedSecondary: {
          backgroundColor: dark.accentOnDark,
          color: dark.primaryContrast,
          fontWeight: 600,
          textTransform: 'none',
        },
        outlinedPrimary: {
          borderColor: dark.accent,
          color: dark.accentOnDark,
          textTransform: 'none',
          '&:hover': {
            backgroundColor: dark.cyanTint,
          },
        },
        textPrimary: {
          color: dark.accentOnDark,
          fontWeight: 600,
          textTransform: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 600,
        },
        colorPrimary: {
          backgroundColor: dark.primary,
          color: dark.primaryContrast,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: dark.surfaceRaised,
          border: `1px solid ${dark.border}`,
          boxShadow: dark.shadow,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '14px 16px',
          verticalAlign: 'middle',
        },
        head: {
          fontWeight: 600,
          whiteSpace: 'nowrap',
        },
      },
    },
  },
});
