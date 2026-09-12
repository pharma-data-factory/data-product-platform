import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TestApiProvider } from '@backstage/frontend-test-utils';
import {
  appThemeApiRef,
  identityApiRef,
  type AppTheme,
  type AppThemeApi,
  type BackstageUserIdentity,
  type ProfileInfo,
} from '@backstage/core-plugin-api';
import { UserProfileMenu } from './UserProfileMenu';
import { signOutToLanding } from '../identity/session';

jest.mock('../identity/session', () => ({
  signOutToLanding: jest.fn(async () => undefined),
}));

jest.mock('@backstage/core-components', () => {
  const actual = jest.requireActual('@backstage/core-components');
  return {
    ...actual,
    useSidebarOpenState: () => ({ isOpen: true, setOpen: () => undefined }),
  };
});

const INSTALLED_THEMES: AppTheme[] = [
  { id: 'nexora-light', title: 'Light', variant: 'light', Provider: () => null },
  { id: 'nexora-dark', title: 'Dark', variant: 'dark', Provider: () => null },
];

function createThemeApi() {
  const setActiveThemeId = jest.fn();
  const api = {
    getInstalledThemes: () => INSTALLED_THEMES,
    getActiveThemeId: () => 'nexora-light',
    setActiveThemeId,
    activeThemeId$: () => ({
      subscribe: () => ({ unsubscribe: () => undefined }),
    }),
  } as unknown as AppThemeApi;
  return { api, setActiveThemeId };
}

async function renderMenu(
  identity: {
    getBackstageIdentity: () => Promise<BackstageUserIdentity>;
    getProfileInfo: () => Promise<ProfileInfo>;
    signOut: () => Promise<void>;
  },
  themeApi = createThemeApi(),
) {
  await act(async () => {
    render(
      <MemoryRouter>
        <TestApiProvider
          apis={[
            [identityApiRef, identity],
            [appThemeApiRef, themeApi.api],
          ]}
        >
          <UserProfileMenu />
        </TestApiProvider>
      </MemoryRouter>,
    );
  });
  return themeApi;
}

describe('UserProfileMenu', () => {
  const identity = {
    getBackstageIdentity: async () => ({
      type: 'user' as const,
      userEntityRef: 'user:default/schmeckm',
      ownershipEntityRefs: [
        'user:default/schmeckm',
        'group:default/platform-admins',
      ],
    }),
    getProfileInfo: async () => ({
      displayName: 'Markus',
      picture: 'https://example.com/avatar.png',
    }),
    signOut: async () => undefined,
  };

  it('shows a Sign Out button in the sidebar', async () => {
    await renderMenu(identity);

    expect(screen.getByText('Markus')).toBeInTheDocument();
    expect(screen.getByLabelText('Sign Out')).toBeInTheDocument();
  });

  it('signs out from the sidebar without opening the user menu', async () => {
    await renderMenu(identity);

    fireEvent.click(screen.getByLabelText('Sign Out'));

    await waitFor(() => {
      expect(signOutToLanding).toHaveBeenCalled();
    });
    expect(screen.queryByText('Display Name')).not.toBeInTheDocument();
  });

  it('shows display name, GitHub login, entity, role, and groups', async () => {
    await renderMenu(identity);

    expect(screen.getByText('Markus')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Open user menu'));

    expect(screen.getByText('Display Name')).toBeInTheDocument();
    expect(screen.getByText('schmeckm')).toBeInTheDocument();
    expect(screen.getByText('user:default/schmeckm')).toBeInTheDocument();
    expect(screen.getByText('Effective role')).toBeInTheDocument();
    expect(screen.getAllByText('Platform Admin').length).toBeGreaterThan(0);
    expect(screen.getByText('platform-admins')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Sign Out').length).toBeGreaterThan(0);
  });

  it('switches between light and dark from the user menu', async () => {
    const themeApi = await renderMenu(identity);

    fireEvent.click(screen.getByLabelText('Open user menu'));

    expect(screen.getByText('Appearance')).toBeInTheDocument();
    expect(screen.getByLabelText('Open appearance settings')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Dark' }));

    expect(themeApi.setActiveThemeId).toHaveBeenCalledWith('nexora-dark');
  });

  it('hides the theme switch when no theme is installed', async () => {
    const themeApi = createThemeApi();
    themeApi.api = {
      ...themeApi.api,
      getInstalledThemes: () => [],
    } as AppThemeApi;

    await renderMenu(identity, themeApi);
    fireEvent.click(screen.getByLabelText('Open user menu'));

    expect(screen.queryByText('Appearance')).not.toBeInTheDocument();
  });
});
