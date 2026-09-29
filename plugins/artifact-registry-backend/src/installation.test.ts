/**
 * Who this installation is, against a real filesystem.
 *
 * The resolution half is covered in `platform-common/src/editions.test.ts`
 * (`NXD-081`). What is left here is the part that touches the world, and its
 * failure modes are file-shaped rather than graph-shaped: a file that is not
 * there, a file that is not YAML, a file that parses into something that is
 * not a catalogue.
 *
 * One distinction carries most of the weight and is easy to get backwards.
 * A **missing** catalogue is not an error — an installation that does not use
 * editions is a legitimate installation. A **malformed** one is fatal, because
 * degrading to "no editions" would hand an operator an unrestricted
 * installation while they believed they had a scoped one, with nothing in the
 * logs to say so. The tests state both halves so a later "let's be lenient"
 * has to argue with one of them.
 */

import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  DEFAULT_INSTALLATION_ID,
  loadEditionCatalogue,
  resolveInstallation,
} from './installation';
import type { EditionCatalogue } from '@internal/platform-common';

const CATALOGUE_YAML = `
editions:
  - id: nexora-core
    displayName: Nexora Core
    capabilities: [artifact-marketplace]
    featuredArtifacts: []
  - id: nexora-life-sciences
    displayName: Nexora Life Sciences
    extends: nexora-core
    capabilities: [urs-composer]
    featuredArtifacts: ["nexora/oee-data-product@1.0.0"]
`;

const CATALOGUE: EditionCatalogue = {
  editions: [
    {
      id: 'nexora-core',
      displayName: 'Nexora Core',
      capabilities: ['artifact-marketplace'],
      featuredArtifacts: [],
    },
    {
      id: 'nexora-life-sciences',
      displayName: 'Nexora Life Sciences',
      extends: 'nexora-core',
      capabilities: ['urs-composer'],
      featuredArtifacts: [],
    },
  ],
};

describe('loadEditionCatalogue', () => {
  let directory: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'nexora-editions-'));
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('reads and returns a valid catalogue', async () => {
    const path = join(directory, 'editions.yaml');
    await writeFile(path, CATALOGUE_YAML);

    const loaded = await loadEditionCatalogue(path);

    expect(loaded?.editions.map(e => e.id)).toEqual([
      'nexora-core',
      'nexora-life-sciences',
    ]);
  });

  it('treats a missing file as no editions, not as an error', async () => {
    // The deliberate half of the asymmetry. An installation that does not use
    // editions must start.
    await expect(
      loadEditionCatalogue(join(directory, 'absent.yaml')),
    ).resolves.toBeUndefined();
  });

  it('throws on a malformed catalogue rather than degrading to no editions', async () => {
    // The other half, and the one that matters: silently dropping to "no
    // editions" ships everything everywhere, which is the precise failure an
    // edition exists to prevent.
    const path = join(directory, 'editions.yaml');
    await writeFile(
      path,
      'editions:\n  - id: nexora-core\n    extends: nexora-ghost\n',
    );

    await expect(loadEditionCatalogue(path)).rejects.toThrow(
      /is invalid:.*nexora-ghost.*not declared/s,
    );
  });

  it('names the file it could not accept', async () => {
    // An operator with several config files needs to know which one is wrong.
    const path = join(directory, 'editions.yaml');
    await writeFile(path, 'editions: not-a-list\n');

    await expect(loadEditionCatalogue(path)).rejects.toThrow(path);
  });

  it('throws on a file that is not YAML at all', async () => {
    const path = join(directory, 'editions.yaml');
    await writeFile(path, '\tthis: [is not: yaml\n');

    await expect(loadEditionCatalogue(path)).rejects.toThrow();
  });

  it('throws on an empty file rather than reading it as no editions', async () => {
    // An empty file parses to null, which is not a catalogue. Distinct from a
    // missing file on purpose: someone truncated this, and truncation is not a
    // statement about editions.
    const path = join(directory, 'editions.yaml');
    await writeFile(path, '');

    await expect(loadEditionCatalogue(path)).rejects.toThrow(
      /must be a mapping/,
    );
  });

  it('propagates an error that is not a missing file', async () => {
    // A directory where a file is expected reads as EISDIR, not ENOENT. Only
    // ENOENT means "no editions"; everything else is a real I/O problem and
    // must not be swallowed.
    await expect(loadEditionCatalogue(directory)).rejects.toThrow();
  });
});

