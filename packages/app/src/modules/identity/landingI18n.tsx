import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  LEARN_ASSEMBLY_STEPS,
  LEARN_TOPICS,
  PLATFORM_CAPABILITIES,
  PRODUCT_EDITIONS,
} from '@internal/platform-common';
import { ARCHITECTURE_CONCEPTS } from '../architecture/constants';
import { PLATFORM_POSITIONING } from '../theme/tokens';

export const LANDING_LOCALE_STORAGE_KEY = 'pdf.landing.locale';

export const LANDING_LOCALES = [
  { id: 'en', label: 'English', short: 'EN' },
  { id: 'de', label: 'Deutsch', short: 'DE' },
] as const;

export type LandingLocaleId = (typeof LANDING_LOCALES)[number]['id'];

type LearnTopicCopy = { title: string; summary: string };

export interface LandingCopy {
  language: string;
  bookDemo: string;
  signIn: string;
  openMenu: string;
  closeMenu: string;
  nav: {
    platform: string;
    marketplace: string;
    solutions: string;
    developers: string;
    academy: string;
    enterprise: string;
    trust: string;
    ecosystem: string;
    learn: string;
    editions: string;
    goldenPaths: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    sub: string;
    clarification: string;
    primary: string;
    secondary: string;
    discover: string;
    sceneLabel: string;
    protocolLabel: string;
    overlayTitle: string;
    overlayRows: readonly { label: string; value: string }[];
    headlinePrimary: string;
    headlineAccent: string;
    demo: string;
    coreLabel: string;
    /** Top → bottom platform stack under the brand lockup. */
    coreLayers: readonly [string, string, string];
    dashboardNav: readonly string[];
    metrics: readonly { label: string; value: string; hint: string }[];
    orbit: Record<
      | 'erp'
      | 'mes'
      | 'lims'
      | 'ewm'
      | 'historian'
      | 'cdmo'
      | 'apis'
      | 'events'
      | 'mqtt'
      | 'rest'
      | 'files',
      string
    >;
  };
  why: {
    eyebrow: string;
    title: string;
    body: string;
    forWhom: string;
    systemOfRecord: string;
    systemOfRecordBody: string;
    dataProduct: string;
    dataProductBody: string;
    controlPlane: string;
    controlPlaneBody: string;
    pillars: readonly { title: string; body: string }[];
  };
  developer: {
    eyebrow: string;
    title: string;
    headline: string;
    platformLabel: string;
    developerLabel: string;
    resultLabel: string;
    platformItems: readonly string[];
    domainItem: string;
    cta: string;
  };
  preview: {
    eyebrow: string;
    title: string;
    body: string;
    cta: string;
    systems: string;
    governed: string;
    components: string;
    goldenPaths: string;
    products: string;
  };
  proof: {
    eyebrow: string;
    title: string;
    oeeCaption: string;
    oee: string;
    mes: string;
    machine: string;
    rest: string;
    mqtt: string;
    formula: string;
    api: string;
    mqttCard: string;
    restCard: string;
    aasCard: string;
    footnote: string;
  };
  learn: {
    eyebrow: string;
    title: string;
    sub: string;
    availableToday: string;
    assemblyLabel: string;
    topics: Record<string, LearnTopicCopy>;
    assemblySteps: readonly string[];
  };
  pricing: {
    eyebrow: string;
    title: string;
    sub: string;
    customerHosted: string;
    managed: string;
    includes: string;
    everythingIn: (name: string) => string;
    contact: string;
    contactNote: string;
    editions: Record<
      string,
      {
        bestFor: string;
        priceLabel: string;
        priceHint: string;
        cta: string;
        includes: readonly string[];
      }
    >;
  };
  footer: {
    tagline: string;
    note: string;
  };
  overview: {
    eyebrow: string;
    title: string;
    body: string;
    cta: string;
    concepts: Record<string, { title: string; body: string }>;
  };
  principle: {
    eyebrow: string;
    title: string;
    body1: string;
    body2: string;
    finale: string;
    benefits: readonly string[];
    certified: string;
    illustrative: string;
    vizLabel: string;
    layerStandard: string;
    layerStable: string;
    layerInterfaces: string;
    layerProducts: string;
    sectionLabel: string;
    benefitsLabel: string;
    srOnly: string;
    mapsTo: string;
    dataProductKind: string;
    layers: {
      standard: string;
      aas: string;
      uns: string;
      components: string;
      goldenPaths: string;
      products: string;
      factory: string;
    };
    captions: {
      stableCore: string;
      systemsOfRecord: string;
      aas: string;
      uns: string;
      goldenCompose: string;
      goldenExamples: string;
      dataProduct: string;
      controlPlane: string;
    };
  };
  storyCta: {
    primary: string;
    secondary: string;
  };
  platform: {
    eyebrow: string;
    title: string;
    sub: string;
    groupTitle: string;
    kind: string;
    badge: string;
    explore: string;
    capabilities: Record<string, { title: string; text: string }>;
  };
  howItWorks: {
    eyebrow: string;
    title: string;
    sub: string;
    journey: string;
    steps: readonly string[];
    sentences: readonly string[];
  };
  goldenPaths: {
    eyebrow: string;
    title: string;
    sub: string;
    certifiedGroup: string;
    plannedTitle: string;
    plannedSub: string;
    kindCertified: string;
    kindPlanned: string;
    explore: string;
    unavailable: string;
    problemLabel: string;
    logicLabel: string;
    definitionLabel: string;
    factorsLabel: string;
    useCasesLabel: string;
    byProvider: string;
    heading: string;
    searchPlaceholder: string;
    categoryFilter: string;
    categoryAll: string;
    empty: string;
    plannedNote: string;
    lossLabel: string;
    statusIn10: string;
    statusFoundation: string;
    statusPlanned: string;
    categoryLabels: Record<string, string>;
    visuals: Record<string, { label: string; from: string; via: string; to: string }>;
    items: Record<
      string,
      {
        description: string;
        definition?: string;
        factors?: readonly { name: string; meaning: string }[];
        lossIntro?: string;
        lossFeatures?: readonly {
          name: string;
          meaning: string;
          status: 'in-1.0' | 'foundation' | 'planned';
        }[];
        problem?: string;
        logic?: string;
        useCases?: readonly string[];
      }
    >;
  };
  finalCta: {
    title: string;
    sub: string;
    paths: readonly { label: string; href: string }[];
  };
  consent: {
    title: string;
    body: string;
    privacy: string;
    close: string;
    necessaryTitle: string;
    necessaryBody: string;
    necessaryBadge: string;
    analyticsTitle: string;
    analyticsBody: string;
    marketingTitle: string;
    marketingBody: string;
    acceptAll: string;
    necessaryOnly: string;
    savePreferences: string;
  };
}

const EN_LEARN_TOPICS = Object.fromEntries(
  LEARN_TOPICS.map(topic => [topic.id, { title: topic.title, summary: topic.summary }]),
) as Record<string, LearnTopicCopy>;

const EN_EDITIONS = Object.fromEntries(
  PRODUCT_EDITIONS.map(edition => [
    edition.id,
    {
      bestFor: edition.bestFor,
      priceLabel: edition.priceLabel,
      priceHint: edition.priceHint,
      cta: edition.cta,
      includes:
        edition.availability === 'future'
          ? edition.futureCapabilities ?? []
          : edition.includes,
    },
  ]),
);

const EN_CAPABILITIES = Object.fromEntries(
  PLATFORM_CAPABILITIES.map(item => [item.id, { title: item.title, text: item.text }]),
);

const EN_CONCEPTS = Object.fromEntries(
  ARCHITECTURE_CONCEPTS.map(item => [item.id, { title: item.title, body: item.body }]),
);

const EN_HOW_IT_WORKS_STEPS = [
  'Keep the core',
  'Generate the product',
  'Consume the contract',
] as const;

const EN_HOW_IT_WORKS_SENTENCES = [
  'ERP, MES, LIMS and EWM stay systems of record. Nexora does not replace them or read their databases.',
  'A certified Golden Path creates the repository, contract, tests, Docker image and catalog entry.',
  'Applications bind to a versioned API — not to a one-off extract or an MES customization.',
] as const;

const EN_ARCHITECTURE_BENEFITS = [
  'Reduce unnecessary core customization',
  'Decouple digital innovation from core release cycles',
  'Faster time to value',
  'Governed Data Products',
  'Independent versioning',
  'Reusable capabilities',
] as const;

