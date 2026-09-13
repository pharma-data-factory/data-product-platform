/**
 * Warehouse dataset id helpers (Phase C / ADR-011).
 */

import { buildWarehouseDataset } from './warehouseDataset';

describe('buildWarehouseDataset', () => {
  it('builds domain.product_contract_vmajor', () => {
    expect(
      buildWarehouseDataset({
        domain: 'Manufacturing',
        name: 'Line04-OEE',
        contract: 'oee-result-v1',
        major: 1,
      }),
    ).toBe('manufacturing.line04_oee_oee_result_v1');
  });

  it('strips trailing -vN from contract before appending major', () => {
    expect(
      buildWarehouseDataset({
        domain: 'make',
        name: 'temp',
        contract: 'temperature-event-v1',
      }),
    ).toBe('make.temp_temperature_event_v1');
  });
});
