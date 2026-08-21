import HomeIcon from '@material-ui/icons/Home';
import {
  createFrontendModule,
  createRouteRef,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';

const homeRouteRef = createRouteRef();

const homePage = PageBlueprint.make({
  name: 'home',
  params: {
    path: '/',
    routeRef: homeRouteRef,
    title: 'Home',
    icon: <HomeIcon />,
    loader: () => import('./HomePage').then(m => <m.HomePage />),
  },
});

export const homeModule = createFrontendModule({
  pluginId: 'app',
  extensions: [homePage],
});
