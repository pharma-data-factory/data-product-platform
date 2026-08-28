import {
  ApiBlueprint,
  createFrontendPlugin,
  discoveryApiRef,
  fetchApiRef,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';
import AssignmentTurnedInIcon from '@material-ui/icons/AssignmentTurnedIn';
import { ValidationExpertClient, validationExpertApiRef } from './api';
import {
  evidenceRouteRef,
  findingsRouteRef,
  iqRouteRef,
  manualTestRouteRef,
  oqRouteRef,
  requirementDetailRouteRef,
  requirementsRouteRef,
  risksRouteRef,
  rootRouteRef,
  runDetailRouteRef,
  runsRouteRef,
  traceabilityRouteRef,
  uatRouteRef,
} from './routes';

const validationExpertApi = ApiBlueprint.make({
  name: 'service',
  params: defineParams =>
    defineParams({
      api: validationExpertApiRef,
      deps: {
        discoveryApi: discoveryApiRef,
        fetchApi: fetchApiRef,
      },
      factory: ({ discoveryApi, fetchApi }) =>
        new ValidationExpertClient({ discoveryApi, fetchApi }),
    }),
});

const overviewPage = PageBlueprint.make({
  params: {
    path: '/validation-expert',
    routeRef: rootRouteRef,
    title: 'Validation Expert',
    icon: <AssignmentTurnedInIcon />,
    loader: () => import('./components/OverviewPage').then(m => <m.OverviewPage />),
  },
});

const requirementsPage = PageBlueprint.make({
  name: 'requirements',
  params: {
    path: '/validation-expert/requirements',
    routeRef: requirementsRouteRef,
    loader: () =>
      import('./components/RequirementsPage').then(m => <m.RequirementsPage />),
  },
});

const requirementDetailPage = PageBlueprint.make({
  name: 'requirement-detail',
  params: {
    path: '/validation-expert/requirements/:id',
    routeRef: requirementDetailRouteRef,
    loader: () =>
      import('./components/RequirementsPage').then(m => <m.RequirementDetailPage />),
  },
});

const traceabilityPage = PageBlueprint.make({
  name: 'traceability',
  params: {
    path: '/validation-expert/traceability',
    routeRef: traceabilityRouteRef,
    loader: () =>
      import('./components/TraceRiskPages').then(m => <m.TraceabilityPage />),
  },
});

const risksPage = PageBlueprint.make({
  name: 'risks',
  params: {
    path: '/validation-expert/risks',
    routeRef: risksRouteRef,
    loader: () => import('./components/TraceRiskPages').then(m => <m.RisksPage />),
  },
});

const iqPage = PageBlueprint.make({
  name: 'iq',
  params: {
    path: '/validation-expert/iq',
    routeRef: iqRouteRef,
    loader: () => import('./components/ProtocolPages').then(m => <m.IqPage />),
  },
});

const oqPage = PageBlueprint.make({
  name: 'oq',
  params: {
    path: '/validation-expert/oq',
    routeRef: oqRouteRef,
    loader: () => import('./components/ProtocolPages').then(m => <m.OqPage />),
  },
});

const uatPage = PageBlueprint.make({
  name: 'uat',
  params: {
    path: '/validation-expert/uat',
    routeRef: uatRouteRef,
    loader: () => import('./components/ProtocolPages').then(m => <m.UatPage />),
  },
});

const runsPage = PageBlueprint.make({
  name: 'runs',
  params: {
    path: '/validation-expert/runs',
    routeRef: runsRouteRef,
    loader: () => import('./components/ProtocolPages').then(m => <m.RunsPage />),
  },
});

const runDetailPage = PageBlueprint.make({
  name: 'run-detail',
  params: {
    path: '/validation-expert/runs/:runId',
    routeRef: runDetailRouteRef,
    loader: () => import('./components/RunPages').then(m => <m.RunDetailPage />),
  },
});

const manualTestPage = PageBlueprint.make({
  name: 'manual-test',
  params: {
    path: '/validation-expert/runs/:runId/tests/:testId',
    routeRef: manualTestRouteRef,
    loader: () => import('./components/RunPages').then(m => <m.ManualTestPage />),
  },
});

const evidencePage = PageBlueprint.make({
  name: 'evidence',
  params: {
    path: '/validation-expert/evidence',
    routeRef: evidenceRouteRef,
    loader: () => import('./components/RunPages').then(m => <m.EvidencePage />),
  },
});

const findingsPage = PageBlueprint.make({
  name: 'findings',
  params: {
    path: '/validation-expert/findings',
    routeRef: findingsRouteRef,
    loader: () => import('./components/RunPages').then(m => <m.FindingsPage />),
  },
});

export const validationExpertPlugin = createFrontendPlugin({
  pluginId: 'validation-expert',
  extensions: [
    validationExpertApi,
    overviewPage,
    requirementsPage,
    requirementDetailPage,
    traceabilityPage,
    risksPage,
    iqPage,
    oqPage,
    uatPage,
    runsPage,
    runDetailPage,
    manualTestPage,
    evidencePage,
    findingsPage,
  ],
  routes: {
    root: rootRouteRef,
    requirements: requirementsRouteRef,
    requirementDetail: requirementDetailRouteRef,
    traceability: traceabilityRouteRef,
    risks: risksRouteRef,
    iq: iqRouteRef,
    oq: oqRouteRef,
    uat: uatRouteRef,
    runs: runsRouteRef,
    runDetail: runDetailRouteRef,
    manualTest: manualTestRouteRef,
    evidence: evidenceRouteRef,
    findings: findingsRouteRef,
  },
});
