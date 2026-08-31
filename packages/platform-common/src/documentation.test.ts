import {
  ARCHITECTURE_STORY_PATH,
  DEVELOPER_ARCHITECTURE_PATH,
  DEVELOPER_HUB_PATH,
  DEVELOPER_HUB_SECTIONS,
  DOCUMENTATION_PAGES,
  DOCUMENTATION_VERSION,
  FIRST_DAY_STEPS,
  GOLDEN_PATH_DOC_SECTIONS,
  LAST_REVIEWED,
  PLATFORM_DOCS_BASE,
  classifyTechDocsResult,
  contextualDocumentationHref,
  developerHubActionsForRole,
  documentationFilePath,
  documentationHref,
  goldenPathDocumentationHref,
  isCustomerFacingAudience,
  publicCustomerAudiences,
  documentationIndexPages,
  DOC_AUDIENCES,
  audienceLabel,
  documentationPagesForAudience,
  DOCUMENTATION_PERSONAS,
  documentationPageById,
} from './documentation';
import fs from 'fs';
import path from 'path';

describe('developer hub documentation model', () => {
  it('exposes the authenticated Developer Hub route', () => {
    expect(DEVELOPER_HUB_PATH).toBe('/developer');
  });

  it('covers Getting Started and the first Data Product journey', () => {
    expect(DEVELOPER_HUB_SECTIONS.map(section => section.title)).toEqual([
      'GETTING STARTED',
      'ARCHITECTURE',
      'COMMERCIAL',
      'BUILD',
      'DELIVER',
      'HOW-TO',
    ]);
    expect(
      DEVELOPER_HUB_SECTIONS.find(section => section.title === 'GETTING STARTED')
        ?.pages.map(page => page.title),
    ).toEqual([
      'Developer Quick Start',
      'Platform Overview',
      'Development Environment',
      'GitHub Setup',
      'Hosted GitHub login',
      'Platform GitHub repository',
      'Portainer hosting',
      'Control Plane hosting',
      'Build Your First Data Product',
      'Pilot readiness',
      'Pilot hardening gate',
      'Pilot operations runbook',
      'MVP 1.0 baseline',
      'Status model',
      'Developer journey evidence',
      'Pilot exit gate',
    ]);
    expect(
      DEVELOPER_HUB_SECTIONS.find(section => section.title === 'BUILD')
        ?.pages.map(page => page.title),
    ).toEqual(
      expect.arrayContaining([
        'What is a Platform Component?',
        'Browse the Component Library',
        'How to reuse a Component',
        'Composition Model',
        'Composition Builder',
        'Product model',
        'Platform Component vs Golden Path',
        'Platform Component vs Backstage Plugin',
        'Creating a Platform Component',
        'Platform Component Certification',
        'Versioning & Compatibility',
        'Equipment Use Log composition example',
        'Developer Decision Model',
        'Wave 1 Certified Components',
        'Certification Checklist',
        'Security Limitations',
        'Component Upgrade Policy',
        'Health',
        'Observability',
        'REST API',
        'REST Source',
        'MQTT Consumer',
        'Time-Series Storage',
        'Build a Data Product from Platform Components',
      ]),
    );
    expect(FIRST_DAY_STEPS).toHaveLength(17);
    expect(FIRST_DAY_STEPS[0].title).toBe('Sign In');
    expect(FIRST_DAY_STEPS[15].title).toBe('Inspect Dependencies');
    expect(FIRST_DAY_STEPS[16].title).toBe('Open TechDocs');
    for (const step of FIRST_DAY_STEPS) {
      expect(step.why).toBeTruthy();
      expect(step.action).toBeTruthy();
      expect(step.expected).toBeTruthy();
      expect(step.commonError).toBeTruthy();
      expect(documentationHref(step.learnMoreId)).toContain(PLATFORM_DOCS_BASE);
    }
    expect(FIRST_DAY_STEPS[2].platformRoute).toBe('/marketplace');
  });

  it('records documentation governance without a database', () => {
    for (const page of DOCUMENTATION_PAGES) {
      expect(page.owner).toBeTruthy();
      expect(page.documentationVersion).toBe(DOCUMENTATION_VERSION);
      expect(page.applicablePlatform).toContain('Data Product Standard 1.0');
      expect(page.lastReviewed).toBe(LAST_REVIEWED);
    }
    expect(documentationIndexPages(4).length).toBe(4);
  });

  it('links architecture and Golden Path documentation through TechDocs', () => {
    expect(documentationHref('architecture-platform')).toBe(
      `${PLATFORM_DOCS_BASE}/architecture/platform`,
    );
    expect(goldenPathDocumentationHref('mqtt-temperature-data-product')).toBe(
      `${PLATFORM_DOCS_BASE}/how-to/mqtt-temperature`,
    );
    expect(goldenPathDocumentationHref('rest-equipment-data-product')).toBe(
      `${PLATFORM_DOCS_BASE}/how-to/rest-equipment`,
    );
    expect(goldenPathDocumentationHref('oee-data-product')).toBe(
      `${PLATFORM_DOCS_BASE}/how-to/oee`,
    );
    expect(goldenPathDocumentationHref('unified-namespace')).toBe(
      `${PLATFORM_DOCS_BASE}/uns/index`,
    );
    expect(goldenPathDocumentationHref('machine-state-consumer-data-product')).toBe(
      `${PLATFORM_DOCS_BASE}/how-to/compose-uns`,
    );
    expect(GOLDEN_PATH_DOC_SECTIONS).toEqual(
      expect.arrayContaining(['Overview', 'Data Contract', 'Troubleshooting', 'Docker']),
    );
    expect(documentationHref('keep-core-standard')).toContain(
      '/fundamentals/system-of-record',
    );
    expect(contextualDocumentationHref('architectureStory')).toBe(
      ARCHITECTURE_STORY_PATH,
    );
    expect(DEVELOPER_ARCHITECTURE_PATH).toBe(
      '/platform/architecture/developer',
    );
    expect(contextualDocumentationHref('releaseCatalog')).toBe('/releases');
  });

  it('maps contextual UI links to TechDocs without exposing source paths', () => {
    expect(contextualDocumentationHref('marketplaceGoldenPath', 'mqtt-temperature-data-product')).toBe(
      `${PLATFORM_DOCS_BASE}/how-to/mqtt-temperature`,
    );
    expect(contextualDocumentationHref('marketplaceGoldenPath', 'rest-equipment-data-product')).toBe(
      `${PLATFORM_DOCS_BASE}/how-to/rest-equipment`,
    );
    expect(contextualDocumentationHref('platformCompliance')).toBe(
      `${PLATFORM_DOCS_BASE}/engineering/standard`,
    );
    expect(contextualDocumentationHref('contract')).toBe(
      `${PLATFORM_DOCS_BASE}/engineering/contracts`,
    );
    expect(contextualDocumentationHref('ciQualityGate')).toBe(
      `${PLATFORM_DOCS_BASE}/how-to/ci-failure`,
    );
    expect(contextualDocumentationHref('upgradeStatus')).toBe(
      `${PLATFORM_DOCS_BASE}/engineering/versioning`,
    );
    expect(
      contextualDocumentationHref(
        'productTechDocs',
        '/docs/default/component/cold-room-temperature',
      ),
    ).toBe('/docs/default/component/cold-room-temperature');
    expect(documentationFilePath('/developer/getting-started')).toBe(
      'docs/developer/getting-started.md',
    );
    expect(
      documentationFilePath('/developer/getting-started#platform-introduction'),
    ).toBe('docs/developer/getting-started.md');
    expect(documentationHref('prerequisites')).toContain(
      '#developer-prerequisites',
    );
  });

  it('classifies TechDocs search hits without a second index', () => {
    expect(
      classifyTechDocsResult({
        location: `${PLATFORM_DOCS_BASE}/how-to/ci-failure`,
      }),
    ).toBe('How-To');
    expect(
      classifyTechDocsResult({
        location: `${PLATFORM_DOCS_BASE}/architecture/platform`,
      }),
    ).toBe('Architecture');
    expect(
      classifyTechDocsResult({
        location: `${PLATFORM_DOCS_BASE}/fundamentals/golden-paths`,
      }),
    ).toBe('Golden Path');
    expect(
      classifyTechDocsResult({
        location: `${PLATFORM_DOCS_BASE}/contracts/temperature-event`,
      }),
    ).toBe('Contract Documentation');
    expect(
      classifyTechDocsResult({
        location: '/docs/default/component/cold-room-temperature',
        title: 'Cold Room Temperature',
      }),
    ).toBe('Data Product Documentation');
    expect(
      classifyTechDocsResult({
        location: `${PLATFORM_DOCS_BASE}/developer/getting-started`,
      }),
    ).toBe('Platform Documentation');
  });

  it('keeps future customer documentation out of the default public portal', () => {
    expect(publicCustomerAudiences()).toEqual([
      'CUSTOMER_PLATFORM',
      'SAAS_CUSTOMER',
    ]);
    expect(isCustomerFacingAudience('INTERNAL_ENGINEERING')).toBe(false);
    expect(isCustomerFacingAudience('PLATFORM_USER')).toBe(false);
    expect(isCustomerFacingAudience('SAAS_CUSTOMER')).toBe(true);
  });

  it('separates Viewer read actions from developer-only create actions', () => {
    expect(developerHubActionsForRole('VIEWER').map(action => action.id)).toEqual([
      'guide',
      'components',
      'architecture',
      'search',
    ]);
    expect(
      developerHubActionsForRole('DEVELOPER').map(action => action.id),
    ).toEqual(['create', 'compose', 'mqtt', 'guide', 'components', 'architecture', 'search']);
    expect(
      developerHubActionsForRole('DEVELOPER').some(action => action.developerOnly),
    ).toBe(true);
  });
});

