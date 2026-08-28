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
    options: { fontColor: '#FFFFFF' },
  }),
  app: genPageTheme({
    colors: [PHARMA_NAVY, '#1E3A5F'],
    shape: shapes.wave,
    options: { fontColor: '#FFFFFF' },
  }),
  documentation: genPageTheme({
    colors: [PHARMA_NAVY, PHARMA_TEAL],
    shape: shapes.round,
    options: { fontColor: '#FFFFFF' },
  }),
  tool: genPageTheme({
    colors: [PHARMA_NAVY, '#1E3A5F'],
    shape: shapes.wave,
    options: { fontColor: '#FFFFFF' },
  }),
  service: genPageTheme({
    colors: [PHARMA_NAVY, PHARMA_TEAL],
    shape: shapes.wave,
    options: { fontColor: '#FFFFFF' },
  }),
  website: genPageTheme({
    colors: [PHARMA_NAVY, PHARMA_TEAL],
    shape: shapes.wave,
    options: { fontColor: '#FFFFFF' },
  }),
  library: genPageTheme({
    colors: ['#1E3A5F', PHARMA_TEAL],
    shape: shapes.round,
    options: { fontColor: '#FFFFFF' },
  }),
  other: genPageTheme({
    colors: [PHARMA_NAVY, '#1E3A5F'],
    shape: shapes.wave,
    options: { fontColor: '#FFFFFF' },
  }),
  apis: genPageTheme({
    colors: [PHARMA_NAVY, PHARMA_TEAL],
    shape: shapes.wave,
    options: { fontColor: '#FFFFFF' },
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
      light: '#1E3A5F',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: PHARMA_TEAL,
      dark: PHARMA_TEAL_DARK,
      light: PHARMA_TEAL_LIGHT,
      contrastText: '#FFFFFF',
    },
    text: {
      primary: PHARMA_TEXT,
      secondary: C.muted,
    },
    navigation: {
      ...palettes.light.navigation,
      background: PHARMA_NAVY,
      indicator: PHARMA_TEAL,
      color: '#C5D0DC',
      selectedColor: '#FFFFFF',
      navItem: {
        hoverBackground: '#163154',
      },
      submenu: {
        background: PHARMA_NAVY_DARK,
      },
    },
    status: {
      ...palettes.light.status,
      ok: PHARMA_TEAL,
      running: '#1E3A5F',
      pending: '#64748B',
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
          color: '#FFFFFF',
          fontWeight: 600,
          textTransform: 'none',
          '&:hover': {
            backgroundColor: PHARMA_NAVY_DARK,
          },
        },
        containedSecondary: {
          backgroundColor: PHARMA_TEAL,
          color: '#FFFFFF',
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
            backgroundColor: 'rgba(0, 194, 217, 0.08)',
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
          color: '#FFFFFF',
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
          boxShadow: '0 1px 2px rgba(11, 31, 58, 0.06)',
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
      default: '#071521',
      paper: '#0B1F3A',
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
      light: '#A5F3FC',
      contrastText: PHARMA_NAVY_DARK,
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#94A3B8',
    },
    navigation: {
      ...palettes.dark.navigation,
      background: PHARMA_NAVY_DARK,
      indicator: PHARMA_TEAL,
      color: '#94A3B8',
      selectedColor: '#FFFFFF',
      navItem: {
        hoverBackground: '#0F2744',
      },
      submenu: {
        background: '#030B14',
      },
    },
    status: {
      ...palettes.dark.status,
      ok: PHARMA_TEAL,
      running: PHARMA_TEAL_LIGHT,
      pending: '#64748B',
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
            backgroundColor: 'rgba(0, 194, 217, 0.14)',
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
          backgroundColor: '#0B1F3A',
          border: '1px solid rgba(148, 163, 184, 0.18)',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.35)',
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
