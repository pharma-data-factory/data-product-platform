import type { ReactElement, ReactNode } from 'react';
import {
  render,
  type RenderOptions,
  type RenderResult,
} from '@testing-library/react';
import { TestApiProvider } from '@backstage/frontend-test-utils';
import {
  appThemeApiRef,
  type AppTheme,
  type AppThemeApi,
} from '@backstage/core-plugin-api';

const INSTALLED_THEMES: AppTheme[] = [
  { id: 'nexora-light', title: 'Light', variant: 'light', Provider: () => null },
  { id: 'nexora-dark', title: 'Dark', variant: 'dark', Provider: () => null },
];

/** Minimal AppThemeApi so LandingNav appearance controls render in unit tests. */
export function createLandingThemeApi(activeId = 'nexora-light') {
  let currentId = activeId;
  const listeners = new Set<(id: string | undefined) => void>();
  const setActiveThemeId = jest.fn((id: string) => {
    currentId = id;
    listeners.forEach(listener => listener(id));
  });
  const api = {
    getInstalledThemes: () => INSTALLED_THEMES,
    getActiveThemeId: () => currentId,
    setActiveThemeId,
    activeThemeId$: () => ({
      subscribe: (listener: (id: string | undefined) => void) => {
        listeners.add(listener);
        return { unsubscribe: () => listeners.delete(listener) };
      },
    }),
  } as unknown as AppThemeApi;
  return { api, setActiveThemeId };
}

export function LandingApiProvider({
  children,
  themeId = 'nexora-light',
}: {
  children: ReactNode;
  themeId?: string;
}) {
  const themeApi = createLandingThemeApi(themeId);
  return (
    <TestApiProvider apis={[[appThemeApiRef, themeApi.api]]}>
      {children}
    </TestApiProvider>
  );
}

export function renderLanding(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { themeId?: string },
): RenderResult & { themeApi: ReturnType<typeof createLandingThemeApi> } {
  const { themeId, ...renderOptions } = options ?? {};
  const themeApi = createLandingThemeApi(themeId);
  const result = render(
    <TestApiProvider apis={[[appThemeApiRef, themeApi.api]]}>{ui}</TestApiProvider>,
    renderOptions,
  );
  return { ...result, themeApi };
}
