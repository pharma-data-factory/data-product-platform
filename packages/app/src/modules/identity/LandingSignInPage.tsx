import { useState } from 'react';
import {
  configApiRef,
  discoveryApiRef,
  fetchApiRef,
  githubAuthApiRef,
  identityApiRef,
  useApi,
} from '@backstage/core-plugin-api';
import { UserIdentity } from '@backstage/core-components';
import { SignInPageProps } from '@backstage/plugin-app-react';
import { hasApprovedPlatformAccess } from '@internal/platform-common';
import { PublicModelCompanyPage } from '@internal/plugin-model-company';
import { ArchitecturePage } from '../architecture/ArchitecturePage';
import { DeveloperArchitecturePage } from '../architecture/DeveloperArchitecturePage';
import {
  isDeveloperArchitecturePath,
  isPublicArchitecturePath,
} from '../architecture/constants';
import { isPublicLegalPath } from '../legal/constants';
import { LegalPage } from '../legal/LegalPage';
import { AccessDeniedPage } from './AccessDeniedPage';
import {
  formatAuthError,
  githubLoginFromProfile,
  isAccessDeniedError,
  isUnapprovedGithubUserError,
  readGithubOAuthClientId,
} from './authErrors';
import { createGuestIdentity } from './guestIdentity';
import { LoginPage } from './LoginPage';
import { PublicLanding } from './PublicLanding';
import { isPublicEcosystemPath } from '../ecosystem/constants';
import { EcosystemPage } from '../ecosystem/EcosystemPage';

function isModelCompanyPath(pathname: string): boolean {
  return (
    pathname === '/model-company' || pathname.startsWith('/model-company/')
  );
}

function isPublicModelCompanyPath(pathname: string): boolean {
  return pathname === '/model-company' || pathname === '/model-company/';
}

export function LandingSignInPage(props: SignInPageProps) {
  const configApi = useApi(configApiRef);
  const discoveryApi = useApi(discoveryApiRef);
  const githubAuth = useApi(githubAuthApiRef);
  const fetchApi = useApi(fetchApiRef);
  const identityApi = useApi(identityApiRef);

  const recordSignIn = async (provider: string) => {
    try {
      const baseUrl = await discoveryApi.getBaseUrl('users');
      const { token } = await identityApi.getCredentials();
      await fetchApi.fetch(`${baseUrl}/signins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ provider }),
      });
    } catch {
      // Best-effort audit; never block sign-in on a recording failure.
    }
  };
  const [error, setError] = useState<string>();
  const [view, setView] = useState<'landing' | 'login' | 'denied'>(() =>
    isModelCompanyPath(window.location.pathname) &&
    !isPublicModelCompanyPath(window.location.pathname)
      ? 'login'
      : 'landing',
  );
  const [deniedLogin, setDeniedLogin] = useState<string>();

  const environment =
    configApi.getOptionalString('auth.environment') ?? 'development';
  const guestEnabled =
    environment !== 'production' &&
    configApi.getOptional('auth.providers.guest') !== undefined;
  const githubConfigured = Boolean(readGithubOAuthClientId(configApi));

  const returnToLanding = () => {
    setError(undefined);
    setDeniedLogin(undefined);
    setView('landing');
    if (
      isPublicArchitecturePath(window.location.pathname) ||
      isModelCompanyPath(window.location.pathname)
    ) {
      window.location.assign('/');
    }
  };

  const denyAccess = (login?: string) => {
    setDeniedLogin(login);
    setView('denied');
  };

  const onGitHubSignIn = async () => {
    try {
      setError(undefined);
      // Do not block on frontend-visible clientId. Backstage strips that
      // key unless it is marked frontend-visible, while the backend can
      // already have a working GitHub OAuth provider.
      const identityResponse = await githubAuth.getBackstageIdentity({
        instantPopup: true,
      });
      if (!identityResponse) {
        throw new Error(
          githubConfigured
            ? 'Popup closed by user. Open http://localhost:7007 (not 127.0.0.1) and allow popups, then try again.'
            : 'GitHub sign-in is not configured',
        );
      }
      const profile = await githubAuth.getProfile();
      if (
        !hasApprovedPlatformAccess(
          identityResponse.identity.ownershipEntityRefs ?? [],
        )
      ) {
        denyAccess(
          identityResponse.identity.userEntityRef.split('/').pop() ??
            githubLoginFromProfile(profile ?? undefined),
        );
        return;
      }
      props.onSignInSuccess(
        UserIdentity.create({
          identity: identityResponse.identity,
          authApi: githubAuth,
          profile: profile ?? undefined,
        }),
      );
      void recordSignIn('github');
    } catch (err) {
      if (isUnapprovedGithubUserError(err) || isAccessDeniedError(err)) {
        try {
          const profile = await githubAuth.getProfile();
          denyAccess(githubLoginFromProfile(profile ?? undefined));
        } catch {
          denyAccess();
        }
        return;
      }
      setError(formatAuthError(err));
    }
  };

  const onGuestSignIn = async () => {
    try {
      setError(undefined);
      const identity = await createGuestIdentity(discoveryApi);
      props.onSignInSuccess(identity);
      void recordSignIn('guest');
    } catch (err) {
      setError(
        err instanceof Error
          ? formatAuthError(err)
          : 'Guest sign-in is only available for local development',
      );
    }
  };

  const onDeniedSignOut = async () => {
    try {
      await githubAuth.signOut();
    } catch {
      // GitHub session may already be cleared.
    }
    returnToLanding();
  };

  if (view === 'denied') {
    return (
      <AccessDeniedPage
        githubLogin={deniedLogin}
        onSignOut={onDeniedSignOut}
        onBack={returnToLanding}
      />
    );
  }

  if (view === 'login') {
    return (
      <LoginPage
        guestEnabled={guestEnabled}
        onGitHubSignIn={onGitHubSignIn}
        onGuestSignIn={guestEnabled ? onGuestSignIn : undefined}
        onBack={returnToLanding}
        error={error}
      />
    );
  }

  const openLogin = () => {
    setError(undefined);
    setView('login');
  };

  if (isDeveloperArchitecturePath(window.location.pathname)) {
    return <DeveloperArchitecturePage standalone onSignIn={openLogin} />;
  }

  if (isPublicArchitecturePath(window.location.pathname)) {
    return <ArchitecturePage standalone onSignIn={openLogin} />;
  }

  if (isPublicLegalPath(window.location.pathname)) {
    return (
      <LegalPage
        pathname={window.location.pathname}
        standalone
        onSignIn={openLogin}
      />
    );
  }

  if (isPublicModelCompanyPath(window.location.pathname)) {
    return (
      <PublicModelCompanyPage
        publicMode
        onBack={() => window.location.assign('/')}
        onSignIn={openLogin}
      />
    );
  }

  if (isPublicEcosystemPath(window.location.pathname)) {
    return (
      <EcosystemPage
        pathname={window.location.pathname}
        onSignIn={openLogin}
      />
    );
  }

  return <PublicLanding onSignIn={openLogin} />;
}
