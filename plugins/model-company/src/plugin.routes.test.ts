import { modelCompanyPlugin, modelCompanyRegisteredPaths } from './plugin';

const CORE_MODEL_COMPANY_PATHS = [
  '/model-company',
  '/model-company/campaign',
  '/model-company/factory',
  '/model-company/lines',
  '/model-company/material-flow',
  '/model-company/batches',
  '/model-company/scenarios',
  '/model-company/data-products',
] as const;

describe('modelCompanyPlugin routes', () => {
  it('exposes route refs for Model Company sections', () => {
    const routeKeys = Object.keys(modelCompanyPlugin.routes ?? {});
    expect(routeKeys).toEqual(
      expect.arrayContaining([
        'root',
        'campaign',
        'uns',
        'factory',
        'lines',
        'equipment',
        'orders',
        'batches',
        'genealogy',
        'materialFlow',
        'warehouse',
        'scenarios',
        'events',
        'dataProducts',
        'architecture',
      ]),
    );
  });

  it('registers PageBlueprint paths for Model Company', () => {
    for (const pagePath of CORE_MODEL_COMPANY_PATHS) {
      expect(modelCompanyRegisteredPaths).toContain(pagePath);
    }
  });
});
