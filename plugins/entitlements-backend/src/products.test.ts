import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { loadCommercialProductCatalog, loadGoldenPathReleases } from '@internal/platform-common';

describe('commercial product mapping files', () => {
  it('keeps YAML and JSON product IDs in sync', () => {
    const yamlPath = path.resolve(
      __dirname,
      '../../../config/commercial-products.yaml',
    );
    const document = yaml.parse(fs.readFileSync(yamlPath, 'utf8')) as {
      products: Record<string, { productId: string; availability: string }>;
    };
    const fromYaml = Object.values(document.products).map(item => item.productId);
    const fromJson = loadCommercialProductCatalog().products.map(
      item => item.productId,
    );
    expect(fromYaml).toEqual(fromJson);
    const catalog = loadCommercialProductCatalog();
    const releases = loadGoldenPathReleases();
    for (const product of catalog.products.filter(
      item => item.availability === 'AVAILABLE',
    )) {
      expect(product.catalogRef).toBeTruthy();
      expect(product.templateId).toBeTruthy();
      expect(product.distribution).toEqual(
        expect.arrayContaining(['INTERNAL', 'AWS_MARKETPLACE']),
      );
      const release = releases.find(
        item =>
          item.template === product.templateId && item.status === 'RELEASED',
      );
      expect(release?.certification.status).toBe('CERTIFIED');
    }
    expect(JSON.stringify(document)).not.toMatch(
      /CustomerIdentifier|x-amzn-marketplace-token|AWS_SECRET/i,
    );
  });
});
