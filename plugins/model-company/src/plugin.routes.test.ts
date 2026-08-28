import fs from 'fs';
import path from 'path';
import { modelCompanyPlugin } from './plugin';

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
    const pluginSource = fs.readFileSync(
      path.join(__dirname, 'plugin.tsx'),
      'utf8',
    );
    for (const p of [
      '/model-company',
      '/model-company/campaign',
      '/model-company/factory',
      '/model-company/lines',
      '/model-company/material-flow',
      '/model-company/batches',
      '/model-company/scenarios',
      '/model-company/data-products',
    ]) {
      expect(pluginSource).toContain(`path: '${p}'`);
    }
  });
});
