import {
  createFrontendPlugin,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';
import TimelineIcon from '@material-ui/icons/Timeline';
import { detailRouteRef, rootRouteRef } from './routes';

const qualityPage = PageBlueprint.make({
  params: {
    path: '/quality',
    routeRef: rootRouteRef,
    title: 'Quality',
    icon: <TimelineIcon />,
    loader: () => import('./components/QualityPage').then(m => <m.QualityPage />),
  },
});

const qualityDetailPage = PageBlueprint.make({
  name: 'detail',
  params: {
    path: '/quality/:name',
    routeRef: detailRouteRef,
    loader: () =>
      import('./components/QualityDetailPage').then(m => <m.QualityDetailPage />),
  },
});

export const nexoraQualityPlugin = createFrontendPlugin({
  pluginId: 'nexora-quality',
  extensions: [qualityPage, qualityDetailPage],
  routes: {
    root: rootRouteRef,
    detail: detailRouteRef,
  },
});
