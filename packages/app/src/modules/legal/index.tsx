import {
  createFrontendModule,
  createRouteRef,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';
import { LEGAL_PATHS } from './constants';

const legalRouteRef = createRouteRef();
const privacyRouteRef = createRouteRef();
const termsRouteRef = createRouteRef();
const openSourceRouteRef = createRouteRef();

export const legalModule = createFrontendModule({
  pluginId: 'app',
  extensions: [
    PageBlueprint.make({
      name: 'legal',
      params: {
        path: LEGAL_PATHS.legal,
        routeRef: legalRouteRef,
        title: 'Legal',
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
        title: 'Privacy',
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
