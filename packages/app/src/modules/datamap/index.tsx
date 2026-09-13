import AccountTreeIcon from '@material-ui/icons/AccountTree';
import {
  createFrontendModule,
  createRouteRef,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';

const dataMapRouteRef = createRouteRef();

const dataMapPage = PageBlueprint.make({
  name: 'data-map',
  params: {
    path: '/data-map',
    routeRef: dataMapRouteRef,
    title: 'Data Map',
    icon: <AccountTreeIcon />,
    loader: () => import('./DataMapPage').then(m => <m.DataMapPage />),
  },
});

export const dataMapModule = createFrontendModule({
  pluginId: 'app',
  extensions: [dataMapPage],
});