describe('resolveInstallation', () => {
  it('falls back to a default id, and to the id as display name', () => {
    expect(resolveInstallation({})).toEqual({
      id: DEFAULT_INSTALLATION_ID,
      displayName: DEFAULT_INSTALLATION_ID,
      edition: undefined,
      availableEditions: [],
    });
  });

  it.each([
    ['a blank', '   '],
    ['an empty', ''],
  ])('treats %s configured id as absent', (_label, id) => {
    expect(resolveInstallation({ id }).id).toBe(DEFAULT_INSTALLATION_ID);
  });

  it('trims a configured id and display name', () => {
    const identity = resolveInstallation({
      id: '  edge-basel  ',
      displayName: '  Basel Edge  ',
    });
    expect(identity).toMatchObject({
      id: 'edge-basel',
      displayName: 'Basel Edge',
    });
  });

  it('runs no edition when none is configured, even with a catalogue', () => {
    // Having a catalogue is not choosing an edition. This is the state every
    // installation was in before NXD-078 and it stays legitimate.
    const identity = resolveInstallation({ catalogue: CATALOGUE });

    expect(identity.edition).toBeUndefined();
    expect(identity.availableEditions.map(e => e.id)).toEqual([
      'nexora-core',
      'nexora-life-sciences',
    ]);
  });

  it('resolves the configured edition through its extends chain', () => {
    const identity = resolveInstallation({
      editionId: 'nexora-life-sciences',
      catalogue: CATALOGUE,
    });

    expect(identity.edition).toMatchObject({
      id: 'nexora-life-sciences',
      lineage: ['nexora-life-sciences', 'nexora-core'],
      capabilities: ['urs-composer', 'artifact-marketplace'],
    });
  });

  it('throws on a configured edition the catalogue does not declare', () => {
    // Almost always a typo. Falling back to no edition would hand the operator
    // an unrestricted installation while they believed they had a scoped one —
    // and the permissive default elsewhere in this module is only defensible
    // because this case is loud.
    expect(() =>
      resolveInstallation({
        editionId: 'nexora-lifesciences',
        catalogue: CATALOGUE,
      }),
    ).toThrow(
      'Configured edition "nexora-lifesciences" is not declared in the edition ' +
        'catalogue. Declared editions: nexora-core, nexora-life-sciences.',
    );
  });

  it('says "none" rather than an empty list when no catalogue was loaded', () => {
    // The message has to be useful in the case an operator is most likely to
    // hit: edition configured, catalogue file missing entirely.
    expect(() => resolveInstallation({ editionId: 'nexora-core' })).toThrow(
      /Declared editions: none\./,
    );
  });

  it('treats a blank edition id as no edition rather than as a lookup', () => {
    expect(
      resolveInstallation({ editionId: '   ', catalogue: CATALOGUE }).edition,
    ).toBeUndefined();
  });

  it('trims a configured edition id before looking it up', () => {
    expect(
      resolveInstallation({
        editionId: ' nexora-core ',
        catalogue: CATALOGUE,
      }).edition?.id,
    ).toBe('nexora-core');
  });

  it('refuses an invalid catalogue instead of reporting no editions', () => {
    expect(() =>
      resolveInstallation({
        catalogue: { editions: [{ id: 'Bad Id' } as never] },
      }),
    ).toThrow(/Invalid edition catalogue/);
  });
});
