import { useEffect, useMemo, useState } from 'react';
import {
  Content,
  Header,
  Page,
  Progress,
} from '@backstage/core-components';
import { identityApiRef, useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import {
  PlatformRole,
  createMvpPlatformContext,
  formatJourneyError,
  isAtLeast,
  isUnauthorizedError,
} from '@internal/platform-common';
import {
  DataProduct,
  JourneyState,
  toRelatedDataProducts,
} from '@internal/plugin-data-products';
import { AccessDeniedPage } from '../identity/AccessDeniedPage';
import { signOutToLanding } from '../identity/session';
import { HomeDashboard } from './HomeDashboard';

const RECENT_KEY = 'pharma-data-factory.recent-products';

export function HomePage() {
  const catalogApi = useApi(catalogApiRef);
  const identityApi = useApi(identityApiRef);
  const [role, setRole] = useState<PlatformRole>('VIEWER');
  const [displayName, setDisplayName] = useState<string>();
  const [picture, setPicture] = useState<string>();
  const [githubLogin, setGithubLogin] = useState<string>();
  const [denied, setDenied] = useState(false);
  const [ownership, setOwnership] = useState<string[]>([]);
  const [products, setProducts] = useState<DataProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    let active = true;
    identityApi
      .getBackstageIdentity()
      .then(async identity => {
        const profile = await identityApi.getProfileInfo();
        const runtime = createMvpPlatformContext({
          userEntityRef: identity.userEntityRef,
          ownershipEntityRefs: identity.ownershipEntityRefs,
          displayName: profile.displayName,
        });
        if (!active) {
          return;
        }
        setRole(runtime.identity.platformRole);
        setOwnership([...runtime.identity.ownershipEntityRefs]);
        setDisplayName(runtime.identity.displayName ?? identity.userEntityRef);
        setPicture(profile.picture);
        setGithubLogin(runtime.identity.githubLogin);
        if (!runtime.identity.hasPlatformAccess) {
          setDenied(true);
          setLoading(false);
          return;
        }
        const catalog = await catalogApi.getEntities({
          filter: { kind: ['Component', 'API'] },
        });
        if (!active) {
          return;
        }
        setProducts(toRelatedDataProducts(catalog.items));
        setLoading(false);
      })
      .catch(err => {
        if (active) {
        setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [catalogApi, identityApi]);

  const visible = useMemo(() => {
    if (isAtLeast(role, 'PLATFORM_ADMIN')) {
      return products;
    }
    return products.filter(product =>
      ownership.some(
        ref =>
          ref === product.owner ||
          product.owner.endsWith(`/${ref.split('/').pop()}`),
      ),
    );
  }, [ownership, products, role]);

  const recentlyUsed = useMemo(() => {
    const names = readRecent();
    return names
      .map(name => products.find(product => product.name === name))
      .filter((product): product is DataProduct => Boolean(product));
  }, [products]);

  if (denied) {
    return (
      <AccessDeniedPage
        githubLogin={githubLogin}
        onSignOut={() => signOutToLanding(identityApi)}
        onBack={() => signOutToLanding(identityApi)}
      />
    );
  }

  return (
    <Page themeId="home">
      <Header
        title="Pharma Data Factory"
        subtitle="DATA PRODUCTS. BUILT FOR PHARMA."
      />
      <Content>
        {loading && <Progress />}
        {error && (
          <JourneyState
            title={isUnauthorizedError(error) ? 'Unauthorized' : 'Unable to load Home'}
            message={formatJourneyError(error)}
          />
        )}
        {!loading && !error && (
          <HomeDashboard
            platformRole={role}
            displayName={displayName}
            picture={picture}
            githubLogin={githubLogin}
            products={visible}
            recentlyUsed={recentlyUsed}
          />
        )}
      </Content>
    </Page>
  );
}

function readRecent(): string[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}