const en: LandingCopy = {
  language: 'Language',
  bookDemo: 'Book a Demo',
  signIn: 'Sign In',
  openMenu: 'Open menu',
  closeMenu: 'Close menu',
  nav: {
    platform: 'Platform',
    marketplace: 'Marketplace',
    solutions: 'Solutions',
    developers: 'Developers',
    academy: 'Academy',
    enterprise: 'Enterprise',
    trust: 'Trust',
    ecosystem: 'Ecosystem',
    learn: 'Learn',
    editions: 'Editions',
    goldenPaths: 'Golden Paths',
  },
  hero: {
    eyebrow: PLATFORM_POSITIONING,
    title: 'Connect systems.\nBuild capabilities.\nShare solutions.',
    headlinePrimary: 'Connect systems.',
    headlineAccent: 'Build capabilities. Share solutions.',
    sub: 'Nexora is an open, extensible manufacturing platform — a governed layer where life sciences teams, enterprise IT, consultants and technology partners build, discover and deploy manufacturing capabilities around the systems they already run.',
    clarification: 'Open architecture · Open standards (OPC UA · MQTT · AAS) · Open extension model · Not open-source software',
    primary: 'Build a Plugin',
    secondary: 'For Enterprises',
    discover: 'Explore the Platform',
    demo: 'Explore Marketplace',
    coreLabel: 'Platform',
    coreLayers: [
      'User Engagement and Experiences',
      'Autonomous Execution',
      'AI & Data Foundation',
    ],
    sceneLabel: 'Nexora Control Plane beside ERP, MES, LIMS, EWM, historian, CMO platforms and product interfaces',
    protocolLabel: 'How Data Products are consumed',
    overlayTitle: 'OVERVIEW',
    overlayRows: [
      { label: 'Golden Paths', value: '3 CERTIFIED · MQTT · REST · OEE' },
      { label: 'Create', value: 'Temperature · Equipment · OEE' },
      { label: 'Runtime', value: 'Independent of the Control Plane' },
    ],
    dashboardNav: [
      'Overview',
      'Data Products',
      'Integrations',
      'Pipelines',
      'Catalog',
      'Quality',
      'Workflows',
    ],
    metrics: [
      { label: 'Data Products', value: '32', hint: 'Active' },
      { label: 'Integrations', value: '48', hint: 'Connected' },
      { label: 'Data flows', value: '267', hint: 'Live' },
      { label: 'Systems', value: '12', hint: 'Core systems' },
    ],
    orbit: {
      erp: 'ERP',
      mes: 'MES',
      lims: 'LIMS',
      ewm: 'EWM',
      historian: 'Historian',
      cdmo: 'CMO',
      apis: 'APIs',
      events: 'Events',
      mqtt: 'MQTT',
      rest: 'REST',
      files: 'Files / Streams',
    },
  },
  why: {
    eyebrow: 'Why Nexora',
    title: 'Digital value without rewriting MES.',
    body: 'Plant IT should not customize ERP, MES, LIMS or EWM every time the business needs a new data offering. Those systems stay close to standard. Nexora is the governed layer beside them.',
    forWhom:
      'For manufacturing and digital teams in life science — pharma, biotech, and CDMO — who need Temperature, Equipment and OEE products — not another integration project.',
    systemOfRecord: 'Your systems stay standard',
    systemOfRecordBody: 'ERP, MES, LIMS and EWM remain the systems of record. Nexora does not replace them and does not connect to those databases directly.',
    dataProduct: 'Products move independently',
    dataProductBody: 'Each Data Product is a versioned service with its own contract, quality gate, CI/CD and owner. It can evolve without a core release.',
    controlPlane: 'Nexora runs the factory',
    controlPlaneBody: 'Catalog, Golden Paths, Marketplace, TechDocs and RBAC govern how products are created and discovered. The Control Plane is not the shop-floor runtime.',
    pillars: [
      {
        title: 'Protect the standard',
        body: 'Core systems stay stable and updateable.',
      },
      {
        title: 'Integrate quickly',
        body: 'Prefabricated connectors and Golden Paths.',
      },
      {
        title: 'Deliver value faster',
        body: 'Data Products in weeks, not months.',
      },
      {
        title: 'Secure & compliant',
        body: 'Governance, audit and quality built in. This is not GxP, CSV, or regulatory validation.',
      },
    ],
  },
  developer: {
    eyebrow: 'For your developers',
    title: 'Focus on domain value. Not platform plumbing.',
    headline: 'Your team writes the domain logic. Nexora ships the rest.',
    platformLabel: 'Platform provides',
    developerLabel: 'Developer provides',
    resultLabel: 'Governed Data Product',
    platformItems: [
      'MQTT',
      'REST',
      'Storage',
      'Health',
      'Observability',
      'Contracts',
      'CI/CD',
    ],
    domainItem: 'Domain logic',
    cta: 'How developers build',
  },
  preview: {
    eyebrow: 'Architecture',
    title: 'A governed layer around the systems you already run.',
    body: 'Want the engineering picture? See how assets, operational flow, reusable capabilities and Golden Paths fit together — without collapsing MES into the Control Plane.',
    cta: 'Explore Architecture',
    systems: 'ERP · MES · LIMS · EWM · PLC',
    governed: 'Governed layer',
    components: 'Platform Components',
    goldenPaths: 'Golden Paths',
    products: 'Data Products',
  },
  proof: {
    eyebrow: 'What you can run today',
    title: 'Four certified Golden Paths. One factory.',
    oeeCaption:
      'Overall Equipment Effectiveness per asset and time window — Availability × Performance × Quality — as a product, not an MES report.',
    oee: 'OEE Data Product',
    mes: 'MES',
    machine: 'Machine',
    rest: 'REST',
    mqtt: 'MQTT',
    formula: 'A × P × Q',
    api: 'REST API',
    mqttCard: 'Turn MQTT temperature telemetry into a governed product with a contract, quality gate and REST API.',
    restCard: 'Publish equipment state over REST as a versioned Data Product — reusable across lines, not a one-off extract.',
    aasCard: 'Asset Administration Shell (IEC 63278 / IDTA-01001 v3.0) for asset registry, multi-source ingestion, and semantic asset management.',
    footnote: 'CERTIFIED is technical platform status. It is not GxP, CSV, or regulatory validation.',
  },
  learn: {
    eyebrow: 'Learn',
    title: 'Data Products, in business terms',
    sub: 'A short vocabulary for manufacturing and IT leaders. Technical architecture lives on the architecture page.',
    availableToday: 'Available today',
    assemblyLabel: 'How Data Products are assembled from reusable capabilities',
    topics: EN_LEARN_TOPICS,
    assemblySteps: LEARN_ASSEMBLY_STEPS,
  },
  pricing: {
    eyebrow: 'How to start',
    title: 'Template, Platform, or SaaS',
    sub: 'Start with certified templates in a controlled pilot. Add the Control Plane when you want the factory in your cloud. SaaS is a future offering and is not available today.',
    customerHosted: 'Customer-hosted',
    managed: 'Managed',
    includes: 'Includes:',
    everythingIn: name => `Everything in ${name}, plus:`,
    contact: 'Contact us for enterprise pricing.',
    contactNote:
      'No public price list. Designed for future AWS Marketplace distribution. No live listing or checkout in this release.',
    editions: EN_EDITIONS,
  },
  footer: {
    tagline: `${PLATFORM_POSITIONING}. Technical certification is platform status only. It is not GxP or regulatory validation.`,
    note: 'Single-organization Control Plane. SaaS multi-tenancy is future.',
  },
  overview: {
    eyebrow: 'FROM PRINCIPLE TO ARCHITECTURE',
    title: 'How Nexora works',
    body: 'Nexora creates a governed engineering layer for building, operating and discovering Data Products around existing ERP, MES, LIMS, EWM, Historian, CMO and other IT/OT platforms.',
    cta: 'Explore the Architecture',
    concepts: EN_CONCEPTS,
  },
  principle: {
    eyebrow: 'How it fits together',
    title: 'From stable core systems to governed Data Products.',
    body1:
      'Keep ERP, MES, LIMS, EWM, CMO platforms and other IT/OT systems stable and close to standard.',
    body2:
      'Nexora adds a governed digital layer around those systems: assets are described semantically, operational data flows through governed interfaces, reusable components provide technical capabilities, and Golden Paths turn them into independently evolving Data Products.',
    finale: 'Keep core systems standard.\nCompose digital capabilities.\nDeliver governed Data Products.',
    benefits: EN_ARCHITECTURE_BENEFITS,
    certified: 'Certified',
    illustrative: 'Illustrative',
    vizLabel: 'Keep core systems standard and innovate through Data Products',
    layerStandard: 'Standard systems',
    layerStable: 'Standard & stable IT/OT core',
    layerInterfaces: 'Governed interfaces',
    layerProducts: 'Data products',
    sectionLabel: 'Architecture principle',
    benefitsLabel: 'Architecture benefits',
    srOnly:
      'Systems of record remain ERP, MES, LIMS, EWM, historian, CMO platforms, PLC, SCADA and other IT/OT. AAS explains what an asset is and what its data means. Unified Namespace governs where operational data flows. Certified Platform Components provide reusable capabilities. Golden Paths compose them into independently evolving Data Products. Nexora is the Control Plane. It does not replace source systems, does not store time-series in AAS, and does not process all operational data.',
    mapsTo: 'maps to',
    dataProductKind: 'Data Product',
    layers: {
      standard: 'Standard systems',
      aas: 'Asset Administration / AAS',
      uns: 'Unified Namespace',
      components: 'Platform Components',
      goldenPaths: 'Golden Paths',
      products: 'Data products',
      factory: 'Nexora',
    },
    captions: {
      stableCore: 'Standard & stable IT/OT core',
      systemsOfRecord: 'Systems of Record remain stable and close to standard.',
      aas: 'AAS explains what an asset is and what its data means. AAS does not store time-series values.',
      uns: 'UNS governs where and how operational data flows. AAS = meaning. UNS = data flow.',
      goldenCompose: 'Golden Paths compose certified capabilities',
      goldenExamples:
        'Official examples today: MQTT Temperature, REST Equipment, and OEE Data Product. Cold Chain, Quality, Energy and AI Assistant are future.',
      dataProduct:
        'A Data Product contains business value and can evolve independently from the operational core.',
      controlPlane:
        'The Control Plane governs how Data Products are built, released, discovered and operated. It does not process all operational data.',
    },
  },
  storyCta: {
    primary: 'Explore Platform Architecture',
    secondary: 'Explore Golden Paths',
  },
  platform: {
    eyebrow: 'Platform value',
    title: 'Six capabilities for governed data products',
    sub: 'A coherent commercial Control Plane — not a default Backstage portal.',
    groupTitle: 'Key Features',
    kind: 'Platform capability',
    badge: 'Key Feature',
    explore: 'Explore',
    capabilities: EN_CAPABILITIES,
  },
  howItWorks: {
    eyebrow: 'How it works',
    title: 'From plant systems to a product you can consume',
    sub: 'Three steps. No platform department required.',
    journey: 'Product journey',
    steps: EN_HOW_IT_WORKS_STEPS,
    sentences: EN_HOW_IT_WORKS_SENTENCES,
  },
  goldenPaths: {
    eyebrow: 'Golden Paths',
    title: 'Certified manufacturing Golden Paths',
    sub: 'MQTT Temperature, REST Equipment, and OEE are technically CERTIFIED.',
    certifiedGroup: 'Certified templates',
    plannedTitle: 'Planned / future Golden Paths',
    plannedSub:
      'These examples are not implemented and are not available in the current MVP.',
    kindCertified: 'Golden Path template',
    kindPlanned: 'Planned template',
    explore: 'Explore',
    unavailable: 'Not available',
    problemLabel: 'Why it exists as a product',
    logicLabel: 'How the path works',
    definitionLabel: 'What it is',
    factorsLabel: 'Availability × Performance × Quality',
    useCasesLabel: 'Typical plant use',
    byProvider: 'by Nexora',
    heading: 'Golden Paths',
    searchPlaceholder: 'Search Golden Paths...',
    categoryFilter: 'Categories Filter',
    categoryAll: 'All',
    empty: 'No Golden Paths match this search or category.',
    plannedNote:
      'Specified so manufacturing and digital teams can plan. Not generated today, no live connectivity, and not available in Create.',
    lossLabel: 'Loss analysis',
    statusIn10: 'IN 1.0',
    statusFoundation: 'FOUNDATION',
    statusPlanned: 'PLANNED',
    categoryLabels: {
      Telemetry: 'Telemetry',
      Equipment: 'Equipment',
      Performance: 'Performance',
      Integration: 'Integration',
    },
    visuals: {
      'mqtt-temperature': {
        label: 'Sensor temperature travels over MQTT into a versioned Data Product',
        from: 'Sensor',
        via: 'MQTT',
        to: 'Product',
      },
      'rest-equipment': {
        label: 'Equipment state is polled over REST and published as a stable equipmentId',
        from: 'Equipment',
        via: 'REST',
        to: 'Identity',
      },
      oee: {
        label: 'OEE is Availability times Performance times Quality for one asset and window',
        from: 'A',
        via: 'P',
        to: 'Q',
      },
      snowflake: {
        label: 'Certified plant contracts would land in Snowflake as versioned warehouse tables',
        from: 'Product',
        via: 'Load',
        to: 'Warehouse',
      },
      sap: {
        label: 'Selected SAP objects would become a versioned Data Product without table reads',
        from: 'SAP',
        via: 'Adapter',
        to: 'Product',
      },
      'cold-chain': {
        label: 'Chamber or shipment temperature stays inside a declared band, or an excursion is published',
        from: 'Chamber',
        via: 'Band',
        to: 'Integrity',
      },
      'aas-data-product': {
        label: 'Asset Administration Shell brings semantic meaning to equipment, then data flows to products',
        from: 'Equipment',
        via: 'AAS',
        to: 'Products',
      },
    },
    items: {
      'mqtt-temperature': {
        description:
          'A versioned temperature product from MQTT telemetry — contract, quality gate and REST API, independent of the broker.',
        definition:
          'Temperature readings from shop-floor or utility sensors become a governed Data Product: one contract, one time series, one REST API. Consumers subscribe to the product, not to an MQTT topic or a historian extract.',
        problem:
          'Temperature stays in brokers, historians or one-off scripts. Each line rebuilds ingest. Dashboards have no stable contract and no quality gate.',
        logic:
          'The generated service subscribes to a configured MQTT topic, validates temperature-event 1.1.0, persists a governed series, and exposes REST, health, tests, Docker and catalog metadata. It runs without the Control Plane.',
        useCases: [
          'Filling or packaging line temperature as a reusable product',
          'Room or utility sensors with a versioned API for operations dashboards',
          'A governed feed that later analytics can consume without changing MES',
        ],
      },
      'rest-equipment': {
        description:
          'Canonical equipment identity and state over REST — one equipmentId that lines, dashboards and OEE can share.',
        definition:
          'Equipment is a first-class product: a stable equipmentId, current state, and location context published over a versioned REST contract. It is the identity other products, including OEE, can depend on.',
        problem:
          'Identity and state live in MES screens or ad-hoc endpoints. Every consumer writes another poller. Names, IDs and quality drift from line to line.',
        logic:
          'The generated service polls a governed REST source (or the local mock), validates equipment-event 1.0.0, upserts unique equipmentId records, and serves a product API with CI, TechDocs and catalog registration.',
        useCases: [
          'Shared equipment registry for packaging and filling lines',
          'Machine state for operations views without MES customizing',
          'Stable identity that an OEE product can join to production context',
        ],
      },
      oee: {
        description:
          'Overall Equipment Effectiveness for one asset and one time window: Availability × Performance × Quality, published as a contract — MES stays the system of record.',
        definition:
          'OEE (Overall Equipment Effectiveness) answers a single question for one named asset, such as filler-01: of the time we intended to produce, how effectively did this equipment deliver good units at the intended rate? The result is always one equipmentId and one explicit interval — hour, shift, order, or a custom range. It is not a site roll-up, not a MES report, and not a GxP claim.',
        factors: [
          {
            name: 'Availability',
            meaning:
              'Of planned production time in the window, how long the equipment was actually running. Planned downtime and unobserved time are excluded; they are not treated as unplanned stops.',
          },
          {
            name: 'Performance',
            meaning:
              'Of that running time, how close output was to the ideal cycle time from production context (seconds per unit). Slow cycles reduce Performance, not Availability.',
          },
          {
            name: 'Quality',
            meaning:
              'Of units counted in the window, how many were good versus rejected. OEE is the product of the three ratios; a missing input yields a declared calculation status, not a guessed number.',
          },
        ],
        lossIntro:
          'This product publishes Availability × Performance × Quality and the machine states that feed it. It is not a Six Big Losses, SMED, or GxP model. The list below is the language plants use for losses. The badge on each card is the scope: IN 1.0 is on the contract today. FOUNDATION has the raw signal. PLANNED is specified so teams can plan — it does not change the formulas and is not in Create.',
        lossFeatures: [
          {
            name: 'Microstops',
            status: 'planned',
            meaning:
              'Detect very short stops automatically, typically 2–30 seconds. STOPPED and IDLE are unplanned availability loss with no duration class. A later optional threshold would be compatible configuration, not a formula change.',
          },
          {
            name: 'Stop Classification',
            status: 'foundation',
            meaning:
              'Classifies RUNNING, STOPPED, IDLE and MAINTENANCE, plus plannedDowntime on production context. Named classes such as Microstop, Downtime, Planned Stop and Changeover are planned; they are not separate states today.',
          },
          {
            name: 'Reason Codes',
            status: 'foundation',
            meaning:
              'A reason may already travel on machine-state-event. It is diagnostic only and does not change A, P or Q. A governed catalog (sensor, jam, material missing, operator) is planned.',
          },
          {
            name: 'Reason Hierarchy',
            status: 'planned',
            meaning:
              'A structured tree such as Packaging → Labeler → Jam → Label stuck. Site-specific MES reason maps are out of this Golden Path so it stays reusable across plants.',
          },
          {
            name: 'Automatic Reason Detection',
            status: 'planned',
            meaning:
              'Derive a reason from PLC or MES signals instead of operator entry. The product consumes state and counts; it does not infer a site reason model from those signals.',
          },
          {
            name: 'Manual Reason Assignment',
            status: 'planned',
            meaning:
              'An operator later confirms or corrects the reason. This product has no shop-floor UI and no dashboard; assignment would be a later product on top of the contract.',
          },
          {
            name: 'Unknown Losses',
            status: 'foundation',
            meaning:
              'Unobserved time is already excluded so silence is not invented as downtime. A published “unknown reason” bucket for classified stops without a code is planned. Missing data yields calculationStatus, not a guessed OEE.',
          },
          {
            name: 'Pareto Analysis',
            status: 'planned',
            meaning:
              'Top-10 disruption reasons by duration, frequency or lost units. That is an analytics consumer of classified stops, not part of the OEE result row. No OEE dashboard ships in this release.',
          },
          {
            name: 'Frequency Analysis',
            status: 'planned',
            meaning:
              'How often each fault occurs in a window. Requires classified stop events; the product publishes one OEE row per equipment and interval, not a fault histogram.',
          },
          {
            name: 'Duration Analysis',
            status: 'planned',
            meaning:
              'Average and distribution of how long a given fault lasts. Same dependency: classified stops with timestamps, not the A × P × Q row alone.',
          },
          {
            name: 'MTBF / MTTR',
            status: 'planned',
            meaning:
              'Mean Time Between Failures and Mean Time To Repair from classified failure and restore events. Not computed on this path. Reliability metrics would be a later contract, not a silent extra field on oee-result.',
          },
          {
            name: 'Speed Loss',
            status: 'foundation',
            meaning:
              'The machine runs, but slower than the ideal cycle. This is already encoded in Performance: (idealCycleTime × totalCount) / runtime. A named speed-loss event class is planned; Performance may exceed 100% and is not clamped.',
          },
          {
            name: 'Minor Stops',
            status: 'planned',
            meaning:
              'Short interruptions that plants do not treat as classic downtime. IDLE is treated as unplanned availability loss, not as a minor-stop class. Aligns with Microstops once a duration policy exists.',
          },
          {
            name: 'Changeover Loss',
            status: 'foundation',
            meaning:
              'Product, batch or format change. plannedDowntime kinds such as CHANGEOVER can be recorded as information only; they do not yet split Availability versus Performance. A dedicated changeover / SMED bucket is planned.',
          },
          {
            name: 'Startup Loss',
            status: 'planned',
            meaning:
              'Loss while the line ramps to rate after a stop or changeover. Not a current state. Would be classified from RUNNING below ideal cycle plus context (startup window), without rewriting MES.',
          },
          {
            name: 'Quality Loss',
            status: 'in-1.0',
            meaning:
              'Rejects versus good units in the window. Quality = goodCount / totalCount. Rework as a separate workflow is not included; reject count is. This is not a GxP disposition.',
          },
          {
            name: 'Context',
            status: 'foundation',
            meaning:
              'Every result is bound to equipmentId and an explicit window (hour, shift, order, custom), with site/area/line on production context. Joining every loss event to machine, order, batch, product and shift as a first-class analysis grain is planned.',
          },
        ],
        problem:
          'Plants still compute OEE inside MES customizing, historian reports or spreadsheets. The definition of planned time, the window (hour vs shift vs order), and the formula are trapped in one line project. A second filler copies the logic by hand. Digital and quality teams cannot version the KPI independently of MES, and every dashboard re-implements Availability, Performance and Quality.',
        logic:
          'MES remains the system of record. The generated product reads production context over REST — planned interval, ideal cycle time, target quantity, order identity — and machine events over MQTT: running or stopped state, cumulative counts, quality rejects. For each equipmentId and window it computes Availability × Performance × Quality and publishes oee-result over REST, with health, tests, Docker and catalog metadata. Direct database access to MES, ERP, LIMS or EWM is out of scope. CERTIFIED means this path is technically complete; it is not GxP validation.',
        useCases: [
          'Hourly OEE for a filling or packaging line, with a declared calculation window',
          'Shift or production-order OEE for operations review without rewriting MES reports',
          'A versioned OEE API that BI, LIMS or a later dashboard can consume while MES stays standard',
        ],
      },
      snowflake: {
        description:
          'A governed warehouse product: certified plant contracts land in Snowflake as versioned tables — without a one-off ELT script per line.',
        definition:
          'Snowflake is the analytics store, not a second MES. This Golden Path would publish selected Data Product contracts — temperature series, equipment identity, OEE results — into Snowflake with the same version and quality status the plant product already has. MES, ERP, LIMS and EWM stay systems of record. There is no live Snowflake account, no warehouse load, and no Create template in this release.',
        problem:
          'Analytics teams copy historian extracts and MES reports into the warehouse. The schema is local to one plant project. When the OEE window or equipmentId changes, BI breaks. There is no contract version, no quality gate, and no catalog entry for what landed.',
        logic:
          'Intended path, not generated today: consume an already certified Data Product API (REST + contract) → map fields to a Snowflake-facing schema → load with declared version and calculationStatus → register the warehouse object in the Catalog. Direct database access to SAP, MES or LIMS remains out of scope. No Snowflake credentials are collected at Create.',
        useCases: [
          'Cross-line OEE and temperature history in the site BI model',
          'Equipment master data for analytics without a second poller into MES',
          'A versioned warehouse feed that QA or supply-chain reporting can trust later',
        ],
      },
      sap: {
        description:
          'Selected SAP manufacturing and logistics objects as a versioned Data Product — without RFC sprawl or reading SAP tables from the product.',
        definition:
          'SAP remains the system of record for orders, batches, materials and movements. This Golden Path would expose a narrow, named contract — for example production-order context or batch identity — that OEE, quality or warehouse products can consume. It is not an SAP replacement, not a full IDoc hub, and not live SAP connectivity in this release.',
        problem:
          'Every dashboard, MES interface and data lake invents another SAP extract. Z-tables and undocumented RFCs leak into line projects. When the SAP release changes, each consumer breaks separately. Digital teams cannot version “what we took from SAP” independently of the core.',
        logic:
          'Intended path, not generated today: a governed SAP-facing adapter (official API or event, not a database read) → validate a versioned contract → upsert by stable business key → REST product with health, tests, Docker and catalog metadata. No RFC hard-coding in the generated service, no SAP GUI automation, no live system in this MVP.',
        useCases: [
          'Production-order context (ideal cycle, target quantity, planned interval) for OEE',
          'Batch or material identity that a later quality product can join',
          'Goods-movement events for equipment-use or inventory products — SAP stays standard',
        ],
      },
      'cold-chain': {
        description:
          'Temperature integrity for storage and transport: a declared band, excursion events, and a time series as a contract — not a logger PDF.',
        definition:
          'Cold Chain is a temperature-integrity product for a named storage unit or shipment lane. It answers whether the asset stayed inside an allowed temperature band for a declared interval, and it publishes excursion events when it did not. It reuses the temperature-ingest idea of MQTT Temperature, but adds lane or chamber identity and threshold logic. It is not GxP validation of the cold chain, not a 21 CFR Part 11 claim, and not generated in this release.',
        problem:
          'Evidence still lives in USB loggers, warehouse screens and PDF attachments. QA cannot subscribe to a versioned excursion API. Each depot copies alarm logic. When a shipment is questioned, teams reconstruct the series by hand instead of reading a contract.',
        logic:
          'Intended path, not generated today: sensor or logger readings plus shipment or chamber identity → validate a temperature-band contract → persist a governed series → emit excursion events and a REST result for the interval. Builds on the certified Temperature ingest pattern (contract, quality gate, catalog). No live logger integration and no Create template in this MVP.',
        useCases: [
          'Warehouse fridge or freezer chamber against a declared band',
          'A shipment lane from plant to depot, with excursion events for later review',
          'A governed feed that a future quality product can consume without reading logger files',
        ],
      },
      'aas-data-product': {
        description:
          'Asset Administration Shell (IEC 63278 / IDTA-01001 v3.0) for asset registry, multi-source ingestion, and semantic asset management.',
        definition:
          'AAS Asset Administration Shell is a standardized digital representation of industrial assets (equipment, components, facilities) conforming to IEC 63278-1:2024 and IDTA-01001 v3.0 metamodel. The golden path generates a certified asset registry service that ingests asset events from MQTT, REST, or file sources, validates them against a data contract, and exposes a governed REST API for asset discovery, submodel management, and quality assurance.',
        problem:
          'Asset metadata lives in disconnected systems: MES, ERP, maintenance platforms, and spreadsheets. Teams cannot subscribe to a versioned asset identity contract. Each consumer rebuilds or duplicates asset context. When assets move or are decommissioned, changes propagate separately to each system.',
        logic:
          'The generated service consumes asset-event contracts from configured sources (MQTT topics, REST endpoints, file uploads) → validates IDTA-01001 v3.0 submodel compliance → persists assets with full submodel element support → exposes a governed REST product API with health checks, observability, tests, Docker build, and catalog metadata. It runs independently of Backstage and can serve as a platform component for downstream data products.',
        useCases: [
          'Centralized asset registry for production lines, equipment, and components',
          'Semantic asset enrichment for OEE, temperature, and equipment data products',
          'Governance and versioning of asset identity and submodel elements across plants',
        ],
      },
    },
  },
  finalCta: {
    title: 'Choose your path.',
    sub: 'Use Nexora, build on Nexora, publish on Nexora, or partner with Nexora — every path starts from the same open manufacturing platform.',
    paths: [
      { label: 'Use Nexora', href: '#journey' },
      { label: 'Build on Nexora', href: '#build' },
      { label: 'Publish on Nexora', href: '#marketplace' },
      { label: 'Partner with Nexora', href: '#enterprise' },
    ],
  },
  consent: {
    title: 'Cookie Settings',
    body: 'We use cookies to provide you with the best possible experience on our website. You can adjust your settings at any time.',
    privacy: 'Privacy Policy',
    close: 'Close',
    necessaryTitle: 'Necessary',
    necessaryBody:
      'These cookies are essential for the basic functions of the website and cannot be disabled.',
    necessaryBadge: 'Always active',
    analyticsTitle: 'Analytics',
    analyticsBody:
      'These cookies help us understand how visitors interact with the website.',
    marketingTitle: 'Marketing',
    marketingBody:
      'These cookies are used to make advertising more relevant to you.',
    acceptAll: 'Accept all',
    necessaryOnly: 'Necessary only',
    savePreferences: 'Save preferences',
  },
};

