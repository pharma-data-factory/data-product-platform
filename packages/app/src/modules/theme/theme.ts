import {
  createUnifiedTheme,
  genPageTheme,
  palettes,
  shapes,
} from '@backstage/theme';
import {
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
import {
  NEXORA_CARD,
  NEXORA_CYAN,
  NEXORA_CYAN_PALE,
  NEXORA_DARK,
  NEXORA_GREY,
  NEXORA_NAVY,
  NEXORA_NAVY_LINE,
  NEXORA_NAVY_SOFT,
  NEXORA_ON_NAVY,
  withAlpha,
} from '@internal/plugin-nexora-common';

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

const pageThemes = {
  home: genPageTheme({
    colors: [PHARMA_NAVY, PHARMA_TEAL],
    shape: shapes.wave,
    options: { fontColor: NEXORA_CARD },
  }),
  app: genPageTheme({
    colors: [PHARMA_NAVY, NEXORA_NAVY_SOFT],
    shape: shapes.wave,
    options: { fontColor: NEXORA_CARD },
  }),
  documentation: genPageTheme({
    colors: [PHARMA_NAVY, PHARMA_TEAL],
    shape: shapes.round,
    options: { fontColor: NEXORA_CARD },
  }),
  tool: genPageTheme({
    colors: [PHARMA_NAVY, NEXORA_NAVY_SOFT],
    shape: shapes.wave,
    options: { fontColor: NEXORA_CARD },
  }),
  service: genPageTheme({
    colors: [PHARMA_NAVY, PHARMA_TEAL],
    shape: shapes.wave,
    options: { fontColor: NEXORA_CARD },
  }),
  website: genPageTheme({
    colors: [PHARMA_NAVY, PHARMA_TEAL],
    shape: shapes.wave,
    options: { fontColor: NEXORA_CARD },
  }),
  library: genPageTheme({
    colors: [NEXORA_NAVY_SOFT, PHARMA_TEAL],
    shape: shapes.round,
    options: { fontColor: NEXORA_CARD },
  }),
  other: genPageTheme({
    colors: [PHARMA_NAVY, NEXORA_NAVY_SOFT],
    shape: shapes.wave,
    options: { fontColor: NEXORA_CARD },
  }),
  apis: genPageTheme({
    colors: [PHARMA_NAVY, PHARMA_TEAL],
    shape: shapes.wave,
    options: { fontColor: NEXORA_CARD },
  }),
};

/** Light Control Plane theme (default). */
export const pharmaDataFactoryTheme = createUnifiedTheme({
  palette: {
    ...palettes.light,
    type: 'light',
    mode: 'light',
    background: {
      default: PHARMA_SURFACE,
      paper: PHARMA_PAPER,
    },
    primary: {
      main: PHARMA_NAVY,
      dark: PHARMA_NAVY_DARK,
      light: NEXORA_NAVY_SOFT,
      contrastText: NEXORA_CARD,
    },
    secondary: {
      main: PHARMA_TEAL,
      dark: PHARMA_TEAL_DARK,
      light: PHARMA_TEAL_LIGHT,
      contrastText: NEXORA_CARD,
    },
    text: {
      primary: PHARMA_TEXT,
      secondary: C.muted,
    },
    navigation: {
      ...palettes.light.navigation,
      background: PHARMA_NAVY,
      indicator: PHARMA_TEAL,
      color: NEXORA_ON_NAVY,
      selectedColor: NEXORA_CARD,
      navItem: {
        hoverBackground: NEXORA_NAVY_LINE,
      },
      submenu: {
        background: PHARMA_NAVY_DARK,
      },
    },
    status: {
      ...palettes.light.status,
      ok: PHARMA_TEAL,
      running: NEXORA_NAVY_SOFT,
      pending: NEXORA_GREY[500],
    },
    link: PHARMA_TEAL,
    linkHover: PHARMA_TEAL_DARK,
    tabbar: {
      indicator: PHARMA_TEAL,
    },
  },
  fontFamily: 'Inter, Segoe UI, system-ui, sans-serif',
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
          backgroundColor: PHARMA_NAVY,
          color: NEXORA_CARD,
          fontWeight: 600,
          textTransform: 'none',
          '&:hover': {
            backgroundColor: PHARMA_NAVY_DARK,
          },
        },
        containedSecondary: {
          backgroundColor: PHARMA_TEAL,
          color: PHARMA_NAVY_DARK,
          fontWeight: 600,
          textTransform: 'none',
          '&:hover': {
            backgroundColor: PHARMA_TEAL_DARK,
          },
        },
        outlinedPrimary: {
          borderColor: C.border,
          color: PHARMA_NAVY,
          textTransform: 'none',
          '&:hover': {
            backgroundColor: withAlpha(NEXORA_CYAN, 0.08),
            borderColor: PHARMA_TEAL,
          },
        },
        textPrimary: {
          color: PHARMA_NAVY,
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
          backgroundColor: PHARMA_NAVY,
          color: NEXORA_CARD,
        },
        outlined: {
          borderColor: C.border,
          color: PHARMA_TEXT,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: PHARMA_PAPER,
          border: `1px solid ${C.border}`,
          boxShadow: `0 1px 2px ${withAlpha(NEXORA_NAVY, 0.06)}`,
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
      default: NEXORA_DARK.base,
      paper: NEXORA_DARK.paper,
    },
    primary: {
      main: PHARMA_TEAL,
      dark: PHARMA_TEAL_DARK,
      light: PHARMA_TEAL_LIGHT,
      contrastText: PHARMA_NAVY_DARK,
    },
    secondary: {
      main: PHARMA_TEAL_LIGHT,
      dark: PHARMA_TEAL,
      light: NEXORA_CYAN_PALE,
      contrastText: PHARMA_NAVY_DARK,
    },
    text: {
      primary: NEXORA_GREY[50],
      secondary: NEXORA_GREY[400],
    },
    navigation: {
      ...palettes.dark.navigation,
      background: PHARMA_NAVY_DARK,
      indicator: PHARMA_TEAL,
      color: NEXORA_GREY[400],
      selectedColor: NEXORA_CARD,
      navItem: {
        hoverBackground: NEXORA_DARK.hover,
      },
      submenu: {
        background: NEXORA_DARK.submenu,
      },
    },
    status: {
      ...palettes.dark.status,
      ok: PHARMA_TEAL,
      running: PHARMA_TEAL_LIGHT,
      pending: NEXORA_GREY[500],
    },
    link: PHARMA_TEAL_LIGHT,
    linkHover: PHARMA_TEAL,
    tabbar: {
      indicator: PHARMA_TEAL,
    },
  },
  fontFamily: 'Inter, Segoe UI, system-ui, sans-serif',
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
          backgroundColor: PHARMA_TEAL,
          color: PHARMA_NAVY_DARK,
          fontWeight: 600,
          textTransform: 'none',
          '&:hover': {
            backgroundColor: PHARMA_TEAL_DARK,
          },
        },
        containedSecondary: {
          backgroundColor: PHARMA_TEAL_LIGHT,
          color: PHARMA_NAVY_DARK,
          fontWeight: 600,
          textTransform: 'none',
        },
        outlinedPrimary: {
          borderColor: PHARMA_TEAL,
          color: PHARMA_TEAL_LIGHT,
          textTransform: 'none',
          '&:hover': {
            backgroundColor: withAlpha(NEXORA_CYAN, 0.14),
          },
        },
        textPrimary: {
          color: PHARMA_TEAL_LIGHT,
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
          backgroundColor: PHARMA_TEAL,
          color: PHARMA_NAVY_DARK,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: NEXORA_DARK.paper,
          border: `1px solid ${withAlpha(NEXORA_GREY[400], 0.18)}`,
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.35)', // neutral drop shadow, not a palette colour
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
