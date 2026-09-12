import {
  ApiBlueprint,
  createFrontendPlugin,
  discoveryApiRef,
  fetchApiRef,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';
import DescriptionIcon from '@material-ui/icons/Description';
import { URSComposerApi, ursComposerApiRef } from './api/ursComposerApi';
import {
  createRouteRef_,
  editRouteRef,
  libraryRouteRef,
  requirementSetRouteRef,
  rootRouteRef,
  capabilitiesRouteRef,
  businessRolesRouteRef,
  changeSetRouteRef,
  changeRequestsRouteRef,
  createChangeRequestRouteRef,
  changeRequestDetailRouteRef,
  portfolioRouteRef,
} from './routes';

const ursComposerApi = ApiBlueprint.make({
  name: 'service',
  params: defineParams =>
    defineParams({
      api: ursComposerApiRef,
      deps: {
        discoveryApi: discoveryApiRef,
        fetchApi: fetchApiRef,
      },
      factory: ({ discoveryApi, fetchApi }) =>
        new URSComposerApi({ discoveryApi, fetchApi }),
    }),
});

const overviewPage = PageBlueprint.make({
  params: {
    path: '/urs-composer',
    routeRef: rootRouteRef,
    title: 'URS Composer',
    icon: <DescriptionIcon />,
    loader: () =>
      import('./pages/URSComposerPage').then(m => <m.URSComposerPage />),
  },
});

const libraryPage = PageBlueprint.make({
  name: 'library',
  params: {
    path: '/urs-composer/library',
    routeRef: libraryRouteRef,
    loader: () =>
      import('./pages/URSLibraryPage').then(m => <m.URSLibraryPage />),
  },
});

const createPage = PageBlueprint.make({
  name: 'create',
  params: {
    path: '/urs-composer/new',
    routeRef: createRouteRef_,
    loader: () =>
      import('./pages/CreateURSWizardPage').then(m => <m.CreateURSWizardPage />),
  },
});

const capabilitiesPage = PageBlueprint.make({
  name: 'capabilities',
  params: {
    path: '/urs-composer/capabilities',
    routeRef: capabilitiesRouteRef,
    title: 'Business Capabilities',
    loader: () =>
      import('./pages/BusinessCapabilitiesPage').then(
        m => <m.BusinessCapabilitiesPage />,
      ),
  },
});

const businessRolesPage = PageBlueprint.make({
  name: 'business-roles',
  params: {
    path: '/urs-composer/business-roles',
    routeRef: businessRolesRouteRef,
    title: 'Business Roles',
    loader: () =>
      import('./pages/BusinessRolesPage').then(m => <m.BusinessRolesPage />),
  },
});

const changeRequestsPage = PageBlueprint.make({
  name: 'change-requests',
  params: {
    path: '/urs-composer/change-requests',
    routeRef: changeRequestsRouteRef,
    title: 'Change Requests',
    loader: () =>
      import('./pages/ChangeRequestListPage').then(
        m => <m.ChangeRequestListPage />,
      ),
  },
});

const createChangeRequestPage = PageBlueprint.make({
  name: 'create-change-request',
  params: {
    path: '/urs-composer/change-requests/new',
    routeRef: createChangeRequestRouteRef,
    loader: () =>
      import('./pages/CreateChangeRequestPage').then(
        m => <m.CreateChangeRequestPage />,
      ),
  },
});

const changeRequestDetailPage = PageBlueprint.make({
  name: 'change-request-detail',
  params: {
    path: '/urs-composer/change-requests/:id',
    routeRef: changeRequestDetailRouteRef,
    loader: () =>
      import('./pages/ChangeRequestDetailPage').then(
        m => <m.ChangeRequestDetailPage />,
      ),
  },
});

const portfolioPage = PageBlueprint.make({
  name: 'portfolio',
  params: {
    path: '/urs-composer/portfolio',
    routeRef: portfolioRouteRef,
    title: 'Portfolio Coverage',
    loader: () =>
      import('./pages/PortfolioCoveragePage').then(
        m => <m.PortfolioCoveragePage />,
      ),
  },
});

const editPage = PageBlueprint.make({
  name: 'edit',
  params: {
    path: '/urs-composer/:id/edit',
    routeRef: editRouteRef,
    loader: () =>
      import('./pages/CreateURSWizardPage').then(m => <m.EditURSWizardPage />),
  },
});

const changeSetPage = PageBlueprint.make({
  name: 'change-set',
  params: {
    path: '/urs-composer/baselines/:id/changes',
    routeRef: changeSetRouteRef,
    loader: () =>
      import('./pages/ChangeSetPage').then(m => <m.ChangeSetPage />),
  },
});

const detailPage = PageBlueprint.make({
  name: 'detail',
  params: {
    path: '/urs-composer/:id',
    routeRef: requirementSetRouteRef,
    loader: () =>
      import('./pages/URSRequirementSetPage').then(m => <m.URSRequirementSetPage />),
  },
});

export const ursComposerPlugin = createFrontendPlugin({
  pluginId: 'urs-composer',
  extensions: [
    ursComposerApi,
    overviewPage,
    libraryPage,
    createPage,
    capabilitiesPage,
    businessRolesPage,
    changeRequestsPage,
    createChangeRequestPage,
    changeRequestDetailPage,
    portfolioPage,
    editPage,
    changeSetPage,
    detailPage,
  ],
  routes: {
    root: rootRouteRef,
    library: libraryRouteRef,
    create: createRouteRef_,
    capabilities: capabilitiesRouteRef,
    businessRoles: businessRolesRouteRef,
    changeRequests: changeRequestsRouteRef,
    createChangeRequest: createChangeRequestRouteRef,
    changeRequestDetail: changeRequestDetailRouteRef,
    portfolio: portfolioRouteRef,
    edit: editRouteRef,
    changeSet: changeSetRouteRef,
    requirementSet: requirementSetRouteRef,
  },
});
