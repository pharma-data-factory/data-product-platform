import { DataProduct } from './model';
import {
  catalogGraphPath,
  contractCatalogPath,
  dataProductDiscoverLinks,
} from './navigation';

const product: DataProduct = {
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
  documentation: 'https://github.com/example/docs',
  techDocsUrl: '/docs/default/component/sample-mqtt-temperature-product',
  repository: 'https://github.com/example/sample-mqtt-temperature-product',
  certificationStatus: 'DEVELOPMENT',
  entityRef: 'component:default/sample-mqtt-temperature-product',
};

describe('data product discover navigation', () => {
  it('builds API, repository, TechDocs, graph, and in-page links', () => {
    const links = dataProductDiscoverLinks(product);
    expect(contractCatalogPath(product)).toBe(
      '/catalog/default/api/temperature-event',
    );
    expect(catalogGraphPath(product)).toContain(
      'component%3Adefault%2Fsample-mqtt-temperature-product',
    );
    expect(links.map(link => link.id)).toEqual([
      'repository',
      'techdocs',
      'catalog-graph',
      'api',
      'industrial-contract',
      'industrial-quality',
    ]);
    expect(links.find(link => link.id === 'api')?.to).toBe(
      '/catalog/default/api/temperature-event',
    );
    expect(links.find(link => link.id === 'techdocs')?.to).toBe(
      '/docs/default/component/sample-mqtt-temperature-product',
    );
    expect(links.find(link => link.id === 'techdocs')?.label).toBe(
      'Documentation',
    );
  });

  it('omits API and TechDocs when those targets are missing', () => {
    const links = dataProductDiscoverLinks({
      ...product,
      providesContract: undefined,
      consumesContract: undefined,
      repository: undefined,
      techDocsUrl: undefined,
    });
    expect(links.map(link => link.id)).toEqual([
      'catalog-graph',
      'industrial-contract',
      'industrial-quality',
    ]);
  });
});
