import {
  createFrontendModule,
  createRouteRef,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';

const architectureRouteRef = createRouteRef();
const developerArchitectureRouteRef = createRouteRef();

const architecturePage = PageBlueprint.make({
  name: 'architecture',
  params: {
    path: '/platform/architecture',
    routeRef: architectureRouteRef,
    title: 'Architecture',
    loader: () =>
      import('./ArchitecturePage').then(m => <m.ArchitecturePage />),
  },
});

const developerArchitecturePage = PageBlueprint.make({
  name: 'architecture-developer',
  params: {
    path: '/platform/architecture/developer',
    routeRef: developerArchitectureRouteRef,
    title: 'Developer architecture',
    loader: () =>
      import('./DeveloperArchitecturePage').then(m => (
        <m.DeveloperArchitecturePage />
      )),
  },
});

export const architectureModule = createFrontendModule({
  pluginId: 'app',
  extensions: [architecturePage, developerArchitecturePage],
});
