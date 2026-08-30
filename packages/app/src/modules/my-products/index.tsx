import FolderOpenIcon from '@material-ui/icons/FolderOpen';
import {
  createFrontendModule,
  createRouteRef,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';

const myProductsRouteRef = createRouteRef();

const myProductsPage = PageBlueprint.make({
  name: 'my-products',
  params: {
    path: '/my-products',
    routeRef: myProductsRouteRef,
    title: 'My Products',
    icon: <FolderOpenIcon />,
    loader: () =>
      import('./MyProductsLandingPage').then(m => <m.MyProductsLandingPage />),
  },
});

export const myProductsModule = createFrontendModule({
  pluginId: 'app',
  extensions: [myProductsPage],
});
