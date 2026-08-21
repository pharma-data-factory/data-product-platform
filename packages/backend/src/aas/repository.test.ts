import { defaultSeedPath, MemoryAasRepository } from './repository';

describe('AAS in-memory repository', () => {
  it('seeds filler-01 and resolves speed for Machine Metrics proof', () => {
    const repo = new MemoryAasRepository(defaultSeedPath());
    repo.seed();
    const filler = repo.getAsset('filler-01');
    expect(filler.assetInformation.assetType).toBe('Filler');
    expect(filler.context.site).toBe('basel');
    const speed = repo.resolveProperty('filler-01', 'speed');
    expect(speed.unit).toBe('rpm');
    expect(speed.connectivity?.topic).toBe(
      'pharma/basel/packaging/line-01/filler-01/speed/value',
    );
    expect(speed.connectivity?.protocol).toBe('MQTT');
    expect(filler.properties[0]).not.toHaveProperty('value');
  });

  it('rejects duplicates, secrets, and missing entities', () => {
    const repo = new MemoryAasRepository(defaultSeedPath());
    repo.seed();
    expect(() => repo.createAsset({ id: 'filler-01', displayName: 'Dup' }, 't')).toThrow(
      /already exists/,
    );
    expect(() => repo.getAsset('missing')).toThrow(/not found/);
    expect(() =>
      repo.addProperty(
        'filler-01',
        {
          id: 'bad',
          idShort: 'Bad',
          name: 'Bad',
          dataType: 'string',
          connectivity: {
            protocol: 'MQTT',
            endpoint: 'password=secret',
          },
        },
        't',
      ),
    ).toThrow(/secrets/);
  });
});
