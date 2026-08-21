import { documentationHref } from '@internal/platform-common';

export interface DeveloperBuildStep {
  id: string;
  title: string;
  body: string;
  href?: string;
  linkLabel?: string;
  docsHref?: string;
  docsLabel?: string;
  extraHref?: string;
  extraLabel?: string;
  auth?: boolean;
}

export const DEVELOPER_BUILD_STEPS: readonly DeveloperBuildStep[] = [
  {
    id: 'sign-in',
    title: 'Sign in to the Control Plane',
    body: 'Approved Developers, Owners and Admins can create. Viewers can discover only.',
    href: '/developer',
    linkLabel: 'Developer Hub',
    auth: true,
  },
  {
    id: 'marketplace',
    title: 'Choose a certified Golden Path',
    body: 'Marketplace is the starting point. MQTT Temperature, REST Equipment and OEE Data Product are the official certified paths.',
    href: '/marketplace',
    linkLabel: 'Marketplace',
    docsHref: documentationHref('golden-paths'),
    docsLabel: 'Golden Path concept',
    auth: true,
  },
  {
    id: 'create',
    title: 'Create generates the repository',
    body: 'Create runs the Golden Path template. GitHub receives source, CI/CD, Dockerfile, catalog-info.yaml and TechDocs.',
    href: '/create',
    linkLabel: 'Create',
    docsHref: documentationHref('first-data-product'),
    docsLabel: 'Build Your First Data Product',
    auth: true,
  },
  {
    id: 'composition',
    title: 'The composition manifest selects Platform Components',
    body: 'Golden Paths compose reusable components. There is no graphical composition engine in this release.',
    href: '/platform-components',
    linkLabel: 'Component Registry',
    docsHref: documentationHref('platform-component-composition'),
    docsLabel: 'Composition docs',
    auth: true,
  },
  {
    id: 'semantics',
    title: 'Bind AAS meaning to UNS data flow',
    body: 'AAS explains the asset and property. Unified Namespace governs the operational path. Neither is a Data Product.',
    docsHref: documentationHref('aas-vs-uns'),
    docsLabel: 'AAS vs Unified Namespace',
    extraHref: documentationHref('uns-overview'),
    extraLabel: 'Unified Namespace Docs',
    auth: true,
  },
  {
    id: 'ci',
    title: 'CI/CD proves contract, quality and compatibility',
    body: 'GitHub Actions run tests, contract checks, quality gates and Docker build. CERTIFIED is technical platform status only.',
    docsHref: documentationHref('howto-ci'),
    docsLabel: 'Debug CI',
    extraHref: documentationHref('howto-contract'),
    extraLabel: 'Handle a Breaking Change',
    auth: true,
  },
  {
    id: 'catalog',
    title: 'Catalog and TechDocs make the product discoverable',
    body: 'The Control Plane records topology, owner, version and documentation. It does not become the operational runtime.',
    href: '/data-products',
    linkLabel: 'Data Products UI',
    docsHref: documentationHref('howto-register'),
    docsLabel: 'Catalog registration',
    auth: true,
  },
  {
    id: 'runtime',
    title: 'The generated runtime stays independent',
    body: 'The Data Product serves consumers from its own API. It does not require Pharma Data Factory to keep running.',
    docsHref: documentationHref('control-plane'),
    docsLabel: 'Control Plane vs Data Plane',
    extraHref: documentationHref('architecture-data-product'),
    extraLabel: 'Data Product architecture',
    auth: true,
  },
];

export const MQTT_TEMPERATURE_COMPOSITION = {
  name: 'mqtt-temperature-conceptual',
  status: 'CERTIFIED' as const,
  yaml: `apiVersion: dataprod.platform/v1alpha1
kind: GoldenPathComposition
metadata:
  name: mqtt-temperature-conceptual
spec:
  components:
    - ref: component:default/mqtt-consumer
      version: 1.x
    - ref: component:default/rest-api
      version: 1.x
    - ref: component:default/health
      version: 1.x
    - ref: component:default/observability
      version: 1.x`,
} as const;

export const DEVELOPER_DOC_LINKS = [
  { label: 'Developer Hub', href: '/developer' },
  { label: 'Build Your First Data Product', href: documentationHref('first-data-product') },
  { label: 'MQTT Temperature how-to', href: documentationHref('howto-mqtt') },
  { label: 'REST Equipment how-to', href: documentationHref('howto-rest') },
  { label: 'Platform Component composition', href: documentationHref('platform-component-composition') },
  { label: 'AAS Developer Docs', href: documentationHref('aas-overview') },
  { label: 'Unified Namespace Docs', href: documentationHref('uns-overview') },
  { label: 'Public architecture story', href: '/platform/architecture' },
] as const;
