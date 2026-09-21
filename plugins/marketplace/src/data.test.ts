import { DataProduct } from '@internal/plugin-data-products';
import {
  MARKETPLACE_CATEGORY_KINDS,
  goldenPathDocumentationHref,
  builtWithSummary,
  toRelatedPlatformComponents,
} from '@internal/platform-common';
import { marketplaceCatalogSources } from './catalog';
import {
  MARKETPLACE_CATEGORIES,
  MarketplaceItem,
  enrichMarketplaceItem,
  filterMarketplaceItems,
  goldenPathCreateHighlights,
  marketplaceCreateAllowed,
  marketplaceOfferingKind,
} from './data';

const catalogProduct: DataProduct = {
  name: 'sample-mqtt-temperature-product',
  title: 'MQTT Temperature Data Product',
  description: 'MQTT temperature events',
  owner: 'group:default/platform-team',
  version: '1.0.0',
  lifecycle: 'experimental',
  domain: 'manufacturing',
  sourceSystems: ['mqtt'],
  interfaces: ['REST'],
  apis: ['temperature-event'],
  dataContracts: [],
  dataContractVersion: '1.1.0',
  qualityStatus: 'TESTED',
  requiredChecks: [],
  providesContract: 'temperature-event',
  compatibleVersions: [],
  dependsOn: [],
  usedBy: [],
  compatibilityStatus: 'COMPATIBLE',
  dependencies: [],
  certificationStatus: 'DEVELOPMENT',
  entityRef: 'component:default/sample-mqtt-temperature-product',
};

/**
 * A representative set of offerings, the same shape and content the
 * (now-deleted) `marketplaceItems` array held, for exercising the pure
 * functions in `data.ts` against fixtures rather than live registry content.
 *
 * The registry, not this list, is the source of Marketplace offerings now —
 * see `offeringSource.ts` — so this is test data only, and it is not sorted,
 * filtered, or shipped to a consumer.
 */
