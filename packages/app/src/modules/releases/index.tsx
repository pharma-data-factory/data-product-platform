import NewReleasesIcon from '@material-ui/icons/NewReleases';
import {
  createFrontendModule,
  createRouteRef,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';

const releasesRouteRef = createRouteRef();
const releaseDetailRouteRef = createRouteRef();

const releasesPage = PageBlueprint.make({
  name: 'releases',
  params: {
    path: '/releases',
    routeRef: releasesRouteRef,
    title: 'Releases',
    icon: <NewReleasesIcon />,
    loader: () =>
      import('./ReleaseCatalogPage').then(m => <m.ReleaseCatalogPage />),
  },
});

const releaseDetailPage = PageBlueprint.make({
  name: 'release-detail',
  params: {
    path: '/releases/:templateId',
    routeRef: releaseDetailRouteRef,
    loader: () =>
      import('./GoldenPathReleasePage').then(m => <m.GoldenPathReleasePage />),
  },
});

export const releasesModule = createFrontendModule({
  pluginId: 'app',
  extensions: [releasesPage, releaseDetailPage],
});
