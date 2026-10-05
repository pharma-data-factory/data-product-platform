/**
 * The OEE Golden Path ships test evidence for the requirements it ships
 * (NXD-122).
 *
 * `urs.yaml` declares the URS-EPM requirements the path satisfies; the tests
 * name the ones they verify with `@pytest.mark.urs(...)`; the generated CI
 * uploads the outcomes as the artifact Nexora reads. Pinned here, from the
 * files on disk, so that none of the three can drift from the others — and
 * so that a test file the CI never runs is caught: the loss tests were not
 * in the CI's list until this check existed.
 */

import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

const CONTENT = path.resolve(
  __dirname,
  '../../../templates/oee-data-product/content',
);
const TESTS = path.join(CONTENT, 'tests');

function shippedRequirementIds(): string[] {
  const doc = yaml.parse(
    fs.readFileSync(path.join(CONTENT, '..', 'urs.yaml'), 'utf8'),
  );
  return doc.spec.inherited.flatMap((entry: any) =>
    entry.requirements.map((r: any) => r.id as string),
  );
}

function testFiles(): string[] {
  return fs
    .readdirSync(TESTS)
    .filter(f => /^test_.*\.py$/.test(f))
    .sort();
}

function markedIds(file: string): string[] {
  const source = fs.readFileSync(path.join(TESTS, file), 'utf8');
  return [...source.matchAll(/pytest\.mark\.urs\(([^)]*)\)/g)].flatMap(m =>
    [...m[1].matchAll(/"([^"]+)"/g)].map(id => id[1]),
  );
}

describe('OEE Golden Path test evidence (NXD-122)', () => {
  it('verifies every shipped requirement with at least one test', () => {
    const marked = new Set(testFiles().flatMap(markedIds));
    expect(shippedRequirementIds().filter(id => !marked.has(id))).toEqual([]);
  });

  it('names no requirement the path does not ship', () => {
    const shipped = new Set(shippedRequirementIds());
    const unknown = testFiles().flatMap(f =>
      markedIds(f)
        .filter(id => !shipped.has(id))
        .map(id => `${f}: ${id}`),
    );
    expect(unknown).toEqual([]);
  });

  it('runs every test file in CI', () => {
    const workflows = ['ci.yml', 'data-product-quality.yml']
      .map(f =>
        fs.readFileSync(path.join(CONTENT, '.github/workflows', f), 'utf8'),
      )
      .join('\n');
    expect(testFiles().filter(f => !workflows.includes(`tests/${f}`))).toEqual(
      [],
    );
  });

  it('uploads the evidence even when a test step failed', () => {
    const quality = yaml.parse(
      fs.readFileSync(
        path.join(CONTENT, '.github/workflows/data-product-quality.yml'),
        'utf8',
      ),
    );
    const steps = Object.values<any>(quality.jobs).flatMap(job => job.steps);
    const upload = steps.find(s => s.name === 'Upload test evidence');
    expect(upload).toMatchObject({
      if: 'always()',
      uses: 'actions/upload-artifact@v4',
      with: { name: 'nexora-test-evidence', path: 'test-evidence/' },
    });
  });

  it('writes evidence from conftest without a plugin', () => {
    const conftest = fs.readFileSync(path.join(TESTS, 'conftest.py'), 'utf8');
    expect(conftest).toContain('"apiVersion": "nexora.test-evidence/v1"');
    expect(conftest).toContain('def pytest_sessionfinish');
    expect(fs.readFileSync(path.join(CONTENT, '.gitignore'), 'utf8')).toContain(
      'test-evidence/',
    );
  });
});
