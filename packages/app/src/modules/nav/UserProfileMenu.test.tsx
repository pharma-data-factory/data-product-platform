import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TestApiProvider } from '@backstage/frontend-test-utils';
import {
  identityApiRef,
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

async function renderMenu(
  identity: {
    getBackstageIdentity: () => Promise<BackstageUserIdentity>;
    getProfileInfo: () => Promise<ProfileInfo>;
    signOut: () => Promise<void>;
  },
) {
  await act(async () => {
    render(
      <MemoryRouter>
        <TestApiProvider
          apis={[[identityApiRef, identity]]}
        >
          <UserProfileMenu />
        </TestApiProvider>
      </MemoryRouter>,
    );
  });
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
});
