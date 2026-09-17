import {
  ApiBlueprint,
  createFrontendPlugin,
  PageBlueprint,
  discoveryApiRef,
  fetchApiRef,
} from '@backstage/frontend-plugin-api';
import StorefrontIcon from '@material-ui/icons/Storefront';
import {
  ArtifactRegistryClient,
  artifactRegistryApiRef,
} from './artifactRegistryApi';
import { EntitlementClient, entitlementApiRef } from './entitlementApi';
import { detailRouteRef, rootRouteRef } from './routes';

const artifactRegistryApi = ApiBlueprint.make({
  name: 'artifact-registry',
  params: defineParams =>
    defineParams({
      api: artifactRegistryApiRef,
      deps: {
        discoveryApi: discoveryApiRef,
        fetchApi: fetchApiRef,
      },
      factory: ({ discoveryApi, fetchApi }) =>
        new ArtifactRegistryClient({ discoveryApi, fetchApi }),
    }),
});

const entitlementApi = ApiBlueprint.make({
  name: 'entitlements',
  params: defineParams =>
    defineParams({
      api: entitlementApiRef,
      deps: {
        discoveryApi: discoveryApiRef,
        fetchApi: fetchApiRef,
      },
      factory: ({ discoveryApi, fetchApi }) =>
        new EntitlementClient({ discoveryApi, fetchApi }),
    }),
});

const marketplacePage = PageBlueprint.make({
  params: {
    path: '/marketplace',
    routeRef: rootRouteRef,
    title: 'Marketplace',
    icon: <StorefrontIcon />,
    loader: () =>
      import('./components/MarketplacePage').then(m => <m.MarketplacePage />),
  },
});

const marketplaceDetailPage = PageBlueprint.make({
  name: 'detail',
  params: {
    path: '/marketplace/:id',
    routeRef: detailRouteRef,
    loader: () =>
      import('./components/MarketplaceDetailPage').then(m => (
        <m.MarketplaceDetailPage />
      )),
  },
});

export const marketplacePlugin = createFrontendPlugin({
  pluginId: 'marketplace',
  extensions: [
    artifactRegistryApi,
    entitlementApi,
    marketplacePage,
    marketplaceDetailPage,
  ],
  routes: {
    root: rootRouteRef,
    detail: detailRouteRef,
  },
});