const items: MarketplaceItem[] = [
  {
    id: 'python-microservice',
    name: 'Python Microservice',
    category: 'Templates',
    version: '1.0.0',
    description:
      'General service template (FastAPI). Not an official Data Product Golden Path.',
    provider: 'Nexora',
    compatibility: 'Python 3.12+, Docker, GitHub',
    status: 'available',
    certificationStatus: 'TESTED',
    documentation: '/create/templates/default/python-microservice',
    templateReference: 'template:default/python-microservice',
  },
  {
    id: 'nodejs-microservice',
    name: 'Node.js Microservice',
    category: 'Templates',
    version: '1.0.0',
    description:
      'TypeScript Express microservice with Vitest, ESLint, Docker, and GitHub Actions.',
    provider: 'Nexora',
    compatibility: 'Node.js 20+, Docker, GitHub',
    status: 'available',
    certificationStatus: 'TESTED',
    documentation: '/create/templates/default/nodejs-microservice',
    templateReference: 'template:default/nodejs-microservice',
  },
  {
    id: 'mqtt-data-connector',
    name: 'MQTT Connector',
    category: 'Connectors',
    version: '1.0.0',
    description:
      'Demonstration MQTT connector with environment-based broker configuration.',
    provider: 'Nexora',
    compatibility: 'Python 3.12+, MQTT 3.1.1, Docker',
    status: 'available',
    certificationStatus: 'DEVELOPMENT',
    documentation: '/create/templates/default/mqtt-data-connector',
    templateReference: 'template:default/mqtt-data-connector',
  },
  {
    id: 'mqtt-temperature-data-product',
    name: 'MQTT Temperature Data Product',
    category: 'Data Products',
    version: '1.0.0',
    description:
      'MQTT temperature data product with a versioned temperature-event contract.',
    provider: 'Nexora',
    compatibility: 'Python 3.12+, MQTT 3.1.1, Docker',
    status: 'available',
    certificationStatus: 'DEVELOPMENT',
    documentation: '/create/templates/default/mqtt-temperature-data-product',
    templateReference: 'template:default/mqtt-temperature-data-product',
  },
  {
    id: 'rest-equipment-data-product',
    name: 'REST Equipment Data Product',
    category: 'Data Products',
    version: '1.0.0',
    description:
      'REST equipment data product with a versioned equipment-event contract.',
    provider: 'Nexora',
    compatibility: 'Python 3.12+, REST, Docker',
    status: 'available',
    certificationStatus: 'DEVELOPMENT',
    documentation: '/create/templates/default/rest-equipment-data-product',
    templateReference: 'template:default/rest-equipment-data-product',
  },
  {
    id: 'unified-namespace',
    name: 'Unified Namespace',
    category: 'Platform Components',
    version: '1.0.0',
    description:
      'Reusable MQTT Unified Namespace. Platform component, not a Data Product.',
    provider: 'Nexora',
    compatibility: 'Python 3.12+, MQTT 3.1.1, Docker',
    status: 'available',
    certificationStatus: 'DEVELOPMENT',
    documentation: '/create/templates/default/unified-namespace',
    templateReference: 'template:default/unified-namespace',
    catalogEntityRef: 'component:default/unified-namespace',
  },
  {
    id: 'aas-foundation',
    name: 'Asset Administration Shell',
    category: 'Platform Components',
    version: '1.0.0',
    description:
      'AAS Foundation prototype for asset and sensor semantics. Platform component, not a Data Product. Control Plane persistence is in-memory.',
    provider: 'Nexora',
    compatibility: 'Python 3.12+, SQLite, REST',
    status: 'preview',
    certificationStatus: 'DEVELOPMENT',
    documentation: '/docs/default/component/data-product-platform/aas/index',
    templateReference: 'template:default/aas-asset',
    catalogEntityRef: 'component:default/aas-foundation',
  },
  {
    id: 'machine-state-consumer-data-product',
    name: 'Machine State Consumer Data Product',
    category: 'Data Products',
    version: '1.0.0',
    description:
      'Composition / reference proof that consumes machine-state events from Unified Namespace. Not an official RELEASED Data Product Golden Path. Not OEE.',
    provider: 'Nexora',
    compatibility: 'Python 3.12+, MQTT, Docker, Unified Namespace',
    status: 'available',
    certificationStatus: 'DEVELOPMENT',
    documentation:
      '/create/templates/default/machine-state-consumer-data-product',
    templateReference: 'template:default/machine-state-consumer-data-product',
    catalogEntityRef: 'component:default/sample-machine-state-consumer',
    contractApiRef:
      'api:default/sample-machine-state-consumer--machine-state-event',
  },
  {
    id: 'aas-data-product',
    name: 'AAS Asset Administration Shell Data Product',
    category: 'Data Products',
    version: '1.0.0',
    description:
      'Asset Administration Shell (IEC 63278 / IDTA-01001 v3.0) for asset registry, multi-source ingestion (MQTT/REST), and semantic asset management. Technical CERTIFIED; asset-event-v1.0.0 data contract.',
    provider: 'Nexora',
    compatibility: 'Python 3.12+, MQTT, REST, Docker, BaSyx SDK',
    status: 'available',
    certificationStatus: 'CERTIFIED',
    documentation: '/create/templates/default/aas-data-product',
    templateReference: 'template:default/aas-data-product',
  },
  {
    id: 'oee-data-product',
    name: 'OEE Data Product',
    category: 'Data Products',
    version: '1.0.0',
    description:
      'Overall Equipment Effectiveness for one equipment and time window. Availability × Performance × Quality from MES production context (REST) and machine events (MQTT). Published as oee-result 1.0.0. Technical CERTIFIED only; not GxP validated.',
    provider: 'Nexora',
    compatibility: 'Python 3.12+, MQTT, REST, Docker, Wave 1 components',
    status: 'available',
    certificationStatus: 'CERTIFIED',
    documentation: '/create/templates/default/oee-data-product',
    templateReference: 'template:default/oee-data-product',
  },
  {
    id: 'rest-api-connector',
    name: 'REST API Connector',
    category: 'Connectors',
    version: '0.1.0',
    description:
      'Reusable REST ingest building block: poll a governed HTTP source, validate a contract, and feed Data Products. Template not generated in this release; REST Equipment already proves the pattern.',
    provider: 'Nexora',
    compatibility: 'HTTP APIs',
    status: 'preview',
    certificationStatus: 'DEVELOPMENT',
    documentation: '/docs/marketplace',
  },
  {
    id: 'snowflake-connector',
    name: 'Snowflake Connector',
    category: 'Connectors',
    version: '0.1.0',
    description:
      'Warehouse product: certified plant contracts (temperature, equipment, OEE) would land in Snowflake as versioned tables. No live Snowflake connectivity and no Create template in this release.',
    provider: 'Nexora',
    compatibility: 'Future release',
    status: 'preview',
    certificationStatus: 'DEVELOPMENT',
    documentation: '/docs/marketplace',
  },
];

