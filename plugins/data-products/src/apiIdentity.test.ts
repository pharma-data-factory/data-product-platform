import {
  contractApiEntityName,
  logicalContractName,
  parseContractApiEntityName,
} from './apiIdentity';

describe('API identity helpers', () => {
  it('keeps display names separate from unique Catalog names', () => {
    expect(
      contractApiEntityName('cold-room-temperature', 'temperature-event'),
    ).toBe('cold-room-temperature--temperature-event');
    expect(
      logicalContractName('cold-room-temperature--temperature-event'),
    ).toBe('temperature-event');
    expect(
      logicalContractName(
        'cold-room-temperature--temperature-event',
        'temperature-event',
      ),
    ).toBe('temperature-event');
    expect(parseContractApiEntityName('temperature-event')).toEqual({
      contract: 'temperature-event',
    });
  });
});