const de: LandingCopy = {
  language: 'Sprache',
  bookDemo: 'Demo vereinbaren',
  signIn: 'Anmelden',
  openMenu: 'Menü öffnen',
  closeMenu: 'Menü schließen',
  nav: {
    platform: 'Plattform',
    marketplace: 'Marketplace',
    solutions: 'Lösungen',
    developers: 'Entwickler',
    academy: 'Akademie',
    enterprise: 'Enterprise',
    trust: 'Vertrauen',
    ecosystem: 'Ökosystem',
    learn: 'Wissen',
    editions: 'Editionen',
    goldenPaths: 'Golden Paths',
  },
  hero: {
    eyebrow: 'DIE OFFENE MANUFACTURING-PLATTFORM FÜR LIFE SCIENCES',
    title: 'Systeme verbinden.\nFähigkeiten bauen.\nLösungen teilen.',
    headlinePrimary: 'Systeme verbinden.',
    headlineAccent: 'Fähigkeiten bauen. Lösungen teilen.',
    sub: 'Nexora ist eine offene, erweiterbare Manufacturing-Plattform — eine gesteuerte Schicht, in der Life-Sciences-Teams, Enterprise-IT, Consultants und Technologie-Partner Manufacturing-Fähigkeiten rund um ihre bestehenden Systeme bauen, finden und bereitstellen.',
    clarification: 'Offene Architektur · Offene Standards (OPC UA · MQTT · AAS) · Offenes Erweiterungsmodell · Keine Open-Source-Software',
    primary: 'Plugin bauen',
    secondary: 'Für Unternehmen',
    discover: 'Plattform entdecken',
    demo: 'Marketplace entdecken',
    coreLabel: 'Plattform',
    coreLayers: [
      'User Engagement und Experiences',
      'Autonomous Execution',
      'AI & Data Foundation',
    ],
    sceneLabel: 'Nexora Control Plane neben ERP, MES, LIMS, EWM, Historian, CMO-Plattformen und Product-Schnittstellen',
    protocolLabel: 'So werden Data Products genutzt',
    overlayTitle: 'ÜBERSICHT',
    overlayRows: [
      { label: 'Golden Paths', value: '3 CERTIFIED · MQTT · REST · OEE' },
      { label: 'Create', value: 'Temperature · Equipment · OEE' },
      { label: 'Runtime', value: 'Unabhängig von der Control Plane' },
    ],
    dashboardNav: [
      'Übersicht',
      'Data Products',
      'Integrationen',
      'Pipelines',
      'Katalog',
      'Qualität',
      'Workflows',
    ],
    metrics: [
      { label: 'Data Products', value: '32', hint: 'Aktiv' },
      { label: 'Integrationen', value: '48', hint: 'Verbunden' },
      { label: 'Datenflüsse', value: '267', hint: 'Live' },
      { label: 'Systeme', value: '12', hint: 'Kernsysteme' },
    ],
    orbit: {
      erp: 'ERP',
      mes: 'MES',
      lims: 'LIMS',
      ewm: 'EWM',
      historian: 'Historian',
      cdmo: 'CMO',
      apis: 'APIs',
      events: 'Events',
      mqtt: 'MQTT',
      rest: 'REST',
      files: 'Files / Streams',
    },
  },
  why: {
    eyebrow: 'Warum Nexora',
    title: 'Digitaler Nutzen, ohne MES umzuschreiben.',
    body: 'Die Werk-IT sollte ERP, MES, LIMS oder EWM nicht bei jedem neuen Datenangebot anpassen. Diese Systeme bleiben nah am Standard. Nexora ist die gesteuerte Schicht daneben.',
    forWhom:
      'Für Fertigungs- und Digital-Teams in Life Science — Pharma, Biotech und CDMO —, die Temperatur-, Equipment- und OEE-Produkte brauchen — kein weiteres Integrationsprojekt.',
    systemOfRecord: 'Ihre Systeme bleiben Standard',
    systemOfRecordBody: 'ERP, MES, LIMS und EWM bleiben Systeme of Record. Nexora ersetzt sie nicht und verbindet sich nicht direkt mit diesen Datenbanken.',
    dataProduct: 'Products entwickeln sich unabhängig',
    dataProductBody: 'Jedes Data Product ist ein versionierter Service mit Contract, Quality Gate, CI/CD und Owner. Es evolviert ohne Core-Release.',
    controlPlane: 'Nexora betreibt die Factory',
    controlPlaneBody: 'Katalog, Golden Paths, Marketplace, TechDocs und RBAC steuern, wie Products entstehen und gefunden werden. Die Control Plane ist nicht die Shop-Floor-Runtime.',
    pillars: [
      {
        title: 'Standard schützen',
        body: 'Kernsysteme bleiben stabil und updatefähig.',
      },
      {
        title: 'Schnell integrieren',
        body: 'Vorgefertigte Konnektoren und Golden Paths.',
      },
      {
        title: 'Wert schneller liefern',
        body: 'Data Products in Wochen statt Monaten.',
      },
      {
        title: 'Sicher & compliant',
        body: 'Governance, Audit und Qualität eingebaut. Das ist keine GxP-, CSV- oder regulatorische Validierung.',
      },
    ],
  },
  developer: {
    eyebrow: 'Für Ihre Entwickler',
    title: 'Fokus auf Domain-Nutzen. Nicht auf Plattform-Plumbing.',
    headline: 'Ihr Team schreibt die Domain-Logik. Nexora liefert den Rest.',
    platformLabel: 'Die Plattform liefert',
    developerLabel: 'Der Entwickler liefert',
    resultLabel: 'Gesteuertes Data Product',
    platformItems: [
      'MQTT',
      'REST',
      'Storage',
      'Health',
      'Observability',
      'Contracts',
      'CI/CD',
    ],
    domainItem: 'Domain-Logik',
    cta: 'So bauen Entwickler',
  },
  preview: {
    eyebrow: 'Architektur',
    title: 'Eine gesteuerte Schicht um die Systeme, die Sie bereits betreiben.',
    body: 'Möchten Sie das Engineering-Bild? Sehen Sie, wie Assets, Betriebsdaten, wiederverwendbare Fähigkeiten und Golden Paths zusammenpassen — ohne MES in die Control Plane zu ziehen.',
    cta: 'Architektur ansehen',
    systems: 'ERP · MES · LIMS · EWM · PLC',
    governed: 'Gesteuerte Schicht',
    components: 'Platform Components',
    goldenPaths: 'Golden Paths',
    products: 'Data Products',
  },
  proof: {
    eyebrow: 'Was Sie heute nutzen können',
    title: 'Drei zertifizierte Golden Paths. Eine Factory.',
    oeeCaption:
      'Overall Equipment Effectiveness je Asset und Zeitfenster — Verfügbarkeit × Leistung × Qualität — als Product, nicht als MES-Report.',
    oee: 'OEE Data Product',
    mes: 'MES',
    machine: 'Maschine',
    rest: 'REST',
    mqtt: 'MQTT',
    formula: 'A × P × Q',
    api: 'REST API',
    mqttCard: 'MQTT-Temperatur-Telemetrie wird zum gesteuerten Product mit Contract, Quality Gate und REST-API.',
    restCard: 'Equipment-Zustand per REST als versioniertes Data Product — wiederverwendbar über Linien, kein einmaliger Extract.',
    aasCard: 'Asset Administration Shell (IEC 63278 / IDTA-01001 v3.0) für Asset-Registry, Multi-Source-Ingestion und semantisches Asset-Management.',
    footnote: 'CERTIFIED ist technischer Plattformstatus. Das ist keine GxP-, CSV- oder regulatorische Validierung.',
  },
  learn: {
    eyebrow: 'Wissen',
    title: 'Data Products, in Geschäftssprache',
    sub: 'Ein kurzes Vokabular für Fertigung und IT. Die technische Architektur steht auf der Architecture-Seite.',
    availableToday: 'Heute verfügbar',
    assemblyLabel: 'So werden Data Products aus wiederverwendbaren Fähigkeiten zusammengesetzt',
    topics: {
      'data-product': {
        title: 'Was ist ein Data Product?',
        summary:
          'Ein verwaltetes Datenangebot mit klarem Owner. Andere Teams finden es, vertrauen ihm und nutzen es — ohne ERP, MES oder LIMS zu verändern.',
      },
      'data-contract': {
        title: 'Was ist ein Data Contract?',
        summary:
          'Die Vereinbarung zu Bedeutung, Qualität und zulässiger Nutzung. Verbraucher verlassen sich auf den Contract, nicht auf informelle Extrakte.',
      },
      ownership: {
        title: 'Ownership',
        summary:
          'Ein Team ist für das Product verantwortlich. Qualität, Änderungen und Support bleiben beim Owner.',
      },
      assembly: {
        title: 'Wie Products zusammengesetzt werden',
        summary:
          'Wiederverwendbare Fähigkeiten werden zu zertifizierten Golden Paths kombiniert. Temperature und Equipment teilen denselben Kern; nur die Quelle ändert sich.',
      },
      'catalog-marketplace': {
        title: 'Katalog vs. Marketplace',
        summary:
          'Der Katalog zeigt, was bereits existiert. Im Marketplace starten Teams einen zertifizierten Golden Path.',
      },
    },
    assemblySteps: [
      'Quellen anbinden',
      'Contract und Qualität anwenden',
      'Data Product veröffentlichen',
    ],
  },
  pricing: {
    eyebrow: 'So starten Sie',
    title: 'Template, Platform oder SaaS',
    sub: 'Starten Sie mit zertifizierten Templates im kontrollierten Pilot. Ergänzen Sie die Control Plane, wenn die Factory in Ihre Cloud soll. SaaS ist ein zukünftiges Angebot und heute nicht verfügbar.',
    customerHosted: 'Kundenbetrieben',
    managed: 'Verwaltet',
    includes: 'Enthalten:',
    everythingIn: name => `Alles in ${name}, plus:`,
    contact: 'Kontaktieren Sie uns für Enterprise-Preise.',
    contactNote:
      'Keine öffentliche Preisliste. Ausgelegt für künftige AWS-Marketplace-Distribution. Kein Live-Listing und kein Checkout in diesem Release.',
    editions: {
      template: {
        bestFor: 'Ideal für Teams mit bestehender Engineering-Plattform',
        priceLabel: 'Pro Template',
        priceHint: 'Lizenz oder Abo',
        cta: 'Templates ansehen',
        includes: [
          'Zertifizierte Templates',
          'Data Contracts',
          'Quality Gates',
          'Compatibility Checks',
          'CI/CD',
          'Docker',
          'TechDocs',
        ],
      },
      platform: {
        bestFor: 'Ideal für Organisationen mit eigener Control Plane',
        priceLabel: 'Lassen Sie uns sprechen',
        priceHint: 'Jährliche Plattformlizenz',
        cta: 'Kontakt aufnehmen',
        includes: [
          'Marketplace',
          'Data Product Catalog',
          'Governance',
          'Search',
          'RBAC',
          'Upgrade Management',
          'Control Plane in der Kunden-Cloud',
        ],
      },
      saas: {
        bestFor: 'Ideal für Organisationen, die Data Product Factory as a Service wollen',
        priceLabel: 'Kommt später',
        priceHint: 'Managed Subscription',
        cta: 'Coming Later',
        includes: [
          'Managed Control Plane',
          'Kundenorganisationen',
          'Customer SSO',
          'Mandantenisolation',
          'Managed Upgrades',
          'Nutzungs- und Entitlement-Management',
          'Operational Monitoring',
        ],
      },
    },
  },
  footer: {
    tagline:
      'DIE OFFENE MANUFACTURING-PLATTFORM FÜR LIFE SCIENCES. Technische Zertifizierung ist nur Plattformstatus. Sie ist keine GxP- oder regulatorische Validierung.',
    note: 'Control Plane für eine Organisation. SaaS-Mandantenfähigkeit ist Zukunft.',
  },
  overview: {
    eyebrow: 'VOM PRINZIP ZUR ARCHITEKTUR',
    title: 'So arbeitet Nexora',
    body: 'Nexora schafft eine gesteuerte Engineering-Schicht zum Bauen, Betreiben und Finden von Data Products rund um bestehende ERP-, MES-, LIMS-, EWM-, Historian-, CMO- und andere IT/OT-Plattformen.',
    cta: 'Architektur ansehen',
    concepts: {
      'standard-core': {
        title: 'STANDARDISIERTER KERN',
        body: 'Bestehende operative Plattformen bleiben stabil und nah am Standard.',
      },
      'governed-integration': {
        title: 'GESTEUERTE INTEGRATION',
        body: 'APIs, Events, MQTT, REST und Streams liefern kontrollierte Schnittstellen zu Betriebsdaten.',
      },
      'independent-data-products': {
        title: 'UNABHÄNGIGE DATA PRODUCTS',
        body: 'Data Products entwickeln sich unabhängig mit Contracts, Quality Gates, Compatibility, CI/CD, Catalog und Governance.',
      },
    },
  },
  principle: {
    eyebrow: 'So fügt es sich zusammen',
    title: 'Von stabilen Kernsystemen zu gesteuerten Data Products.',
    body1:
      'Halten Sie ERP, MES, LIMS, EWM, CMO-Plattformen und andere IT/OT-Systeme stabil und nah am Standard.',
    body2:
      'Nexora ergänzt eine gesteuerte digitale Schicht um diese Systeme: Assets werden semantisch beschrieben, Betriebsdaten fließen über gesteuerte Schnittstellen, wiederverwendbare Komponenten liefern technische Fähigkeiten, und Golden Paths machen daraus unabhängig evolvierende Data Products.',
    finale: 'Kernsysteme standardisiert halten.\nDigitale Fähigkeiten kombinieren.\nGesteuerte Data Products liefern.',
    benefits: [
      'Weniger unnötige Kernanpassungen',
      'Digitale Innovation vom Core-Release-Zyklus entkoppeln',
      'Schnellerer Nutzen',
      'Gesteuerte Data Products',
      'Unabhängige Versionierung',
      'Wiederverwendbare Fähigkeiten',
    ],
    certified: 'Zertifiziert',
    illustrative: 'Beispielhaft',
    vizLabel: 'Kernsysteme standardisiert halten und über Data Products innovieren',
    layerStandard: 'Standard-Systeme',
    layerStable: 'Standardisiertes, stabiles IT/OT-Kernsystem',
    layerInterfaces: 'Gesteuerte Schnittstellen',
    layerProducts: 'Data Products',
    sectionLabel: 'Architekturprinzip',
    benefitsLabel: 'Architekturnutzen',
    srOnly:
      'Systeme of Record bleiben ERP, MES, LIMS, EWM, Historian, CMO-Plattformen, PLC, SCADA und andere IT/OT. AAS erklärt, was ein Asset ist und was seine Daten bedeuten. Unified Namespace steuert, wo Betriebsdaten fließen. Zertifizierte Platform Components liefern wiederverwendbare Fähigkeiten. Golden Paths kombinieren sie zu unabhängig evolvierenden Data Products. Nexora ist die Control Plane. Sie ersetzt keine Quellsysteme, speichert keine Zeitreihen in AAS und verarbeitet nicht alle Betriebsdaten.',
    mapsTo: 'entspricht',
    dataProductKind: 'Data Product',
    layers: {
      standard: 'Standard-Systeme',
      aas: 'Asset Administration / AAS',
      uns: 'Unified Namespace',
      components: 'Platform Components',
      goldenPaths: 'Golden Paths',
      products: 'Data Products',
      factory: 'Nexora',
    },
    captions: {
      stableCore: 'Standardisiertes, stabiles IT/OT-Kernsystem',
      systemsOfRecord: 'Systems of Record bleiben stabil und nah am Standard.',
      aas: 'AAS erklärt, was ein Asset ist und was seine Daten bedeuten. AAS speichert keine Zeitreihenwerte.',
      uns: 'UNS steuert, wo und wie Betriebsdaten fließen. AAS = Bedeutung. UNS = Datenfluss.',
      goldenCompose: 'Golden Paths kombinieren zertifizierte Fähigkeiten',
      goldenExamples:
        'Offizielle Beispiele heute: MQTT Temperature, REST Equipment und OEE Data Product. Cold Chain, Quality, Energy und AI Assistant sind Zukunft.',
      dataProduct:
        'Ein Data Product enthält Geschäftswert und kann unabhängig vom operativen Kern evolvieren.',
      controlPlane:
        'Die Control Plane steuert, wie Data Products gebaut, freigegeben, gefunden und betrieben werden. Sie verarbeitet nicht alle Betriebsdaten.',
    },
  },
  storyCta: {
    primary: 'Plattformarchitektur erkunden',
    secondary: 'Golden Paths erkunden',
  },
  platform: {
    eyebrow: 'Plattformnutzen',
    title: 'Sechs Fähigkeiten für gesteuerte Data Products',
    sub: 'Eine kohärente kommerzielle Control Plane — kein Standard-Backstage-Portal.',
    groupTitle: 'Kernfunktionen',
    kind: 'Plattformfähigkeit',
    badge: 'Kernfunktion',
    explore: 'Ansehen',
    capabilities: {
      connect: {
        title: 'VERBINDEN',
        text: 'Operative und unternehmensweite Datenquellen anbinden.',
      },
      create: {
        title: 'ERSTELLEN',
        text: 'Standardisierte Data Products über zertifizierte Golden Paths erzeugen.',
      },
      trust: {
        title: 'VERTRAUEN',
        text: 'Versionierte Contracts, Quality Gates und Compatibility Checks.',
      },
      govern: {
        title: 'STEUERN',
        text: 'Ownership, RBAC, technische Zertifizierung und Lifecycle-Governance.',
      },
      discover: {
        title: 'FINDEN',
        text: 'Katalog, Search, TechDocs und Marketplace.',
      },
      operate: {
        title: 'BETREIBEN',
        text: 'CI/CD, Versionierung, Compliance-Status und Upgrade Management.',
      },
    },
  },
  howItWorks: {
    eyebrow: 'So funktioniert es',
    title: 'Von den Anlagensystemen zum nutzbaren Product',
    sub: 'Drei Schritte. Keine Platform-Abteilung nötig.',
    journey: 'Product-Pfad',
    steps: ['Kern halten', 'Product erzeugen', 'Contract nutzen'],
    sentences: [
      'ERP, MES, LIMS und EWM bleiben Systeme of Record. Nexora ersetzt sie nicht und liest ihre Datenbanken nicht.',
      'Ein zertifizierter Golden Path erzeugt Repository, Contract, Tests, Docker-Image und Katalogeintrag.',
      'Anwendungen binden sich an eine versionierte API — nicht an einen einmaligen Extract oder MES-Customizing.',
    ],
  },
  goldenPaths: {
    eyebrow: 'Golden Path Showcase',
    title: 'Zertifizierte Golden Paths für die Fertigung',
    sub: 'CERTIFIED bedeutet nur technische Plattformzertifizierung. Das ist keine GxP- oder regulatorische Validierung.',
    certifiedGroup: 'Zertifizierte Templates',
    plannedTitle: 'Geplante / zukünftige Golden Paths',
    plannedSub:
      'Diese Beispiele sind nicht implementiert und im aktuellen MVP nicht verfügbar.',
    kindCertified: 'Golden-Path-Template',
    kindPlanned: 'Geplantes Template',
    explore: 'Ansehen',
    unavailable: 'Nicht verfügbar',
    problemLabel: 'Warum es ein eigenes Product ist',
    logicLabel: 'So arbeitet der Pfad',
    definitionLabel: 'Was es ist',
    factorsLabel: 'Verfügbarkeit × Leistung × Qualität',
    useCasesLabel: 'Typischer Einsatz in der Anlage',
    byProvider: 'von Nexora',
    heading: 'Golden Paths',
    searchPlaceholder: 'Golden Paths suchen...',
    categoryFilter: 'Kategoriefilter',
    categoryAll: 'Alle',
    empty: 'Keine Golden Paths passen zu Suche oder Kategorie.',
    plannedNote:
      'Spezifiziert, damit Fertigungs- und Digital-Teams planen können. Heute nicht erzeugt, keine Live-Anbindung, nicht in Create verfügbar.',
    lossLabel: 'Verlustanalyse',
    statusIn10: 'IN 1.0',
    statusFoundation: 'FUNDAMENT',
    statusPlanned: 'GEPLANT',
    categoryLabels: {
      Telemetry: 'Telemetrie',
      Equipment: 'Equipment',
      Performance: 'Performance',
      Integration: 'Integration',
    },
    visuals: {
      'mqtt-temperature': {
        label: 'Sensortemperatur läuft über MQTT in ein versioniertes Data Product',
        from: 'Sensor',
        via: 'MQTT',
        to: 'Product',
      },
      'rest-equipment': {
        label: 'Equipment-Zustand wird per REST abgefragt und als stabile equipmentId veröffentlicht',
        from: 'Equipment',
        via: 'REST',
        to: 'Identität',
      },
      oee: {
        label: 'OEE ist Verfügbarkeit mal Leistung mal Qualität für ein Asset und ein Zeitfenster',
        from: 'V',
        via: 'L',
        to: 'Q',
      },
      snowflake: {
        label: 'Zertifizierte Plant-Contracts würden als versionierte Tabellen in Snowflake landen',
        from: 'Product',
        via: 'Load',
        to: 'Warehouse',
      },
      sap: {
        label: 'Ausgewählte SAP-Objekte würden ohne Tabellenlesung zum versionierten Data Product',
        from: 'SAP',
        via: 'Adapter',
        to: 'Product',
      },
      'cold-chain': {
        label: 'Kammer- oder Sendungstemperatur bleibt im deklarierten Band, sonst erscheint eine Exkursion',
        from: 'Kammer',
        via: 'Band',
        to: 'Integrität',
      },
      'aas-data-product': {
        label: 'Asset Administration Shell bringt semantische Bedeutung zur Ausrüstung, dann fließen Daten zu Products',
        from: 'Ausrüstung',
        via: 'AAS',
        to: 'Products',
      },
    },
    items: {
      'mqtt-temperature': {
        description:
          'Versioniertes Temperatur-Product aus MQTT-Telemetrie — Contract, Quality Gate und REST-API, unabhängig vom Broker.',
        definition:
          'Temperaturwerte von Linien- oder Utility-Sensoren werden zum gesteuerten Data Product: ein Contract, eine Zeitreihe, eine REST-API. Verbraucher nutzen das Product, nicht das MQTT-Topic oder einen Historian-Extract.',
        problem:
          'Temperatur bleibt in Brokern, Historians oder Einmalskripten. Jede Linie baut den Ingest neu. Dashboards haben keinen stabilen Contract und kein Quality Gate.',
        logic:
          'Der erzeugte Service abonniert ein konfiguriertes MQTT-Topic, prüft temperature-event 1.1.0, speichert eine gesteuerte Zeitreihe und stellt REST, Health, Tests, Docker und Katalog bereit. Er läuft ohne Control Plane.',
        useCases: [
          'Temperatur an Abfüll- oder Packlinien als wiederverwendbares Product',
          'Raum- oder Utility-Sensoren mit versionierter API für Betriebs-Dashboards',
          'Gesteuerter Feed, den Analytics später nutzen — ohne MES zu ändern',
        ],
      },
      'rest-equipment': {
        description:
          'Kanonische Equipment-Identität und Zustand per REST — eine equipmentId, die Linien, Dashboards und OEE teilen können.',
        definition:
          'Equipment ist ein eigenständiges Product: stabile equipmentId, aktueller Zustand und Ortskontext über einen versionierten REST-Contract. Darauf können andere Products, einschließlich OEE, aufbauen.',
        problem:
          'Identität und Zustand liegen in MES-Masken oder Ad-hoc-Endpunkten. Jeder Verbraucher schreibt einen weiteren Poller. Namen, IDs und Qualität driften von Linie zu Linie.',
        logic:
          'Der erzeugte Service fragt eine gesteuerte REST-Quelle (oder den lokalen Mock) ab, prüft equipment-event 1.0.0, upsertet eindeutige equipmentId-Sätze und liefert eine Product-API mit CI, TechDocs und Katalog.',
        useCases: [
          'Gemeinsames Equipment-Register für Pack- und Abfülllinien',
          'Maschinenzustand für Betriebsansichten ohne MES-Customizing',
          'Stabile Identität, die ein OEE-Product mit Produktionskontext verknüpfen kann',
        ],
      },
      oee: {
        description:
          'Overall Equipment Effectiveness für ein Asset und ein Zeitfenster: Verfügbarkeit × Leistung × Qualität, als Contract veröffentlicht — MES bleibt System of Record.',
        definition:
          'OEE (Overall Equipment Effectiveness) beantwortet eine Frage für ein benanntes Asset, zum Beispiel filler-01: Von der Zeit, die für Produktion vorgesehen war — wie wirksam hat diese Anlage Gutteile in der vorgesehenen Kadenz geliefert? Ein Ergebnis gilt immer für eine equipmentId und ein explizites Intervall — Stunde, Schicht, Auftrag oder ein frei gewählter Bereich. Das ist keine Werks-Aggregation, kein MES-Report und kein GxP-Anspruch.',
        factors: [
          {
            name: 'Verfügbarkeit',
            meaning:
              'Von der geplanten Produktionszeit im Fenster: wie lange lief die Anlage tatsächlich? Geplante Stillstände und unbeobachtete Zeit werden ausgeschlossen; sie gelten nicht als ungeplante Stops.',
          },
          {
            name: 'Leistung',
            meaning:
              'Von dieser Laufzeit: wie nah lag der Ausstoß am Idealzyklus aus dem Produktionskontext (Sekunden pro Stück)? Langsame Zyklen senken die Leistung, nicht die Verfügbarkeit.',
          },
          {
            name: 'Qualität',
            meaning:
              'Von den gezählten Einheiten im Fenster: wie viele waren gut, wie viele Ausschuss? OEE ist das Produkt der drei Verhältnisse. Fehlende Inputs ergeben einen ausgewiesenen Berechnungsstatus, keine geschätzte Zahl.',
          },
        ],
        lossIntro:
          'Dieses Product veröffentlicht Verfügbarkeit × Leistung × Qualität und die Maschinenzustände, die dafür nötig sind. Das ist kein Six-Big-Losses-, SMED- oder GxP-Modell. Die Liste unten ist die Sprache der Anlage. Das Badge auf jeder Karte ist der Scope: IN 1.0 steht heute im Contract. FUNDAMENT hat das Rohsignal. GEPLANT ist spezifiziert zum Planen — es ändert die Formeln nicht und ist nicht in Create.',
        lossFeatures: [
          {
            name: 'Microstops',
            status: 'planned',
            meaning:
              'Sehr kurze Stopps automatisch erkennen, typisch 2–30 Sekunden. STOPPED und IDLE sind ungeplante Verfügbarkeitsverluste ohne Dauerklasse. Ein späterer optionaler Schwellwert wäre kompatible Konfiguration, keine Formeländerung.',
          },
          {
            name: 'Stop Classification',
            status: 'foundation',
            meaning:
              'Unterscheidet RUNNING, STOPPED, IDLE und MAINTENANCE plus plannedDowntime im Produktionskontext. Benannte Klassen wie Microstop, Downtime, Planned Stop und Changeover sind geplant — keine eigenen Zustände heute.',
          },
          {
            name: 'Reason Codes',
            status: 'foundation',
            meaning:
              'Ein Grund kann schon auf machine-state-event mitlaufen. Er ist nur diagnostisch und ändert A, P oder Q nicht. Ein gesteuerter Katalog (Sensor, Stau, Material fehlt, Operator) ist geplant.',
          },
          {
            name: 'Reason Hierarchy',
            status: 'planned',
            meaning:
              'Eine Struktur wie Packaging → Labeler → Jam → Label stuck. Standort-spezifische MES-Reason-Maps gehören nicht zu diesem Pfad, damit er über Werke wiederverwendbar bleibt.',
          },
          {
            name: 'Automatic Reason Detection',
            status: 'planned',
            meaning:
              'Gründe aus PLC- oder MES-Signalen ableiten statt über Operator-Eingabe. Das Product nimmt Zustand und Zähler entgegen; es leitet kein Standort-Reason-Modell daraus ab.',
          },
          {
            name: 'Manual Reason Assignment',
            status: 'planned',
            meaning:
              'Der Operator ergänzt oder korrigiert den Grund nachträglich. Dieses Product hat keine Shop-Floor-UI und kein Dashboard; Zuweisung wäre ein späteres Product auf dem Contract.',
          },
          {
            name: 'Unknown Losses',
            status: 'foundation',
            meaning:
              'Unbeobachtete Zeit wird ausgeschlossen, damit Stille nicht als Downtime erfunden wird. Ein ausgewiesener „unbekannter Grund“ für klassifizierte Stopps ohne Code ist geplant. Fehlende Daten ergeben calculationStatus, keine geschätzte OEE.',
          },
          {
            name: 'Pareto Analysis',
            status: 'planned',
            meaning:
              'Top-10-Störgründe nach Dauer, Häufigkeit oder Verlustmenge. Das ist ein Analytics-Verbraucher klassifizierter Stopps, nicht die OEE-Zeile. In diesem Release gibt es kein OEE-Dashboard.',
          },
          {
            name: 'Frequency Analysis',
            status: 'planned',
            meaning:
              'Wie oft tritt welcher Fehler im Fenster auf? Dafür braucht es klassifizierte Stopp-Events. Das Product liefert eine OEE-Zeile je Equipment und Intervall, kein Fehlerhistogramm.',
          },
          {
            name: 'Duration Analysis',
            status: 'planned',
            meaning:
              'Wie lange dauern bestimmte Fehler im Mittel? Dieselbe Voraussetzung: klassifizierte Stopps mit Zeitstempeln, nicht allein die A×P×Q-Zeile.',
          },
          {
            name: 'MTBF / MTTR',
            status: 'planned',
            meaning:
              'Mean Time Between Failures und Mean Time To Repair aus klassifizierten Ausfall- und Wiederanlauf-Events. Auf diesem Pfad nicht berechnet. Zuverlässigkeitskennzahlen wären ein späterer Contract, kein stilles Extrafeld auf oee-result.',
          },
          {
            name: 'Speed Loss',
            status: 'foundation',
            meaning:
              'Die Maschine läuft, aber langsamer als der Idealzyklus. Das steckt in der Leistung: (Idealzyklus × Stückzahl) / Laufzeit. Eine benannte Speed-Loss-Klasse ist geplant; Leistung darf über 100 % liegen und wird nicht geklemmt.',
          },
          {
            name: 'Minor Stops',
            status: 'planned',
            meaning:
              'Kleine Unterbrechungen, die die Anlage nicht als klassische Downtime führt. IDLE gilt als ungeplanter Verfügbarkeitsverlust, nicht als Minor-Stop-Klasse. Geht mit Microstops zusammen, sobald eine Dauerregel existiert.',
          },
          {
            name: 'Changeover Loss',
            status: 'foundation',
            meaning:
              'Produkt-, Batch- oder Formatwechsel. plannedDowntime-Arten wie CHANGEOVER können nur informativ geführt werden; sie trennen Verfügbarkeit und Leistung noch nicht. Ein eigener Changeover-/SMED-Bucket ist geplant.',
          },
          {
            name: 'Startup Loss',
            status: 'planned',
            meaning:
              'Verluste beim Hochfahren nach Stopp oder Wechsel. Kein heutiger Zustand. Später klassifizierbar aus RUNNING unter Idealzyklus plus Kontext (Hochfahrfenster), ohne MES umzuschreiben.',
          },
          {
            name: 'Quality Loss',
            status: 'in-1.0',
            meaning:
              'Ausschuss gegenüber Gutteilen im Fenster. Qualität = Gutmenge / Gesamtmenge. Rework als eigener Workflow ist nicht enthalten; Reject-Zähler schon. Das ist keine GxP-Disposition.',
          },
          {
            name: 'Context',
            status: 'foundation',
            meaning:
              'Jedes Ergebnis ist an equipmentId und ein explizites Fenster (Stunde, Schicht, Auftrag, custom) gebunden, mit site/area/line am Produktionskontext. Jeden Verlust mit Maschine, Auftrag, Batch, Produkt und Schicht als Analyse-Korn zu verbinden ist geplant.',
          },
        ],
        problem:
          'OEE wird weiterhin im MES-Customizing, in Historian-Reports oder in Tabellen gerechnet. Die Definition der geplanten Zeit, das Fenster (Stunde, Schicht, Auftrag) und die Formel stecken in einem Linienprojekt. Ein zweiter Filler kopiert die Logik von Hand. Digital- und Qualitätsteams können die Kennzahl nicht unabhängig vom MES versionieren; jedes Dashboard implementiert Verfügbarkeit, Leistung und Qualität erneut.',
        logic:
          'MES bleibt System of Record. Das erzeugte Product liest Produktionskontext per REST — geplantes Intervall, Idealzyklus, Zielmenge, Auftragsidentität — und Maschinen-Events per MQTT: Lauf- oder Stoppzustand, kumulierte Zähler, Qualitätsausschuss. Je equipmentId und Fenster berechnet es Verfügbarkeit × Leistung × Qualität und veröffentlicht oee-result per REST, mit Health, Tests, Docker und Katalog. Direkter Datenbankzugriff auf MES, ERP, LIMS oder EWM ist ausgeschlossen. CERTIFIED heißt: dieser Pfad ist technisch vollständig — das ist keine GxP-Validierung.',
        useCases: [
          'Stündliche OEE an einer Abfüll- oder Packlinie, mit festgelegtem Berechnungsfenster',
          'Schicht- oder Auftrags-OEE für das Betriebsreview, ohne MES-Reports umzuschreiben',
          'Versionierte OEE-API, die BI, LIMS oder ein späteres Dashboard nutzen — MES bleibt Standard',
        ],
      },
      snowflake: {
        description:
          'Gesteuertes Warehouse-Product: zertifizierte Anlagen-Contracts landen in Snowflake als versionierte Tabellen — ohne ein ELT-Skript pro Linie.',
        definition:
          'Snowflake ist der Analytics-Speicher, kein zweites MES. Dieses Golden Path würde ausgewählte Data-Product-Contracts — Temperaturreihen, Equipment-Identität, OEE-Ergebnisse — mit derselben Version und demselben Quality-Status ins Warehouse bringen. MES, ERP, LIMS und EWM bleiben Systeme of Record. In diesem Release gibt es kein Snowflake-Konto, keinen Load und kein Create-Template.',
        problem:
          'Analytics-Teams kopieren Historian-Extracts und MES-Reports ins Warehouse. Das Schema gehört zu einem Linienprojekt. Ändert sich das OEE-Fenster oder die equipmentId, bricht BI. Es gibt keine Contract-Version, kein Quality Gate und keinen Katalogeintrag für das, was gelandet ist.',
        logic:
          'Vorgesehener Pfad, heute nicht erzeugt: zertifizierte Data-Product-API (REST + Contract) nutzen → Felder auf ein Snowflake-Schema abbilden → mit ausgewiesener Version und calculationStatus laden → Warehouse-Objekt im Katalog registrieren. Direkter Datenbankzugriff auf SAP, MES oder LIMS bleibt ausgeschlossen. Create sammelt keine Snowflake-Credentials.',
        useCases: [
          'Linienübergreifende OEE- und Temperaturhistorie im BI-Modell des Standorts',
          'Equipment-Stammdaten für Analytics ohne zweiten Poller ins MES',
          'Versionierter Warehouse-Feed, den QA oder Supply-Chain-Reporting später nutzen kann',
        ],
      },
      sap: {
        description:
          'Ausgewählte SAP-Fertigungs- und Logistikobjekte als versioniertes Data Product — ohne RFC-Wildwuchs und ohne SAP-Tabellen aus dem Product zu lesen.',
        definition:
          'SAP bleibt System of Record für Aufträge, Chargen, Material und Bewegungen. Dieses Golden Path würde einen engen, benannten Contract bereitstellen — etwa Produktionsauftragskontext oder Chargenidentität — den OEE, Qualität oder Warehouse-Products nutzen. Das ist kein SAP-Ersatz, kein vollständiger IDoc-Hub und in diesem Release keine Live-SAP-Anbindung.',
        problem:
          'Jedes Dashboard, jede MES-Schnittstelle und jedes Data Lake inventiert einen weiteren SAP-Extract. Z-Tabellen und undokumentierte RFCs sickern in Linienprojekte. Nach einem SAP-Release bricht jeder Verbraucher einzeln. Digital-Teams können „was wir aus SAP genommen haben“ nicht unabhängig vom Kern versionieren.',
        logic:
          'Vorgesehener Pfad, heute nicht erzeugt: gesteuerter SAP-Adapter (offizielle API oder Event, kein Datenbankzugriff) → versionierten Contract prüfen → nach stabilem Business Key upserten → REST-Product mit Health, Tests, Docker und Katalog. Kein RFC-Hardcoding im erzeugten Service, keine SAP-GUI-Automation, kein Live-System in diesem MVP.',
        useCases: [
          'Produktionsauftragskontext (Idealzyklus, Zielmenge, geplantes Intervall) für OEE',
          'Chargen- oder Materialidentität, die ein späteres Qualitäts-Product verknüpfen kann',
          'Warenbewegungen für Equipment-Use oder Inventar — SAP bleibt Standard',
        ],
      },
      'cold-chain': {
        description:
          'Temperaturintegrität für Lager und Transport: deklariertes Band, Exkursions-Events und Zeitreihe als Contract — kein Logger-PDF.',
        definition:
          'Cold Chain ist ein Temperaturintegritäts-Product für eine benannte Lagereinheit oder Sendungsstrecke. Es beantwortet, ob das Asset in einem erlaubten Temperaturband geblieben ist, und veröffentlicht Exkursions-Events, wenn nicht. Es nutzt die Idee des Temperatur-Ingests, ergänzt um Lane- oder Kammer-Identität und Schwellwertlogik. Das ist keine GxP-Validierung der Kühlkette, kein 21-CFR-Part-11-Anspruch und in diesem Release nicht erzeugt.',
        problem:
          'Nachweise liegen in USB-Loggern, Warehouse-Masken und PDF-Anhängen. QA kann keine versionierte Exkursions-API abonnieren. Jedes Depot kopiert Alarmlogik. Wird eine Sendung hinterfragt, rekonstruiert das Team die Reihe von Hand statt einen Contract zu lesen.',
        logic:
          'Vorgesehener Pfad, heute nicht erzeugt: Sensor- oder Loggerwerte plus Sendungs- oder Kammeridentität → Temperaturband-Contract prüfen → gesteuerte Zeitreihe speichern → Exkursions-Events und REST-Ergebnis für das Intervall. Baut auf dem zertifizierten Temperatur-Ingest auf (Contract, Quality Gate, Katalog). Keine Live-Logger-Anbindung und kein Create-Template in diesem MVP.',
        useCases: [
          'Kühl- oder Tiefkühlkammer im Lager gegen ein deklariertes Band',
          'Sendungsstrecke Werk–Depot mit Exkursions-Events für die spätere Prüfung',
          'Gesteuerter Feed, den ein späteres Qualitäts-Product nutzen kann — ohne Logger-Dateien',
        ],
      },
      'aas-data-product': {
        description:
          'Asset Administration Shell (IEC 63278 / IDTA-01001 v3.0) für Asset-Register, Multi-Source-Ingest und semantische Asset-Verwaltung.',
        definition:
          'AAS Asset Administration Shell ist eine standardisierte digitale Darstellung von Industrieanlagen (Ausrüstungen, Komponenten, Einrichtungen) gemäß IEC 63278-1:2024 und IDTA-01001 v3.0-Metamodell. Der Golden Path erzeugt einen zertifizierten Asset-Registry-Service, der Asset-Events aus MQTT, REST oder Dateien aufnimmt, gegen einen Contract validiert und eine gesteuerte REST-API für Asset-Suche, Submodel-Management und Qualitätssicherung bereitstellt.',
        problem:
          'Asset-Metadaten liegen in separaten Systemen: MES, ERP, Wartungsplattformen und Tabellen. Teams können keine versionierte Asset-Identity-API abonnieren. Jeder Verbraucher baut oder dupliziert Asset-Kontext. Wenn Anlagen wechseln oder ausscheiden, propagieren Änderungen separat zu jedem System.',
        logic:
          'Der erzeugte Service verbraucht Asset-Event-Contracts aus konfigurierten Quellen (MQTT-Topics, REST-Endpunkte, Datei-Uploads) → validiert IDTA-01001-v3.0-Submodel-Compliance → speichert Assets mit vollem Submodel-Element-Support → stellt eine gesteuerte REST-Product-API mit Health Checks, Observability, Tests, Docker und Katalog bereit. Er läuft unabhängig vom Control Plane und kann als Platform-Component für nachgelagerte Data Products dienen.',
        useCases: [
          'Zentrales Asset-Register für Produktionslinien, Ausrüstungen und Komponenten',
          'Semantische Asset-Anreicherung für OEE-, Temperatur- und Equipment-Products',
          'Governance und Versionierung der Asset-Identität über mehrere Werke hinweg',
        ],
      },
    },
  },
  finalCta: {
    title: 'Wählen Sie Ihren Weg.',
    sub: 'Nexora nutzen, auf Nexora bauen, auf Nexora publizieren oder Partner von Nexora werden — jeder Weg beginnt auf derselben offenen Manufacturing-Plattform.',
    paths: [
      { label: 'Nexora nutzen', href: '#journey' },
      { label: 'Auf Nexora bauen', href: '#build' },
      { label: 'Auf Nexora publizieren', href: '#marketplace' },
      { label: 'Partner werden', href: '#enterprise' },
    ],
  },
  consent: {
    title: 'Cookie-Einstellungen',
    body: 'Wir verwenden Cookies, um Ihnen die bestmögliche Erfahrung auf unserer Website zu bieten. Sie können Ihre Einstellungen jederzeit anpassen.',
    privacy: 'Datenschutzerklärung',
    close: 'Schließen',
    necessaryTitle: 'Notwendig',
    necessaryBody:
      'Diese Cookies sind für die Grundfunktionen der Website erforderlich und können nicht deaktiviert werden.',
    necessaryBadge: 'Immer aktiv',
    analyticsTitle: 'Analyse',
    analyticsBody:
      'Diese Cookies helfen uns zu verstehen, wie Besucher mit der Website interagieren.',
    marketingTitle: 'Marketing',
    marketingBody:
      'Diese Cookies werden verwendet, um Werbung relevanter für Sie zu gestalten.',
    acceptAll: 'Alle akzeptieren',
    necessaryOnly: 'Nur notwendige',
    savePreferences: 'Auswahl speichern',
  },
};

