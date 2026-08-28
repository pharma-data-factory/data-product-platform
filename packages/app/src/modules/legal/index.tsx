import {
  createFrontendModule,
  createRouteRef,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';
import { AppRootWrapperBlueprint } from '@backstage/plugin-app-react';
import { LandingI18nProvider } from '../identity/landingI18n';
import { LEGAL_PATHS } from './constants';
import { CookieConsentBanner } from './CookieConsentBanner';

const legalRouteRef = createRouteRef();
const privacyRouteRef = createRouteRef();
const termsRouteRef = createRouteRef();
const openSourceRouteRef = createRouteRef();

const cookieConsentWrapper = AppRootWrapperBlueprint.make({
  name: 'cookie-consent',
  params: {
    component: ({ children }) => (
      <LandingI18nProvider>
        {children}
        <CookieConsentBanner />
      </LandingI18nProvider>
    ),
  },
});

export const legalModule = createFrontendModule({
  pluginId: 'app',
  extensions: [
    cookieConsentWrapper,
    PageBlueprint.make({
      name: 'legal',
      params: {
        path: LEGAL_PATHS.legal,
        routeRef: legalRouteRef,
        title: 'Legal Notice',
        loader: () =>
          import('./LegalPage').then(m => (
            <m.LegalPage pathname={LEGAL_PATHS.legal} />
          )),
      },
    }),
    PageBlueprint.make({
      name: 'privacy',
      params: {
        path: LEGAL_PATHS.privacy,
        routeRef: privacyRouteRef,
        title: 'Privacy Policy',
        loader: () =>
          import('./LegalPage').then(m => (
            <m.LegalPage pathname={LEGAL_PATHS.privacy} />
          )),
      },
    }),
    PageBlueprint.make({
      name: 'terms',
      params: {
        path: LEGAL_PATHS.terms,
        routeRef: termsRouteRef,
        title: 'Terms',
        loader: () =>
          import('./LegalPage').then(m => (
            <m.LegalPage pathname={LEGAL_PATHS.terms} />
          )),
      },
    }),
    PageBlueprint.make({
      name: 'open-source',
      params: {
        path: LEGAL_PATHS.openSource,
        routeRef: openSourceRouteRef,
        title: 'Open source',
        loader: () =>
          import('./LegalPage').then(m => (
            <m.LegalPage pathname={LEGAL_PATHS.openSource} />
          )),
      },
    }),
  ],
});
