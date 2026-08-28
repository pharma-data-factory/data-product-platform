import {
  ApiBlueprint,
  createFrontendPlugin,
  discoveryApiRef,
  fetchApiRef,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';
import BusinessIcon from '@material-ui/icons/Business';
import { ModelCompanyClient, modelCompanyApiRef } from './api';
import {
  architectureRouteRef,
  batchesRouteRef,
  campaignRouteRef,
  dataProductsRouteRef,
  equipmentRouteRef,
  eventsRouteRef,
  factoryRouteRef,
  genealogyRouteRef,
  linesRouteRef,
  materialFlowRouteRef,
  ordersRouteRef,
  rootRouteRef,
  scenariosRouteRef,
  unsRouteRef,
  warehouseRouteRef,
} from './routes';

const modelCompanyApi = ApiBlueprint.make({
  name: 'service',
  params: defineParams =>
    defineParams({
      api: modelCompanyApiRef,
      deps: {
        discoveryApi: discoveryApiRef,
        fetchApi: fetchApiRef,
      },
      factory: ({ discoveryApi, fetchApi }) =>
        new ModelCompanyClient({ discoveryApi, fetchApi }),
    }),
});

const overviewPage = PageBlueprint.make({
  params: {
    path: '/model-company',
    routeRef: rootRouteRef,
    title: 'Model Company',
    icon: <BusinessIcon />,
    loader: () =>
      import('./components/OverviewPage').then(m => <m.OverviewPage />),
  },
});

const unsPage = PageBlueprint.make({
  name: 'uns',
  params: {
    path: '/model-company/uns',
    routeRef: unsRouteRef,
    loader: () =>
      import('./components/UnsExplorerPage').then(m => <m.UnsExplorerPage />),
  },
});

const factoryPage = PageBlueprint.make({
  name: 'factory',
  params: {
    path: '/model-company/factory',
    routeRef: factoryRouteRef,
    loader: () =>
      import('./components/FactoryViewPage').then(m => <m.FactoryViewPage />),
  },
});

const linesPage = PageBlueprint.make({
  name: 'lines',
  params: {
    path: '/model-company/lines',
    routeRef: linesRouteRef,
    loader: () => import('./components/LinesPage').then(m => <m.LinesPage />),
  },
});

const equipmentPage = PageBlueprint.make({
  name: 'equipment',
  params: {
    path: '/model-company/equipment',
    routeRef: equipmentRouteRef,
    loader: () =>
      import('./components/EquipmentPage').then(m => <m.EquipmentPage />),
  },
});

const ordersPage = PageBlueprint.make({
  name: 'orders',
  params: {
    path: '/model-company/orders',
    routeRef: ordersRouteRef,
    loader: () => import('./components/Pages').then(m => <m.OrdersPage />),
  },
});

const batchesPage = PageBlueprint.make({
  name: 'batches',
  params: {
    path: '/model-company/batches',
    routeRef: batchesRouteRef,
    loader: () =>
      import('./components/BatchesPage').then(m => <m.BatchesPage />),
  },
});

const genealogyPage = PageBlueprint.make({
  name: 'genealogy',
  params: {
    path: '/model-company/genealogy',
    routeRef: genealogyRouteRef,
    loader: () => import('./components/Pages').then(m => <m.GenealogyPage />),
  },
});

const materialFlowPage = PageBlueprint.make({
  name: 'material-flow',
  params: {
    path: '/model-company/material-flow',
    routeRef: materialFlowRouteRef,
    loader: () =>
      import('./components/MaterialFlowPage').then(m => <m.MaterialFlowPage />),
  },
});

const campaignPage = PageBlueprint.make({
  name: 'campaign',
  params: {
    path: '/model-company/campaign',
    routeRef: campaignRouteRef,
    loader: () => import('./components/Pages').then(m => <m.CampaignPage />),
  },
});

const warehousePage = PageBlueprint.make({
  name: 'warehouse',
  params: {
    path: '/model-company/warehouse',
    routeRef: warehouseRouteRef,
    loader: () => import('./components/Pages').then(m => <m.WarehousePage />),
  },
});

const scenariosPage = PageBlueprint.make({
  name: 'scenarios',
  params: {
    path: '/model-company/scenarios',
    routeRef: scenariosRouteRef,
    loader: () =>
      import('./components/ScenariosPage').then(m => <m.ScenariosPage />),
  },
});

const eventsPage = PageBlueprint.make({
  name: 'events',
  params: {
    path: '/model-company/events',
    routeRef: eventsRouteRef,
    loader: () => import('./components/Pages').then(m => <m.EventsPage />),
  },
});

const dataProductsPage = PageBlueprint.make({
  name: 'data-products',
  params: {
    path: '/model-company/data-products',
    routeRef: dataProductsRouteRef,
    loader: () => import('./components/Pages').then(m => <m.DataProductsPage />),
  },
});

const architecturePage = PageBlueprint.make({
  name: 'architecture',
  params: {
    path: '/model-company/architecture',
    routeRef: architectureRouteRef,
    loader: () => import('./components/Pages').then(m => <m.ArchitecturePage />),
  },
});

export const modelCompanyPlugin = createFrontendPlugin({
  pluginId: 'model-company',
  extensions: [
    modelCompanyApi,
    overviewPage,
    campaignPage,
    unsPage,
    factoryPage,
    linesPage,
    equipmentPage,
    ordersPage,
    batchesPage,
    genealogyPage,
    materialFlowPage,
    warehousePage,
    scenariosPage,
    eventsPage,
    dataProductsPage,
    architecturePage,
  ],
  routes: {
    root: rootRouteRef,
    campaign: campaignRouteRef,
    uns: unsRouteRef,
    factory: factoryRouteRef,
    lines: linesRouteRef,
    equipment: equipmentRouteRef,
    orders: ordersRouteRef,
    batches: batchesRouteRef,
    genealogy: genealogyRouteRef,
    materialFlow: materialFlowRouteRef,
    warehouse: warehouseRouteRef,
    scenarios: scenariosRouteRef,
    events: eventsRouteRef,
    dataProducts: dataProductsRouteRef,
    architecture: architectureRouteRef,
  },
});
