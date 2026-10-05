/**
 * Reading the test evidence artifact (NXD-123). The zip comes from a
 * repository, so the reader is pinned on both what it accepts (stored and
 * deflated entries, the v1 evidence shape) and what it refuses.
 */

import { deflateRawSync } from 'zlib';
import { parseEvidence, readZip } from './testEvidence';

/** A minimal zip writer, enough to produce what GitHub serves. */
function zip(files: Array<{ name: string; data: string; deflate?: boolean }>): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const file of files) {
    const raw = Buffer.from(file.data, 'utf8');
    const body = file.deflate ? deflateRawSync(raw) : raw;
    const name = Buffer.from(file.name, 'utf8');
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(file.deflate ? 8 : 0, 8);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(file.deflate ? 8 : 0, 10);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, name, body);
    centrals.push(central, name);
    offset += local.length + name.length + body.length;
  }
  const cd = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cd.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, eocd]);
}

const evidence = (results: unknown[], extra: Record<string, unknown> = {}) =>
  JSON.stringify({ apiVersion: 'nexora.test-evidence/v1', suite: 'tests/test_api.py', results, ...extra });

describe('test evidence artifact (NXD-123)', () => {
  it('reads stored and deflated entries', () => {
    const entries = readZip(
      zip([
        { name: 'a.json', data: '{"x":1}' },
        { name: 'b.json', data: '{"y":2}'.repeat(50), deflate: true },
      ]),
    );
    expect(entries.map(e => e.name)).toEqual(['a.json', 'b.json']);
    expect(entries[1].data.toString()).toBe('{"y":2}'.repeat(50));
  });

  it('parses v1 results and keeps their requirements', () => {
    const { results, ignored } = parseEvidence(
      readZip(
        zip([
          {
            name: '1.json',
            deflate: true,
            data: evidence([
              { testCase: 'tests/test_api.py::test_a', outcome: 'passed', requirements: ['URS-EPM-004'] },
              { testCase: 'tests/test_api.py::test_b', outcome: 'failed', requirements: ['URS-EPM-004', ''] },
            ]),
          },
        ]),
      ),
    );
    expect(ignored).toEqual([]);
    expect(results).toEqual([
      { suite: 'tests/test_api.py', testCase: 'tests/test_api.py::test_a', outcome: 'passed', requirements: ['URS-EPM-004'] },
      { suite: 'tests/test_api.py', testCase: 'tests/test_api.py::test_b', outcome: 'failed', requirements: ['URS-EPM-004'] },
    ]);
  });

  it('reports files that are not v1 evidence instead of guessing', () => {
    const { results, ignored } = parseEvidence(
      readZip(
        zip([
          { name: 'notes.txt', data: 'hello' },
          { name: 'broken.json', data: '{' },
          { name: 'other.json', data: JSON.stringify({ apiVersion: 'v0', results: [] }) },
          { name: 'odd.json', data: evidence([{ testCase: 't', outcome: 'maybe', requirements: [] }]) },
        ]),
      ),
    );
    expect(ignored).toEqual(['notes.txt', 'broken.json', 'other.json']);
    expect(results).toEqual([]);
  });

  it('refuses something that is not a zip', () => {
    expect(() => readZip(Buffer.from('definitely not a zip archive at all'))).toThrow(
      /Not a zip archive/,
    );
  });

  it('refuses an entry over the size limit', () => {
    const big = 'x'.repeat(6 * 1024 * 1024);
    expect(() => readZip(zip([{ name: 'big.json', data: big, deflate: true }]))).toThrow(
      /size limit/,
    );
  });
});
