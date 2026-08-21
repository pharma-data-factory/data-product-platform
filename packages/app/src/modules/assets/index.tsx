import DeviceHubIcon from '@material-ui/icons/DeviceHub';
import {
  createFrontendModule,
  createRouteRef,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';

const assetsRouteRef = createRouteRef();
const assetDetailRouteRef = createRouteRef();
const propertyDetailRouteRef = createRouteRef();

const assetsPage = PageBlueprint.make({
  name: 'assets',
  params: {
    path: '/assets',
    routeRef: assetsRouteRef,
    title: 'Assets & Sensors',
    icon: <DeviceHubIcon />,
    loader: () => import('./AssetsPage').then(m => <m.AssetsPage />),
  },
});

const assetDetailPage = PageBlueprint.make({
  name: 'asset-detail',
  params: {
    path: '/assets/:assetId',
    routeRef: assetDetailRouteRef,
    loader: () => import('./AssetDetailPage').then(m => <m.AssetDetailPage />),
  },
});

const propertyDetailPage = PageBlueprint.make({
  name: 'asset-property-detail',
  params: {
    path: '/assets/:assetId/properties/:propertyId',
    routeRef: propertyDetailRouteRef,
    loader: () =>
      import('./PropertyDetailPage').then(m => <m.PropertyDetailPage />),
  },
});

export const assetsModule = createFrontendModule({
  pluginId: 'app',
  extensions: [assetsPage, assetDetailPage, propertyDetailPage],
});
