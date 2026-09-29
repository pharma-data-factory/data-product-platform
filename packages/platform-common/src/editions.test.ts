/**
 * The edition resolver decides what an installation may see.
 *
 * It shipped in `NXD-078` with no test of any kind — 251 lines, six exports,
 * called only by `artifact-registry-backend`. That is the same state
 * `NXD-079` was in the day before `NXD-080` found seven templates
 * unscaffoldable behind four green gates, and the stakes here are higher: a
 * wrong "yes" hands an installation content it is not entitled to, and a wrong
 * "no" removes content it paid for. Neither failure is visible from outside.
 *
 * Two things are deliberately pinned rather than merely exercised, because
 * both are permissive and a later reader will be tempted to "fix" them:
 * an artifact that declares no editions is available everywhere, and an
 * installation on no edition sees everything. Both are decisions with reasons
 * written in `editions.ts`; the tests name them so a change has to argue.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';
import {
  artifactAvailableInEdition,
  editionHasCapability,
  resolveEditions,
  validateEditionCatalogue,
  type EditionCatalogue,
  type PlatformEdition,
} from './editions';

const SHIPPED_CATALOGUE = join(
  __dirname,
  '..',
  '..',
  '..',
  'catalog',
  'editions.yaml',
);

function edition(overrides: Partial<PlatformEdition> = {}): PlatformEdition {
  return {
    id: 'nexora-core',
    displayName: 'Nexora Core',
    capabilities: [],
    featuredArtifacts: [],
    ...overrides,
  };
}

function catalogue(...editions: PlatformEdition[]): EditionCatalogue {
  return { editions };
}

describe('validateEditionCatalogue', () => {
  it('accepts the catalogue this repository ships', () => {
    const document = parseYaml(readFileSync(SHIPPED_CATALOGUE, 'utf8'));
    expect(validateEditionCatalogue(document)).toEqual([]);
  });

  it.each([
    ['a scalar', 'nexora-core'],
    ['a list', []],
    ['null', null],
  ])('rejects %s at the top level', (_label, input) => {
    expect(validateEditionCatalogue(input)).toEqual([
      'Edition catalogue must be a mapping',
    ]);
  });

  it('rejects an editions key that is not a list', () => {
    expect(validateEditionCatalogue({ editions: {} })).toEqual([
      'editions must be a list',
    ]);
  });

  it('names the offending value when an id is not kebab-case', () => {
    const issues = validateEditionCatalogue({
      editions: [{ id: 'Nexora_Core', displayName: 'x' }],
    });
    expect(issues).toEqual([
      'Edition id "Nexora_Core" must be lowercase kebab-case',
    ]);
  });

  it('rejects a duplicate id', () => {
    const issues = validateEditionCatalogue(
      catalogue(edition(), edition({ displayName: 'Nexora Core again' })),
    );
    expect(issues).toEqual([
      'Edition "nexora-core" is declared more than once',
    ]);
  });

  it('requires a displayName that is not blank', () => {
    expect(
      validateEditionCatalogue(catalogue(edition({ displayName: '   ' }))),
    ).toEqual(['Edition "nexora-core" must have a displayName']);
  });

  it.each([
    ['capabilities', { capabilities: [1, 2] }],
    ['featuredArtifacts', { featuredArtifacts: [{}] }],
  ])('rejects %s that is not a list of strings', (field, overrides) => {
    const issues = validateEditionCatalogue({
      editions: [{ id: 'nexora-core', displayName: 'Core', ...overrides }],
    });
    expect(issues).toEqual([
      `Edition "nexora-core" ${field} must be a list of strings`,
    ]);
  });

  it('rejects an extends that is not an edition id', () => {
    const issues = validateEditionCatalogue({
      editions: [{ id: 'nexora-core', displayName: 'Core', extends: 42 }],
    });
    expect(issues).toEqual([
      'Edition "nexora-core" extends must be an edition id',
    ]);
  });

  it('names both ends of a dangling parent', () => {
    const issues = validateEditionCatalogue(
      catalogue(edition({ id: 'nexora-enterprise', extends: 'nexora-ghost' })),
    );
    expect(issues).toEqual([
      'Edition "nexora-enterprise" extends "nexora-ghost", which is not declared',
    ]);
  });

  it('reports every problem rather than the first', () => {
    // The docblock promises this, and it is the difference between one
    // round-trip and five for an operator repairing a hand-written file.
    const issues = validateEditionCatalogue({
      editions: [
        { id: 'Bad Id', displayName: 'x' },
        { id: 'nexora-core' },
        { id: 'nexora-edge', displayName: 'Edge', extends: 'nexora-ghost' },
      ],
    });
    expect(issues).toHaveLength(3);
    expect(issues).toEqual(
      expect.arrayContaining([
        'Edition id "Bad Id" must be lowercase kebab-case',
        'Edition "nexora-core" must have a displayName',
        'Edition "nexora-edge" extends "nexora-ghost", which is not declared',
      ]),
    );
  });

  it('rejects an edition that extends itself', () => {
    const issues = validateEditionCatalogue(
      catalogue(edition({ extends: 'nexora-core' })),
    );
    expect(issues).toEqual([
      'Edition "nexora-core" extends itself',
      'Edition inheritance is circular: nexora-core -> nexora-core',
    ]);
  });

  it('reports a cycle once, not once per member', () => {
    const issues = validateEditionCatalogue(
      catalogue(
        edition({ id: 'a', displayName: 'A', extends: 'c' }),
        edition({ id: 'b', displayName: 'B', extends: 'a' }),
        edition({ id: 'c', displayName: 'C', extends: 'b' }),
      ),
    );
    expect(issues).toEqual([
      'Edition inheritance is circular: a -> c -> b -> a',
    ]);
  });

  it('reports the cycle, not the edition that merely leads into it', () => {
    const issues = validateEditionCatalogue(
      catalogue(
        edition({ id: 'a', displayName: 'A', extends: 'b' }),
        edition({ id: 'b', displayName: 'B', extends: 'a' }),
        edition({ id: 'outside', displayName: 'Outside', extends: 'a' }),
      ),
    );
    expect(issues).toEqual(['Edition inheritance is circular: a -> b -> a']);
  });

  it('accepts an empty edition list', () => {
    // Pinned deliberately. An empty catalogue is valid and resolves to no
    // editions, which means an installation configured to any edition at all
    // fails loudly in `resolveInstallation` rather than quietly running
    // unrestricted. The permissiveness lives at the installation boundary, not
    // here.
    expect(validateEditionCatalogue({ editions: [] })).toEqual([]);
  });
});

describe('resolveEditions', () => {
  it('throws rather than returning a partial catalogue', () => {
    expect(() =>
      resolveEditions(catalogue(edition({ extends: 'nexora-ghost' }))),
    ).toThrow(/Invalid edition catalogue: .*not declared/);
  });

  it('flattens a two-level chain, nearest ancestor first', () => {
    const resolved = resolveEditions(
      catalogue(
        edition({ id: 'core', displayName: 'Core', capabilities: ['base'] }),
        edition({
          id: 'mid',
          displayName: 'Mid',
          extends: 'core',
          capabilities: ['extra'],
        }),
        edition({
          id: 'top',
          displayName: 'Top',
          extends: 'mid',
          capabilities: ['premium'],
        }),
      ),
    );

    expect(resolved.get('top')).toMatchObject({
      lineage: ['top', 'mid', 'core'],
      capabilities: ['premium', 'extra', 'base'],
    });
  });

  it('resolves an edition with no parent to itself', () => {
    const resolved = resolveEditions(
      catalogue(edition({ capabilities: ['base'] })),
    );
    expect(resolved.get('nexora-core')).toMatchObject({
      lineage: ['nexora-core'],
      capabilities: ['base'],
    });
  });

  it('de-duplicates a capability declared on both an edition and its parent', () => {
    const resolved = resolveEditions(
      catalogue(
        edition({ id: 'core', displayName: 'Core', capabilities: ['shared'] }),
        edition({
          id: 'child',
          displayName: 'Child',
          extends: 'core',
          capabilities: ['shared', 'own'],
        }),
      ),
    );
    expect(resolved.get('child')!.capabilities).toEqual(['shared', 'own']);
  });

  it('lets the nearest gxpPolicy in the lineage win', () => {
    const resolved = resolveEditions(
      catalogue(
        edition({ id: 'core', displayName: 'Core', gxpPolicy: 'core-pack' }),
        edition({
          id: 'child',
          displayName: 'Child',
          extends: 'core',
          gxpPolicy: 'child-pack',
        }),
        edition({ id: 'silent', displayName: 'Silent', extends: 'core' }),
      ),
    );
    expect(resolved.get('child')!.gxpPolicy).toBe('child-pack');
    expect(resolved.get('silent')!.gxpPolicy).toBe('core-pack');
  });

  it('inherits featuredArtifacts from an ancestor', () => {
    const resolved = resolveEditions(
      catalogue(
        edition({
          id: 'core',
          displayName: 'Core',
          featuredArtifacts: ['nexora/a@1.0.0'],
        }),
        edition({ id: 'child', displayName: 'Child', extends: 'core' }),
      ),
    );
    expect(resolved.get('child')!.featuredArtifacts).toEqual([
      'nexora/a@1.0.0',
    ]);
  });

  it('resolves the shipped catalogue, and enterprise inherits from core', () => {
    // This is the regression the module was written for. `nexora-enterprise`
    // extends `nexora-life-sciences` extends `nexora-core`, and the previous
    // flat lookup reported that enterprise lacked `artifact-marketplace` —
    // a capability it inherits two levels up.
    const document = parseYaml(
      readFileSync(SHIPPED_CATALOGUE, 'utf8'),
    ) as EditionCatalogue;
    const resolved = resolveEditions(document);
    const enterprise = resolved.get('nexora-enterprise')!;

    expect(enterprise.lineage).toEqual([
      'nexora-enterprise',
      'nexora-life-sciences',
      'nexora-core',
    ]);
    expect(enterprise.capabilities).toEqual(
      expect.arrayContaining([
        'external-publishers',
        'urs-composer',
        'artifact-marketplace',
      ]),
    );
    // Its own list is empty and says "inherits from nexora-life-sciences".
    // If that comment is to be true, the resolved list cannot be empty.
    expect(enterprise.featuredArtifacts.length).toBeGreaterThan(0);
    expect(enterprise.gxpPolicy).toBe('nexora/gxp-data-product-policy@1.0.0');
  });

  it('keeps manufacturing and life sciences as siblings, not ancestors', () => {
    const document = parseYaml(
      readFileSync(SHIPPED_CATALOGUE, 'utf8'),
    ) as EditionCatalogue;
    const resolved = resolveEditions(document);

    expect(resolved.get('nexora-manufacturing')!.capabilities).not.toContain(
      'urs-composer',
    );
    expect(resolved.get('nexora-life-sciences')!.capabilities).not.toContain(
      'mqtt-integration',
    );
  });
});

describe('editionHasCapability', () => {
  const resolved = resolveEditions(
    catalogue(
      edition({ id: 'core', displayName: 'Core', capabilities: ['base'] }),
      edition({ id: 'child', displayName: 'Child', extends: 'core' }),
    ),
  );

  it('answers yes for a capability inherited from a parent', () => {
    expect(editionHasCapability(resolved.get('child')!, 'base')).toBe(true);
  });

  it('answers no for a capability nobody in the lineage declares', () => {
    expect(editionHasCapability(resolved.get('child')!, 'absent')).toBe(false);
  });
});

describe('artifactAvailableInEdition', () => {
  const resolved = resolveEditions(
    catalogue(
      edition({ id: 'core', displayName: 'Core' }),
      edition({ id: 'child', displayName: 'Child', extends: 'core' }),
      edition({ id: 'sibling', displayName: 'Sibling', extends: 'core' }),
    ),
  );
  const core = resolved.get('core')!;
  const child = resolved.get('child')!;

  it.each([
    ['undefined', undefined],
    ['an empty list', []],
  ])(
    'makes an artifact declaring %s available everywhere',
    (_label, declared) => {
      // Permissive by design: requiring every manifest to opt in would empty the
      // marketplace of everything written before editions existed.
      expect(artifactAvailableInEdition(declared, child)).toBe(true);
    },
  );

  it('shows everything to an installation on no edition', () => {
    // Also permissive by design, and the riskier of the two. An operator who
    // has not chosen an edition has not asked to be restricted. Note what this
    // does NOT cover: an installation configured to an edition the catalogue
    // does not declare throws in `resolveInstallation` and never reaches here.
    expect(artifactAvailableInEdition(['child'], undefined)).toBe(true);
  });

  it('makes an artifact scoped to a parent available to the child', () => {
    expect(artifactAvailableInEdition(['core'], child)).toBe(true);
  });

  it('does not make an artifact scoped to the child available to the parent', () => {
    expect(artifactAvailableInEdition(['child'], core)).toBe(false);
  });

  it('does not leak between siblings', () => {
    expect(artifactAvailableInEdition(['sibling'], child)).toBe(false);
  });

  it('needs only one declared edition to match', () => {
    expect(artifactAvailableInEdition(['sibling', 'core'], child)).toBe(true);
  });
});
