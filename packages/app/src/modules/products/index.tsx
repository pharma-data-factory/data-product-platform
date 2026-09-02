import DeviceHubIcon from '@material-ui/icons/DeviceHub';
import {
  createFrontendModule,
  createRouteRef,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';

const productsRouteRef = createRouteRef();
const productDetailRouteRef = createRouteRef();

const productsPage = PageBlueprint.make({
  name: 'products',
  params: {
    path: '/products',
    routeRef: productsRouteRef,
    title: 'Products',
    icon: <DeviceHubIcon />,
    loader: () => import('./ProductsPage').then(m => <m.ProductsPage />),
  },
});

const productDetailPage = PageBlueprint.make({
  name: 'product-detail',
  params: {
    path: '/products/:productId',
    routeRef: productDetailRouteRef,
    loader: () =>
      import('./ProductDetailPage').then(m => <m.ProductDetailPage />),
  },
});

export const productsModule = createFrontendModule({
  pluginId: 'app',
  extensions: [productsPage, productDetailPage],
});
