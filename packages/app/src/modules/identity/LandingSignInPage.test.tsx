import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TestApiProvider, mockApis } from '@backstage/frontend-test-utils';
import {
  configApiRef,
  discoveryApiRef,
  fetchApiRef,
  githubAuthApiRef,
  identityApiRef,
} from '@backstage/core-plugin-api';
import type {
  BackstageIdentityResponse,
  ProfileInfo,
} from '@backstage/core-plugin-api';
import type { JsonObject } from '@backstage/types';
import { MemoryRouter } from 'react-router-dom';
import {
  modelCompanyApiRef,
  type PublicModelCompanyDemo,
} from '@internal/plugin-model-company';
import { LandingSignInPage } from './LandingSignInPage';

const publicDemo = {
  overview: {
    companyName: 'Nexora Model Pharma',
    siteName: 'Model Pharma Plant',
    siteId: 'MODEL-PHARMA-01',
    simulation: 'STOPPED',
    currentScenario: '',
    connectivity: { simulation: 'STOPPED', mqtt: 'UNKNOWN', uns: 'IDLE' },
  },
  factory: { sites: [], lineCount: 0, equipmentCount: 0 },
  equipment: [],
  orders: [],
  batches: [],
  genealogy: [],
  warehouse: [],
} as unknown as PublicModelCompanyDemo;

function renderLanding(
  config: JsonObject,
  githubAuth: {
    getBackstageIdentity?: () => Promise<BackstageIdentityResponse | undefined>;
    getProfile?: () => Promise<ProfileInfo | undefined>;
    signOut?: () => Promise<void>;
  } = {},
  onSignInSuccess: () => void = () => undefined,
) {
  render(
    <MemoryRouter>
      <TestApiProvider
        apis={[
          [configApiRef, mockApis.config({ data: config })],
          [
            discoveryApiRef,
            { getBaseUrl: async () => 'http://localhost:7007/api/auth' },
          ],
          // Sign-in audit posts through fetchApi; failure is swallowed, but the
          // ref must still be present or the page throws on mount.
          [fetchApiRef, { fetch: async () => ({ ok: true }) } as never],
          [
            identityApiRef,
            {
              getCredentials: async () => ({ token: undefined }),
              getBackstageIdentity: async () => ({
                type: 'user' as const,
                userEntityRef: 'user:default/guest',
                ownershipEntityRefs: ['user:default/guest'],
              }),
              getProfileInfo: async () => ({}),
            },
          ],
          [modelCompanyApiRef, { getPublicDemo: async () => publicDemo }],
          [
            githubAuthApiRef,
            {
              getBackstageIdentity:
                githubAuth.getBackstageIdentity ??
                (async (): Promise<BackstageIdentityResponse | undefined> =>
                  undefined),
              getProfile:
                githubAuth.getProfile ??
                (async (): Promise<ProfileInfo | undefined> => undefined),
              signOut: githubAuth.signOut ?? (async () => undefined),
            },
          ],
        ]}
      >
        <LandingSignInPage onSignInSuccess={onSignInSuccess} />
      </TestApiProvider>
    </MemoryRouter>,
  );
}

