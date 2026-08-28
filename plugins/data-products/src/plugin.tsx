import {
  ApiBlueprint,
  createFrontendPlugin,
  discoveryApiRef,
  fetchApiRef,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';
import StorageIcon from '@material-ui/icons/Storage';
import {
  DataProductConsumptionClient,
  dataProductConsumptionApiRef,
} from '@internal/data-product-consumption';
import { DataProductCiClient, dataProductCiApiRef } from './api';
import { detailRouteRef, rootRouteRef } from './routes';

const dataProductCiApi = ApiBlueprint.make({
  name: 'ci-status',
  params: defineParams =>
    defineParams({
      api: dataProductCiApiRef,
      deps: {
        discoveryApi: discoveryApiRef,
        fetchApi: fetchApiRef,
      },
      factory: ({ discoveryApi, fetchApi }) =>
        new DataProductCiClient({ discoveryApi, fetchApi }),
    }),
});

const dataProductConsumptionApi = ApiBlueprint.make({
  name: 'consumption',
  params: defineParams =>
    defineParams({
      api: dataProductConsumptionApiRef,
      deps: {
        discoveryApi: discoveryApiRef,
        fetchApi: fetchApiRef,
      },
      factory: ({ discoveryApi, fetchApi }) =>
        new DataProductConsumptionClient({ discoveryApi, fetchApi }),
    }),
});

const dataProductsPage = PageBlueprint.make({
  params: {
    path: '/data-products',
    routeRef: rootRouteRef,
    title: 'Data Products',
    icon: <StorageIcon />,
    loader: () =>
      import('./components/DataProductsPage').then(m => <m.DataProductsPage />),
  },
});

const dataProductDetailPage = PageBlueprint.make({
  name: 'detail',
  params: {
    path: '/data-products/:name',
    routeRef: detailRouteRef,
    loader: () =>
      import('./components/DataProductDetailPage').then(m => (
        <m.DataProductDetailPage />
      )),
  },
});

export const dataProductsPlugin = createFrontendPlugin({
  pluginId: 'data-products',
  extensions: [
    dataProductCiApi,
    dataProductConsumptionApi,
    dataProductsPage,
    dataProductDetailPage,
  ],
  routes: {
    root: rootRouteRef,
    detail: detailRouteRef,
  },
});
