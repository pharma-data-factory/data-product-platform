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
  pageTheme: {
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
  },
  components: {
    MuiButton: {
      styleOverrides: {
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
        },
        outlinedPrimary: {
          borderColor: PHARMA_NAVY,
          color: PHARMA_NAVY,
          textTransform: 'none',
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
