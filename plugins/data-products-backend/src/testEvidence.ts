/**
 * The test evidence a Golden Path's CI uploads (NXD-123; written by NXD-122).
 *
 * GitHub serves an Actions artifact as a zip. Reading one takes a central
 * directory walk and `zlib.inflateRawSync`, so it is done here rather than
 * with a zip library: no new dependency for forty lines. Bounded, because the
 * zip comes from a repository and is not trusted — entry count, per-entry and
 * total size are capped, and only stored or deflated entries are read.
 */

import { inflateRawSync } from 'zlib';

export const TEST_EVIDENCE_ARTIFACT = 'nexora-test-evidence';
const EVIDENCE_API_VERSION = 'nexora.test-evidence/v1';

const MAX_ENTRIES = 200;
const MAX_ENTRY_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;

export interface ZipEntry {
  name: string;
  data: Buffer;
}

/** The files of a zip archive. Throws on anything it cannot read safely. */
export function readZip(archive: Buffer): ZipEntry[] {
  // End of central directory: signature 0x06054b50, within the last 64 KiB.
  let eocd = -1;
  for (let i = archive.length - 22; i >= Math.max(0, archive.length - 65557); i--) {
    if (archive.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) {
    throw new Error('Not a zip archive');
  }
  const count = archive.readUInt16LE(eocd + 10);
  if (count > MAX_ENTRIES) {
    throw new Error(`Zip has ${count} entries; at most ${MAX_ENTRIES} are read`);
  }
  let offset = archive.readUInt32LE(eocd + 16);
  const entries: ZipEntry[] = [];
  let total = 0;
  for (let n = 0; n < count; n++) {
    if (archive.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error('Corrupt zip central directory');
    }
    const method = archive.readUInt16LE(offset + 10);
    const compressedSize = archive.readUInt32LE(offset + 20);
    const size = archive.readUInt32LE(offset + 24);
    const nameLength = archive.readUInt16LE(offset + 28);
    const extraLength = archive.readUInt16LE(offset + 30);
    const commentLength = archive.readUInt16LE(offset + 32);
    const localOffset = archive.readUInt32LE(offset + 42);
    const name = archive.toString('utf8', offset + 46, offset + 46 + nameLength);
    offset += 46 + nameLength + extraLength + commentLength;

    if (name.endsWith('/')) {
      continue;
    }
    total += size;
    if (size > MAX_ENTRY_BYTES || total > MAX_TOTAL_BYTES) {
      throw new Error('Zip entry exceeds the evidence size limit');
    }
    if (archive.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error('Corrupt zip local header');
    }
    const start =
      localOffset +
      30 +
      archive.readUInt16LE(localOffset + 26) +
      archive.readUInt16LE(localOffset + 28);
    const raw = archive.subarray(start, start + compressedSize);
    let data: Buffer;
    if (method === 0) {
      data = Buffer.from(raw);
    } else if (method === 8) {
      data = inflateRawSync(raw, { maxOutputLength: MAX_ENTRY_BYTES });
    } else {
      throw new Error(`Zip entry ${name} uses unsupported compression ${method}`);
    }
    entries.push({ name, data });
  }
  return entries;
}

export type EvidenceOutcome = 'passed' | 'failed' | 'skipped' | 'error';

export interface EvidenceResult {
  suite: string;
  testCase: string;
  outcome: EvidenceOutcome;
  requirements: string[];
}

const OUTCOMES: readonly string[] = ['passed', 'failed', 'skipped', 'error'];

/**
 * The results in the artifact's JSON files. A file that is not
 * `nexora.test-evidence/v1` is reported, not guessed at.
 */
export function parseEvidence(entries: ZipEntry[]): {
  results: EvidenceResult[];
  ignored: string[];
} {
  const results: EvidenceResult[] = [];
  const ignored: string[] = [];
  for (const entry of entries) {
    if (!entry.name.endsWith('.json')) {
      ignored.push(entry.name);
      continue;
    }
    let doc: any;
    try {
      doc = JSON.parse(entry.data.toString('utf8'));
    } catch {
      ignored.push(entry.name);
      continue;
    }
    if (doc?.apiVersion !== EVIDENCE_API_VERSION || !Array.isArray(doc.results)) {
      ignored.push(entry.name);
      continue;
    }
    const suite = typeof doc.suite === 'string' ? doc.suite : 'pytest';
    for (const r of doc.results) {
      if (
        typeof r?.testCase !== 'string' ||
        !OUTCOMES.includes(r?.outcome) ||
        !Array.isArray(r?.requirements)
      ) {
        continue;
      }
      results.push({
        suite,
        testCase: r.testCase,
        outcome: r.outcome,
        requirements: r.requirements.filter(
          (id: unknown): id is string => typeof id === 'string' && id.length > 0,
        ),
      });
    }
  }
  return { results, ignored };
}