export const landingCopy: Record<LandingLocaleId, LandingCopy> = { en, de };

function isLocale(value: string | null): value is LandingLocaleId {
  return value === 'en' || value === 'de';
}

export function readStoredLandingLocale(): LandingLocaleId {
  if (typeof window === 'undefined') {
    return 'en';
  }
  try {
    const stored = window.localStorage.getItem(LANDING_LOCALE_STORAGE_KEY);
    if (isLocale(stored)) {
      return stored;
    }
  } catch {
    // ignore storage failures
  }
  return 'en';
}

interface LandingI18nValue {
  locale: LandingLocaleId;
  setLocale: (locale: LandingLocaleId) => void;
  t: LandingCopy;
}

const LandingI18nContext = createContext<LandingI18nValue | null>(null);

export function LandingI18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LandingLocaleId>(readStoredLandingLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    try {
      window.localStorage.setItem(LANDING_LOCALE_STORAGE_KEY, locale);
    } catch {
      // ignore storage failures
    }
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale: setLocaleState,
      t: landingCopy[locale],
    }),
    [locale],
  );

  return (
    <LandingI18nContext.Provider value={value}>{children}</LandingI18nContext.Provider>
  );
}

export function useLandingI18n(): LandingI18nValue {
  const context = useContext(LandingI18nContext);
  if (!context) {
    return {
      locale: 'en',
      setLocale: () => undefined,
      t: landingCopy.en,
    };
  }
  return context;
}