describe('marketplace data', () => {
  it('includes the required MVP entries and categories', () => {
    expect(MARKETPLACE_CATEGORIES).toEqual([
      'Templates',
      'Connectors',
      'Data Products',
      'Platform Components',
      'Solutions',
    ]);
    expect(items.map(item => item.name)).toEqual(
      expect.arrayContaining([
        'Python Microservice',
        'Node.js Microservice',
        'MQTT Connector',
        'MQTT Temperature Data Product',
        'REST Equipment Data Product',
        'OEE Data Product',
        'Unified Namespace',
        'Machine State Consumer Data Product',
        'REST API Connector',
        'Snowflake Connector',
      ]),
    );
  });

  it('maps every category an offering actually declares', () => {
    const used = [...new Set(items.map(item => item.category))];
    const unmapped = used.filter(
      category => !MARKETPLACE_CATEGORY_KINDS[category],
    );
    expect(unmapped).toEqual([]);
  });

  it('records the categories that have no registry kind yet', () => {
    // "Solutions" is a Marketplace shelf with no Artifact kind behind it, and
    // no offering uses it. Naming the gap here keeps it a known, deliberate
    // hole rather than something discovered when the first Solution appears.
    const unmapped = MARKETPLACE_CATEGORIES.filter(
      category => !MARKETPLACE_CATEGORY_KINDS[category],
    );
    expect(unmapped).toEqual(['Solutions']);
  });

  it('keeps every item commercially complete', () => {
    for (const item of items) {
      expect(item.name).toBeTruthy();
      expect(item.category).toBeTruthy();
      expect(item.version).toBeTruthy();
      expect(item.description).toBeTruthy();
      expect(item.provider).toBe('Nexora');
      expect(item.compatibility).toBeTruthy();
      expect(['available', 'preview']).toContain(item.status);
      expect(['DEVELOPMENT', 'TESTED', 'CERTIFIED']).toContain(
        item.certificationStatus,
      );
      expect(item.documentation).toBeTruthy();
    }
  });

  it('does not duplicate contract metadata on static marketplace items', () => {
    const mqtt = items.find(
      item => item.id === 'mqtt-temperature-data-product',
    );
    expect(mqtt?.catalogEntityRef).toBeUndefined();
    expect(mqtt?.contractApiRef).toBeUndefined();
    expect(mqtt?.contractName).toBeUndefined();
    expect(mqtt?.contractVersion).toBeUndefined();
    expect(mqtt?.qualityStatus).toBeUndefined();
    expect(mqtt?.templateVersion).toBeUndefined();
    expect(mqtt?.dataProductStandardVersion).toBeUndefined();
    expect(mqtt?.dataProductSdkVersion).toBeUndefined();

    const equipment = items.find(
      item => item.id === 'rest-equipment-data-product',
    );
    expect(equipment?.catalogEntityRef).toBeUndefined();
    expect(equipment?.contractApiRef).toBeUndefined();
    expect(equipment?.contractName).toBeUndefined();
    expect(equipment?.contractVersion).toBeUndefined();
    expect(equipment?.qualityStatus).toBeUndefined();
    expect(equipment?.templateVersion).toBeUndefined();
    expect(equipment?.dataProductStandardVersion).toBeUndefined();
    expect(equipment?.dataProductSdkVersion).toBeUndefined();
  });

  it('reads contract, quality, versions, and template certification from Catalog', () => {
    const mqtt = items.find(
      item => item.id === 'mqtt-temperature-data-product',
    );
    const mqttProduct: DataProduct = {
      ...catalogProduct,
      templateName: 'mqtt-temperature-data-product',
      templateVersion: '1.0.0',
      dataProductStandardVersion: '1.0.0',
      dataProductSdkVersion: '1.0.0',
      contractLogicalName: 'temperature-event',
    };
    const enriched = enrichMarketplaceItem(
      mqtt!,
      [mqttProduct],
      [{ name: 'temperature-event', contractVersion: '1.1.0' }],
      [
        {
          name: 'mqtt-temperature-data-product',
          certificationStatus: 'CERTIFIED',
          templateVersion: '1.0.0',
          dataProductStandardVersion: '1.0.0',
          dataProductSdkVersion: '1.0.0',
        },
      ],
    );
    expect(enriched.contractName).toBe('temperature-event');
    expect(enriched.contractVersion).toBe('1.1.0');
    expect(enriched.qualityStatus).toBe('TESTED');
    expect(enriched.certificationStatus).toBe('CERTIFIED');
    expect(enriched.templateVersion).toBe('1.0.0');
    expect(enriched.dataProductStandardVersion).toBe('1.0.x');
    expect(enriched.dataProductSdkVersion).toBe('1.x');
    expect(enriched.releaseStatus).toBe('RELEASED');
    expect(enriched.version).toBe('1.0.0');

    const equipment = items.find(
      item => item.id === 'rest-equipment-data-product',
    );
    const equipmentProduct: DataProduct = {
      ...catalogProduct,
      name: 'sample-rest-equipment-product',
      title: 'REST Equipment Data Product',
      description: 'REST equipment master data',
      sourceSystems: ['rest'],
      apis: ['equipment-event'],
      dataContractVersion: '1.0.0',
      providesContract: 'equipment-event',
      templateName: 'rest-equipment-data-product',
      entityRef: 'component:default/sample-rest-equipment-product',
    };
    const equipmentEnriched = enrichMarketplaceItem(
      equipment!,
      [equipmentProduct],
      [{ name: 'equipment-event', contractVersion: '1.0.0' }],
    );
    expect(equipmentEnriched.contractName).toBe('equipment-event');
    expect(equipmentEnriched.contractVersion).toBe('1.0.0');
    expect(equipmentEnriched.qualityStatus).toBe('TESTED');
  });

  it('maps Catalog entities into marketplace contract sources', () => {
    const sources = marketplaceCatalogSources([
      {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'API',
        metadata: {
          name: 'temperature-event',
          annotations: {
            'dataprod.platform/contract-version': '1.1.0',
          },
        },
        spec: { type: 'contract' },
      },
    ]);
    expect(sources.apis).toEqual([
      { name: 'temperature-event', contractVersion: '1.1.0' },
    ]);
    expect(sources.templates).toEqual([]);
  });

  it('maps Template entities into marketplace certification sources', () => {
    const sources = marketplaceCatalogSources([
      {
        apiVersion: 'scaffolder.backstage.io/v1beta3',
        kind: 'Template',
        metadata: {
          name: 'mqtt-temperature-data-product',
          annotations: {
            'dataprod.platform/certification-status': 'CERTIFIED',
            'dataprod.platform/templateVersion': '1.0.0',
            'dataprod.platform/dataProductStandardVersion': '1.0.0',
            'dataprod.platform/dataProductSdkVersion': '1.0.0',
          },
        },
        spec: { type: 'data-product' },
      },
    ]);
    expect(sources.templates).toEqual([
      {
        name: 'mqtt-temperature-data-product',
        certificationStatus: 'CERTIFIED',
        templateVersion: '1.0.0',
        dataProductStandardVersion: '1.0.0',
        dataProductSdkVersion: '1.0.0',
      },
    ]);
  });

  it('reads the requirement set a template declares it satisfies', () => {
    const sources = marketplaceCatalogSources([
      {
        apiVersion: 'scaffolder.backstage.io/v1beta3',
        kind: 'Template',
        metadata: {
          name: 'oee-data-product',
          annotations: {
            'dataprod.platform/urs-satisfies': 'URS-EPM',
            'dataprod.platform/urs-requirement-count': '5',
          },
        },
        spec: { type: 'data-product' },
      },
    ]);

    expect(sources.templates[0].ursSatisfies).toBe('URS-EPM');
    expect(sources.templates[0].ursRequirementCount).toBe(5);
  });

  it('drops a requirement count that is not a count', () => {
    // Rendering NaN would read as a defect in the requirements rather than in
    // the annotation, and the entry would look broken to a consumer.
    const sources = marketplaceCatalogSources([
      {
        apiVersion: 'scaffolder.backstage.io/v1beta3',
        kind: 'Template',
        metadata: {
          name: 'oee-data-product',
          annotations: {
            'dataprod.platform/urs-satisfies': 'URS-EPM',
            'dataprod.platform/urs-requirement-count': 'five',
          },
        },
        spec: { type: 'data-product' },
      },
    ]);

    expect(sources.templates[0].ursSatisfies).toBe('URS-EPM');
    expect(sources.templates[0].ursRequirementCount).toBeUndefined();
  });

  it('carries the declared requirement set through enrichment', () => {
    const oee = items.find(item => item.id === 'oee-data-product');
    const enriched = enrichMarketplaceItem(
      oee!,
      [],
      [],
      [
        {
          name: 'oee-data-product',
          ursSatisfies: 'URS-EPM',
          ursRequirementCount: 5,
        },
      ],
    );

    expect(enriched.ursSatisfies).toBe('URS-EPM');
    expect(enriched.ursRequirementCount).toBe(5);
  });

  it('leaves a template that declares no requirement set undeclared', () => {
    // Most templates do not declare one yet. Absence has to stay absence
    // rather than becoming an empty claim.
    const python = items.find(item => item.id === 'python-microservice');
    const enriched = enrichMarketplaceItem(
      python!,
      [],
      [],
      [{ name: 'python-microservice' }],
    );

    expect(enriched.ursSatisfies).toBeUndefined();
    expect(enriched.ursRequirementCount).toBeUndefined();
  });

  it('references official templates for available factory items', () => {
    const python = items.find(item => item.id === 'python-microservice');
    expect(python?.templateReference).toBe(
      'template:default/python-microservice',
    );
  });

  it('filters by category and query', () => {
    expect(filterMarketplaceItems(items, '', 'Templates')).toHaveLength(2);
    // Named rather than counted: the count said 4 and went stale when the AAS
    // data product was added, and a bare length does not say which one moved.
    expect(
      filterMarketplaceItems(items, '', 'Data Products').map(
        item => item.id,
      ),
    ).toEqual([
      'mqtt-temperature-data-product',
      'rest-equipment-data-product',
      'machine-state-consumer-data-product',
      'aas-data-product',
      'oee-data-product',
    ]);
    expect(
      filterMarketplaceItems(items, 'mqtt', 'All').map(item => item.id),
    ).toEqual([
      'mqtt-data-connector',
      'mqtt-temperature-data-product',
      'unified-namespace',
      'machine-state-consumer-data-product',
      // Matches on its compatibility string, which lists MQTT.
      'aas-data-product',
      'oee-data-product',
    ]);
    expect(filterMarketplaceItems(items, 'billing')).toHaveLength(0);
  });

  it('lists MQTT Temperature create highlights without Scaffolder terms', () => {
    const mqtt = items.find(
      item => item.id === 'mqtt-temperature-data-product',
    );
    expect(goldenPathCreateHighlights(mqtt!)).toEqual([
      'Certified Golden Path',
      'MQTT',
      'Data Contract',
      'Quality Gate',
      'CI/CD',
      'TechDocs',
    ]);
    expect(goldenPathCreateHighlights(mqtt!).join(' ')).not.toMatch(
      /Scaffolder|Backstage|Entity Ref/i,
    );
  });

  it('lists Machine State Consumer composition-proof highlights', () => {
    const item = items.find(
      entry => entry.id === 'machine-state-consumer-data-product',
    );
    expect(goldenPathCreateHighlights(item!)).toEqual([
      'Composition Proof',
      'Unified Namespace',
      'MQTT',
      'Data Contract',
      'Quality Gate',
      'TechDocs',
    ]);
  });

  it('resolves official Golden Path current RELEASED version from the release catalog', () => {
    const mqtt = enrichMarketplaceItem(
      items.find(item => item.id === 'mqtt-temperature-data-product')!,
    );
    expect(mqtt.version).toBe('1.0.0');
    expect(mqtt.releaseStatus).toBe('RELEASED');
    expect(mqtt.certificationStatus).toBe('CERTIFIED');
    expect(mqtt.distribution).toEqual(['INTERNAL', 'TEMPLATE_EDITION']);
    expect(marketplaceCreateAllowed(mqtt, 'DEVELOPER')).toBe(true);
    expect(marketplaceCreateAllowed(mqtt, 'VIEWER')).toBe(false);
    expect(marketplaceCreateAllowed(mqtt, 'DEVELOPER', false)).toBe(false);
    expect(
      marketplaceCreateAllowed(
        { ...mqtt, commercialStatus: 'PENDING_ACCESS' },
        'DEVELOPER',
        false,
      ),
    ).toBe(false);
    expect(mqtt.commercialStatus).toBe('ENTITLED');
  });

  it('keeps Python Microservice createable without treating it as a RELEASED Golden Path', () => {
    const python = enrichMarketplaceItem(
      items.find(item => item.id === 'python-microservice')!,
    );
    expect(python.releaseStatus).toBeUndefined();
    expect(marketplaceCreateAllowed(python, 'DEVELOPER')).toBe(true);
  });

  it('treats Unified Namespace as a platform component, not a Golden Path', () => {
    const uns = enrichMarketplaceItem(
      items.find(item => item.id === 'unified-namespace')!,
    );
    expect(uns.category).toBe('Platform Components');
    expect(marketplaceOfferingKind(uns)).toBe('BUILDING BLOCK');
    expect(goldenPathCreateHighlights(uns).join(' ')).toMatch(/BUILDING BLOCK/);
    expect(uns.releaseStatus).toBeUndefined();
    expect(marketplaceCreateAllowed(uns, 'DEVELOPER')).toBe(true);
    expect(goldenPathCreateHighlights(uns).join(' ')).toMatch(
      /Platform Component/,
    );
    expect(
      filterMarketplaceItems(items, '', 'Platform Components').map(
        item => item.id,
      ),
    ).toEqual(['unified-namespace', 'aas-foundation']);
  });

  it('shows commercial entitlement status without purchase CTAs', () => {
    const mqtt = enrichMarketplaceItem(
      items.find(item => item.id === 'mqtt-temperature-data-product')!,
    );
    const oee = enrichMarketplaceItem(
      items.find(item => item.id === 'oee-data-product')!,
    );
    expect(mqtt.commercialStatus).toBe('ENTITLED');
    expect(mqtt.commercialCopy).toBe('Available through your organization');
    expect(oee.commercialStatus).toBe('FUTURE');
    expect(oee.commercialCopy).toBe('Commercial availability planned');
    expect(marketplaceCreateAllowed(oee, 'DEVELOPER')).toBe(true);
    const serialized = JSON.stringify({ mqtt, oee });
    expect(serialized).not.toMatch(/Buy now|Purchase|Checkout|Subscribe/i);
  });

  it('resolves certified Golden Path documentation through TechDocs', () => {
    expect(goldenPathDocumentationHref('mqtt-temperature-data-product')).toBe(
      '/docs/default/component/data-product-platform/how-to/mqtt-temperature',
    );
    expect(goldenPathDocumentationHref('rest-equipment-data-product')).toBe(
      '/docs/default/component/data-product-platform/how-to/rest-equipment',
    );
    expect(goldenPathDocumentationHref('oee-data-product')).toBe(
      '/docs/default/component/data-product-platform/how-to/oee',
    );
  });

  it('derives OEE Built With from the Mode A composition', () => {
    const catalog = toRelatedPlatformComponents([
      {
        kind: 'Component',
        metadata: {
          name: 'health',
          title: 'Health',
          annotations: {
            'dataprod.platform/kind': 'platform-component',
            'dataprod.platform/version': '1.0.0',
            'dataprod.platform/category': 'operations',
            'dataprod.platform/certification-status': 'CERTIFIED',
          },
        },
        spec: { type: 'platform-component' },
      },
      {
        kind: 'Component',
        metadata: {
          name: 'observability',
          title: 'Observability',
          annotations: {
            'dataprod.platform/kind': 'platform-component',
            'dataprod.platform/version': '1.0.0',
            'dataprod.platform/category': 'operations',
            'dataprod.platform/certification-status': 'CERTIFIED',
          },
        },
        spec: { type: 'platform-component' },
      },
      {
        kind: 'Component',
        metadata: {
          name: 'mqtt-consumer',
          title: 'MQTT Consumer',
          annotations: {
            'dataprod.platform/kind': 'platform-component',
            'dataprod.platform/version': '1.0.0',
            'dataprod.platform/category': 'integration',
            'dataprod.platform/certification-status': 'CERTIFIED',
          },
        },
        spec: { type: 'platform-component' },
      },
      {
        kind: 'Component',
        metadata: {
          name: 'rest-source',
          title: 'REST Source',
          annotations: {
            'dataprod.platform/kind': 'platform-component',
            'dataprod.platform/version': '1.0.0',
            'dataprod.platform/category': 'integration',
            'dataprod.platform/certification-status': 'CERTIFIED',
          },
        },
        spec: { type: 'platform-component' },
      },
      {
        kind: 'Component',
        metadata: {
          name: 'timeseries',
          title: 'Time-Series Storage',
          annotations: {
            'dataprod.platform/kind': 'platform-component',
            'dataprod.platform/version': '1.0.0',
            'dataprod.platform/category': 'data',
            'dataprod.platform/certification-status': 'CERTIFIED',
          },
        },
        spec: { type: 'platform-component' },
      },
      {
        kind: 'Component',
        metadata: {
          name: 'rest-api',
          title: 'REST API',
          annotations: {
            'dataprod.platform/kind': 'platform-component',
            'dataprod.platform/version': '1.0.0',
            'dataprod.platform/category': 'integration',
            'dataprod.platform/certification-status': 'CERTIFIED',
          },
        },
        spec: { type: 'platform-component' },
      },
    ]);
    const built = builtWithSummary(
      catalog,
      [
        'component:default/health',
        'component:default/observability',
        'component:default/mqtt-consumer',
        'component:default/rest-source',
        'component:default/timeseries',
        'component:default/rest-api',
      ],
      'OEE Golden Path',
    );
    expect(built.reusableCount).toBe(6);
    expect(built.certifiedCount).toBe(6);
    expect(built.items.map(item => item.title)).toEqual(
      expect.arrayContaining([
        'REST Source',
        'MQTT Consumer',
        'Time-Series Storage',
        'REST API',
        'Health',
        'Observability',
      ]),
    );
  });
});