describe('LandingSignInPage', () => {
  it('shows the public landing when unauthenticated', () => {
    renderLanding({
      auth: {
        environment: 'development',
        providers: {
          guest: {},
          github: { development: { clientId: 'oauth-client' } },
        },
      },
    });

    expect(screen.getAllByText('NEXORA').length).toBeGreaterThan(0);
    expect(
      screen.getByRole('heading', {
        name: /Connect systems\.\s*Build capabilities\.\s*Share solutions\./i,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Sign In').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /Build a Plugin/i }).length).toBeGreaterThan(0);
    expect(screen.queryByText('Continue as Guest')).not.toBeInTheDocument();
    expect(screen.queryByText('Continue with GitHub')).not.toBeInTheDocument();
  });

  it('opens the dedicated login experience with GitHub and Guest in development', () => {
    renderLanding({
      auth: {
        environment: 'development',
        providers: {
          guest: {},
          github: { development: { clientId: 'oauth-client' } },
        },
      },
    });

    fireEvent.click(screen.getAllByText('Sign In')[0]);

    expect(screen.getByText('Sign in to continue')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Continue with GitHub/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Development only')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Continue as Guest/i }),
    ).toBeInTheDocument();
  });

  it('shows the read-only Model Company demo to anonymous visitors', async () => {
    window.history.pushState({}, '', '/model-company');

    try {
      renderLanding({
        auth: {
          environment: 'production',
          providers: {
            github: { production: { clientId: 'oauth-client' } },
          },
        },
      });

      expect(
        await screen.findByRole('heading', { name: 'Nexora Model Pharma' }),
      ).toBeInTheDocument();
      expect(screen.getByText('NON-GXP')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Sign in for controls/i }),
      ).toBeInTheDocument();

      // Simulation control and authenticated navigation stay hidden.
      expect(screen.queryByRole('button', { name: 'Start' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument();
      expect(
        screen.queryByRole('navigation', { name: 'Model Company primary' }),
      ).not.toBeInTheDocument();
    } finally {
      window.history.pushState({}, '', '/');
    }
  });

  it('opens login for a Model Company sub-route', () => {
    window.history.pushState({}, '', '/model-company/scenarios');

    try {
      renderLanding({
        auth: {
          environment: 'development',
          providers: {
            guest: {},
            github: { development: { clientId: 'oauth-client' } },
          },
        },
      });

      expect(screen.getByText('Sign in to continue')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Continue as Guest/i }),
      ).toBeInTheDocument();
    } finally {
      window.history.pushState({}, '', '/');
    }
  });

  it('hides Guest in production even if a merged Guest provider remains', () => {
    renderLanding({
      auth: {
        environment: 'production',
        providers: {
          guest: {},
          github: { production: { clientId: 'oauth-client' } },
        },
      },
    });

    fireEvent.click(screen.getAllByText('Sign In')[0]);

    expect(
      screen.getByRole('button', { name: /Continue with GitHub/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Continue as Guest')).not.toBeInTheDocument();
  });

  it('hides Guest in production', () => {
    renderLanding({
      auth: {
        environment: 'production',
        providers: {
          github: { production: { clientId: 'oauth-client' } },
        },
      },
    });

    fireEvent.click(screen.getAllByText('Sign In')[0]);

    expect(
      screen.getByRole('button', { name: /Continue with GitHub/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Continue as Guest')).not.toBeInTheDocument();
    expect(screen.queryByText(/Development only/i)).not.toBeInTheDocument();
  });

  it('fails gracefully when GitHub OAuth is not configured', async () => {
    renderLanding({
      auth: {
        environment: 'development',
        providers: {
          guest: {},
        },
      },
    });

    fireEvent.click(screen.getAllByText('Sign In')[0]);
    fireEvent.click(screen.getByRole('button', { name: /Continue with GitHub/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/not configured/i);
    });
    expect(screen.getByRole('alert').textContent).not.toMatch(
      /CLIENT_SECRET|PRIVATE_KEY|ghp_/,
    );
  });

  it('still starts GitHub OAuth when the client ID is hidden from frontend config', async () => {
    const onSignInSuccess = jest.fn();
    renderLanding(
      {
        auth: {
          environment: 'development',
          providers: {
            guest: {},
          },
        },
      },
      {
        getBackstageIdentity: async () => ({
          token: 'session',
          identity: {
            type: 'user',
            userEntityRef: 'user:default/developer',
            ownershipEntityRefs: [
              'user:default/developer',
              'group:default/data-product-developers',
            ],
          },
        }),
        getProfile: async () => ({ displayName: 'developer' }),
      },
      onSignInSuccess,
    );

    fireEvent.click(screen.getAllByText('Sign In')[0]);
    fireEvent.click(screen.getByRole('button', { name: /Continue with GitHub/i }));

    await waitFor(() => {
      expect(onSignInSuccess).toHaveBeenCalled();
    });
  });

  it('treats an empty GitHub identity as a cancelled popup when OAuth is configured', async () => {
    renderLanding({
      auth: {
        environment: 'development',
        providers: {
          guest: {},
          github: { development: { clientId: 'oauth-client' } },
        },
      },
    });

    fireEvent.click(screen.getAllByText('Sign In')[0]);
    fireEvent.click(screen.getByRole('button', { name: /Continue with GitHub/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/cancelled/i);
    });
    expect(screen.getByRole('alert').textContent).not.toMatch(/not configured/i);
  });

  it('signs in an approved GitHub user', async () => {
    const onSignInSuccess = jest.fn();
    renderLanding(
      {
        auth: {
          environment: 'production',
          providers: {
            github: { production: { clientId: 'oauth-client' } },
          },
        },
      },
      {
        getBackstageIdentity: async () => ({
          token: 'session',
          identity: {
            type: 'user',
            userEntityRef: 'user:default/developer',
            ownershipEntityRefs: [
              'user:default/developer',
              'group:default/data-product-developers',
            ],
          },
        }),
        getProfile: async () => ({ displayName: 'Data Product Developer' }),
      },
      onSignInSuccess,
    );

    fireEvent.click(screen.getAllByText('Sign In')[0]);
    fireEvent.click(screen.getByRole('button', { name: /Continue with GitHub/i }));

    await waitFor(() => {
      expect(onSignInSuccess).toHaveBeenCalled();
    });
    expect(screen.queryByText('Access denied')).not.toBeInTheDocument();
  });

  it('shows Access Denied for an unknown GitHub user in production', async () => {
    const signOut = jest.fn(async () => undefined);
    const onSignInSuccess = jest.fn();
    renderLanding(
      {
        auth: {
          environment: 'production',
          providers: {
            github: { production: { clientId: 'oauth-client' } },
          },
        },
      },
      {
        getBackstageIdentity: async () => {
          throw new Error(
            'Failed to sign-in, unable to resolve user identity. User not found in the catalog',
          );
        },
        getProfile: async () => ({ displayName: 'new-github-user' }),
        signOut,
      },
      onSignInSuccess,
    );

    fireEvent.click(screen.getAllByText('Sign In')[0]);
    fireEvent.click(screen.getByRole('button', { name: /Continue with GitHub/i }));

    expect(await screen.findByText('Access not granted')).toBeInTheDocument();
    expect(screen.getByText('GitHub login: new-github-user')).toBeInTheDocument();
    expect(screen.getByRole('status').textContent).toMatch(
      /do not currently have access to this Nexora environment/i,
    );
    expect(onSignInSuccess).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Sign Out' }));
    await waitFor(() => {
      expect(signOut).toHaveBeenCalled();
    });
    expect(
      screen.getByRole('heading', {
        name: /Connect systems\.\s*Build capabilities\.\s*Share solutions\./i,
      }),
    ).toBeInTheDocument();
  });

  it('denies a signed-in GitHub identity that has no approved platform group', async () => {
    const onSignInSuccess = jest.fn();
    renderLanding(
      {
        auth: {
          environment: 'development',
          providers: {
            guest: {},
            github: { development: { clientId: 'oauth-client' } },
          },
        },
      },
      {
        getBackstageIdentity: async () => ({
          token: 'session',
          identity: {
            type: 'user',
            userEntityRef: 'user:default/new-github-user',
            ownershipEntityRefs: ['user:default/new-github-user'],
          },
        }),
        getProfile: async () => ({ displayName: 'new-github-user' }),
      },
      onSignInSuccess,
    );

    fireEvent.click(screen.getAllByText('Sign In')[0]);
    fireEvent.click(screen.getByRole('button', { name: /Continue with GitHub/i }));

    expect(await screen.findByText('Access not granted')).toBeInTheDocument();
    expect(onSignInSuccess).not.toHaveBeenCalled();
  });

  it('opens the architecture page on the public architecture route', () => {
    window.history.pushState({}, '', '/platform/architecture');

    try {
      renderLanding({
        auth: {
          environment: 'production',
          providers: {
            github: { production: { clientId: 'oauth-client' } },
          },
        },
      });

    expect(
      screen.getByText(
        /Keep Core Systems Standard\.\s*Innovate Through Data Products\./i,
      ),
    ).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'From core systems to Data Products' }),
      ).toBeInTheDocument();
      expect(
        screen.queryByText(
          /open, extensible manufacturing platform/i,
        ),
      ).not.toBeInTheDocument();
    } finally {
      window.history.pushState({}, '', '/');
    }
  });

  it('opens the developer architecture page on the developer architecture route', () => {
    window.history.pushState({}, '', '/platform/architecture/developer');

    try {
      renderLanding({
        auth: {
          environment: 'production',
          providers: {
            github: { production: { clientId: 'oauth-client' } },
          },
        },
      });

      expect(
        screen.getByRole('heading', {
          name: 'How a developer builds a Data Product.',
        }),
      ).toBeInTheDocument();
      expect(screen.getByText('composition manifest')).toBeInTheDocument();
      expect(
        screen.queryByText(
          /open, extensible manufacturing platform/i,
        ),
      ).not.toBeInTheDocument();
    } finally {
      window.history.pushState({}, '', '/');
    }
  });

  it('opens the academy page on the public academy route', () => {
    window.history.pushState({}, '', '/academy');

    try {
      renderLanding({
        auth: {
          environment: 'production',
          providers: {
            github: { production: { clientId: 'oauth-client' } },
          },
        },
      });

      expect(screen.getByLabelText('Nexora Academy')).toBeInTheDocument();
      expect(
        screen.queryByText(/open, extensible manufacturing platform/i),
      ).not.toBeInTheDocument();
    } finally {
      window.history.pushState({}, '', '/');
    }
  });

  it('opens a solution page on the public solutions route', () => {
    window.history.pushState({}, '', '/solutions/life-sciences');

    try {
      renderLanding({
        auth: {
          environment: 'production',
          providers: {
            github: { production: { clientId: 'oauth-client' } },
          },
        },
      });

      expect(
        screen.getByRole('heading', { name: 'Life Sciences' }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText('The Nexora platform')).toBeInTheDocument();
    } finally {
      window.history.pushState({}, '', '/');
    }
  });
});
