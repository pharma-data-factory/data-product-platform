/**
 * A Golden Path ships the requirements it satisfies.
 *
 * The template declares a requirement set key in its annotations; the
 * requirements themselves live in urs.yaml beside it. Both have to agree, and
 * both have to keep up with the URS library they were derived from — a
 * template claiming URS-EPM while shipping four of its five requirements
 * understates what the path is held to, and nobody downstream can tell.
 *
 * Sits beside platformPolicyParity.test.ts and compatibilityPolicyParity.test.ts,
 * which do the same job for the two policy documents, and reads every file from
 * disk rather than importing across a workspace boundary.
 */

import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

const ROOT = path.resolve(__dirname, '../../..');
const TEMPLATE = 'oee-data-product';
const SET_KEY = 'URS-EPM';

function templateSource(): string {
  return fs.readFileSync(
    path.join(ROOT, 'templates', TEMPLATE, 'template.yaml'),
    'utf8',
  );
}

function shippedRequirements(): any {
  return yaml.parse(
    fs.readFileSync(path.join(ROOT, 'templates', TEMPLATE, 'urs.yaml'), 'utf8'),
  );
}

describe('shipped template requirements', () => {
  it('is a versioned document rather than a bare list', () => {
    // The artifact outlives the installation that produced it, so the format
    // has to be able to change without stranding what is already out there.
    const doc = shippedRequirements();

    expect(doc.apiVersion).toBe('dataprod.platform/v1alpha1');
    expect(doc.kind).toBe('TemplateRequirements');
  });

  it('carries the requirements as a provenance chain', () => {
    // A single entry today, but the shape has to admit a second: an
    // organization that extends this path and passes it on appends rather
    // than edits, or the trail of who required what is lost.
    const { inherited } = shippedRequirements().spec;

    expect(Array.isArray(inherited)).toBe(true);
    expect(inherited.length).toBeGreaterThan(0);

    for (const entry of inherited) {
      expect(entry.source).toBeTruthy();
      expect(entry.requirementSetKey).toBeTruthy();
      expect(entry.requirements.length).toBeGreaterThan(0);
    }
  });

  it('declares in the template the set key it ships', () => {
    // The annotation is what the Marketplace and the template card read. If it
    // drifted from the artifact, the card would advertise requirements the
    // template does not contain.
    const keys = shippedRequirements().spec.inherited.map(
      (entry: any) => entry.requirementSetKey,
    );

    expect(keys).toContain(SET_KEY);
    expect(templateSource()).toContain(
      `dataprod.platform/urs-satisfies: ${SET_KEY}`,
    );
  });

  it('declares a requirement count matching what it ships', () => {
    // The count is denormalized into an annotation so the Marketplace can size
    // the claim without fetching the artifact. Denormalized numbers go stale;
    // this is what stops that one.
    const shipped = shippedRequirements().spec.inherited.reduce(
      (total: number, entry: any) => total + entry.requirements.length,
      0,
    );

    expect(templateSource()).toContain(
      `dataprod.platform/urs-requirement-count: '${shipped}'`,
    );
  });

  it('gives every requirement an id belonging to its set', () => {
    for (const entry of shippedRequirements().spec.inherited) {
      for (const requirement of entry.requirements) {
        expect(requirement.id.startsWith(`${entry.requirementSetKey}-`)).toBe(
          true,
        );
        expect(requirement.statement).toBeTruthy();
      }
    }
  });

  it('ships every requirement the seeded set defines', () => {
    // STAND-IN drift guard. urs.yaml is derived by hand from the seed until the
    // release-time export from an APPROVED baseline exists, so nothing but this
    // stops the two from parting company. It reads the seed as text on purpose:
    // parity tests here do not import across workspaces, and the alternative —
    // widening the plugin's public API for a test — is the worse trade.
    // Delete this case once the export step owns the file.
    const seed = fs.readFileSync(
      path.join(
        ROOT,
        'plugins/urs-composer-backend/src/data/seedRequirementSets.ts',
      ),
      'utf8',
    );
    const seeded = [
      ...seed.matchAll(new RegExp(`requirementId: '(${SET_KEY}-\\d+)'`, 'g')),
    ].map(match => match[1]);

    const entry = shippedRequirements().spec.inherited.find(
      (item: any) => item.requirementSetKey === SET_KEY,
    );

    expect(seeded.length).toBeGreaterThan(0);
    expect(entry.requirements.map((r: any) => r.id).sort()).toEqual(
      seeded.sort(),
    );
  });
});
