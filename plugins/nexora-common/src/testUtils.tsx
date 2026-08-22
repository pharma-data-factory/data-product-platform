import type { ReactNode } from 'react';
import { UnifiedThemeProvider, themes } from '@backstage/theme';

export function IndustrialTestRoot({ children }: { children: ReactNode }) {
  return (
    <UnifiedThemeProvider theme={themes.light}>{children}</UnifiedThemeProvider>
  );
}
