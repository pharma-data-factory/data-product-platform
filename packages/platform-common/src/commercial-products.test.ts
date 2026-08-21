import fs from 'fs';
import path from 'path';
import {
  commercialAvailabilityCopy,
  commercialCardStatus,
  commercialProductForTemplate,
  findCommercialProduct,
  isCommercialProductId,
  loadCommercialProductCatalog,
  normalizeProductId,
} from './commercial-products';

describe('commercial product identifiers', () => {
  it('uses stable product IDs rather than UI labels', () => {
    const catalog = loadCommercialProductCatalog();
    expect(catalog.products.map(product => product.productId)).toEqual([
      'golden-path.mqtt-temperature',
      'golden-path.rest-equipment',
      'platform.core',
      'platform.components',
      'future.golden-path.oee',
    ]);
    expect(catalog.products.map(product => product.displayName)).not.toContain(
      'golden-path.mqtt-temperature',
    );
  });

  it('maps catalog templates and legacy aliases to product IDs', () => {
    expect(normalizeProductId('mqtt-temperature-template')).toBe(
      'golden-path.mqtt-temperature',
    );
    expect(isCommercialProductId('platform-core')).toBe(true);
    expect(
      commercialProductForTemplate('mqtt-temperature-data-product')?.productId,
    ).toBe('golden-path.mqtt-temperature');
    expect(findCommercialProduct('golden-path.rest-equipment')?.catalogRef).toBe(
      'template:default/rest-equipment-data-product',
    );
  });

  it('computes marketplace commercial card status without purchase CTAs', () => {
    const mqtt = findCommercialProduct('golden-path.mqtt-temperature')!;
    const oee = findCommercialProduct('future.golden-path.oee')!;
    const platform = findCommercialProduct('platform.core')!;

    expect(commercialCardStatus(mqtt, true)).toBe('ENTITLED');
    expect(commercialCardStatus(mqtt, false, 'PENDING_ACCESS')).toBe(
      'PENDING_ACCESS',
    );
    expect(commercialAvailabilityCopy('PENDING_ACCESS')).toMatch(/pending/i);
    expect(commercialCardStatus(oee, false)).toBe('FUTURE');
    expect(commercialCardStatus(platform, false)).toBe('PLANNED');
    expect(commercialAvailabilityCopy('ENTITLED')).toBe(
      'Available through your organization',
    );
    expect(commercialAvailabilityCopy('FUTURE')).toBe(
      'Commercial availability planned',
    );
    expect(commercialAvailabilityCopy('ENTITLED')).not.toMatch(/buy|purchase|checkout/i);
  });

  it('does not store Marketplace customer data in the product catalog', () => {
    expect(JSON.stringify(loadCommercialProductCatalog())).not.toMatch(
      /CustomerIdentifier|x-amzn-marketplace-token|AWS_SECRET/i,
    );
  });

  it('does not share a basename with its JSON catalog', () => {
    expect(fs.readdirSync(__dirname)).not.toContain('commercial-products.json');
    expect(
      fs.existsSync(path.join(__dirname, 'commercial-products.catalog.json')),
    ).toBe(true);
  });
});
