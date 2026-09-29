import { Entity } from '@backstage/catalog-model';
import {
  CONSUMES_CONTRACT_ANNOTATION,
  ContractRelationProcessor,
  PROVIDES_CONTRACT_ANNOTATION,
} from './contractRelationProcessor';

const processor = new ContractRelationProcessor();

function component(
  annotations: Record<string, string>,
  spec: Record<string, unknown> = {},
): Entity {
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: { name: 'filler-01-oee', annotations },
    spec: { type: 'data-product', ...spec },
  } as Entity;
}

async function run(entity: Entity) {
  return (await processor.preProcessEntity(entity)) as Entity;
}

function specOf(entity: Entity) {
  return entity.spec as Record<string, unknown>;
}

describe('ContractRelationProcessor', () => {
  it('turns a providesContract annotation into spec.providesApis', async () => {
    const out = await run(
      component({ [PROVIDES_CONTRACT_ANNOTATION]: 'oee-contract' }),
    );

    expect(specOf(out).providesApis).toEqual(['oee-contract']);
  });

  it('turns a consumesContract annotation into spec.consumesApis', async () => {
    const out = await run(
      component({ [CONSUMES_CONTRACT_ANNOTATION]: 'machine-state' }),
    );

    expect(specOf(out).consumesApis).toEqual(['machine-state']);
  });

  it('reads a comma-separated list and drops blanks and duplicates', async () => {
    const out = await run(
      component({
        [PROVIDES_CONTRACT_ANNOTATION]:
          ' oee-contract , , temp-contract, oee-contract ',
      }),
    );

    expect(specOf(out).providesApis).toEqual(['oee-contract', 'temp-contract']);
  });

  // The declared refs are the stronger statement; the annotation adds to them
  // rather than replacing them.
  it('unions with refs the entity already declared', async () => {
    const out = await run(
      component(
        { [PROVIDES_CONTRACT_ANNOTATION]: 'legacy-contract' },
        { providesApis: ['declared-contract'] },
      ),
    );

    expect(specOf(out).providesApis).toEqual([
      'declared-contract',
      'legacy-contract',
    ]);
  });

  // The catalog hashes processed entities to decide whether anything changed.
  // Rewriting spec with identical values on every refresh would churn the
  // processing loop for no reason.
  it('returns the entity untouched when the annotation adds nothing', async () => {
    const entity = component(
      { [PROVIDES_CONTRACT_ANNOTATION]: 'oee-contract' },
      { providesApis: ['oee-contract'] },
    );

    expect(await run(entity)).toBe(entity);
  });

  it('returns the entity untouched when no annotation is present', async () => {
    const entity = component({});

    expect(await run(entity)).toBe(entity);
  });

  it('leaves non-Component kinds alone', async () => {
    const api = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'API',
      metadata: {
        name: 'oee-contract',
        annotations: { [PROVIDES_CONTRACT_ANNOTATION]: 'something' },
      },
      spec: { type: 'openapi' },
    } as Entity;

    expect(await run(api)).toBe(api);
  });

  // An empty array says "provides nothing", which is a different claim from
  // "did not say".
  it('does not write an empty array when only the other side is annotated', async () => {
    const out = await run(
      component({ [CONSUMES_CONTRACT_ANNOTATION]: 'machine-state' }),
    );

    expect(specOf(out).providesApis).toBeUndefined();
    expect(specOf(out).consumesApis).toEqual(['machine-state']);
  });

  it('preserves the rest of the spec', async () => {
    const out = await run(
      component(
        { [PROVIDES_CONTRACT_ANNOTATION]: 'oee-contract' },
        { owner: 'team-a', lifecycle: 'production' },
      ),
    );

    expect(specOf(out).type).toBe('data-product');
    expect(specOf(out).owner).toBe('team-a');
    expect(specOf(out).lifecycle).toBe('production');
  });
});
