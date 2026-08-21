import { contractApiEntityName } from './apiIdentity';

describe('API identity', () => {
  it('builds a unique Catalog name from product and logical contract', () => {
    expect(
      contractApiEntityName('cold-room-temperature', 'temperature-event'),
    ).toBe('cold-room-temperature--temperature-event');
    expect(
      contractApiEntityName('warehouse-temperature', 'temperature-event'),
    ).toBe('warehouse-temperature--temperature-event');
    expect(
      contractApiEntityName('cold-room-temperature', 'temperature-event'),
    ).not.toBe(
      contractApiEntityName('warehouse-temperature', 'temperature-event'),
    );
  });
});