describe('developer hub documentation drift guard', () => {
  const ROOT = path.resolve(__dirname, '../../..');
  const DOCS_DIR = path.join(ROOT, 'docs');

  it('maps every registered page to an existing docs file', () => {
    const missing = DOCUMENTATION_PAGES.filter(
      page => !fs.existsSync(path.join(ROOT, documentationFilePath(page.path))),
    ).map(page => `${page.id} -> ${documentationFilePath(page.path)}`);

    expect(missing).toEqual([]);
  });

  it('resolves every mkdocs.yml nav target to a file under docs/', () => {
    const mkdocs = fs.readFileSync(path.join(ROOT, 'mkdocs.yml'), 'utf8');
    const targets = [...mkdocs.matchAll(/([\w./-]+\.md)/g)].map(match => match[1]);
    const missing = targets.filter(
      target => !fs.existsSync(path.join(DOCS_DIR, target)),
    );

    expect(missing).toEqual([]);
  });

  // DOCUMENTATION_PAGES is the canonical page registry; the mkdocs nav must
  // stay a superset of it so hub links are always reachable in the sidebar.
  it('keeps every registered page reachable in the mkdocs nav', () => {
    const mkdocs = fs.readFileSync(path.join(ROOT, 'mkdocs.yml'), 'utf8');
    const navTokens = new Set(
      [...mkdocs.matchAll(/([\w./-]+\.md)/g)].map(match => match[1]),
    );
    const missing = DOCUMENTATION_PAGES.filter(
      page =>
        !navTokens.has(documentationFilePath(page.path).replace(/^docs\//, '')),
    ).map(page => `${page.id} -> ${documentationFilePath(page.path)}`);

    expect(missing).toEqual([]);
  });
});

describe('developer hub documentation audiences', () => {
  it('labels every declared audience', () => {
    expect(DOC_AUDIENCES.map(audienceLabel)).toEqual([
      'Internal Engineering',
      'Platform User',
      'Customer Platform',
      'SaaS Customer',
    ]);
  });

  it('filters pages by audience and keeps customer pages empty for now', () => {
    for (const audience of DOC_AUDIENCES) {
      for (const page of documentationPagesForAudience(audience)) {
        expect(page.audience).toBe(audience);
      }
    }
    expect(
      documentationPagesForAudience('INTERNAL_ENGINEERING').length,
    ).toBeGreaterThan(0);
    expect(documentationPagesForAudience('PLATFORM_USER').length).toBeGreaterThan(
      0,
    );
    expect(documentationPagesForAudience('CUSTOMER_PLATFORM')).toEqual([]);
    expect(documentationPagesForAudience('SAAS_CUSTOMER')).toEqual([]);
  });
});

describe('developer hub documentation personas', () => {
  it('routes Developer, Product Manager, and Customer to existing pages', () => {
    expect(DOCUMENTATION_PERSONAS.map(persona => persona.id)).toEqual([
      'developer',
      'product-manager',
      'customer',
    ]);
    for (const persona of DOCUMENTATION_PERSONAS) {
      expect(persona.pageIds.length).toBeGreaterThan(0);
      for (const pageId of persona.pageIds) {
        expect(documentationPageById(pageId)).toBeDefined();
      }
    }
  });
});
