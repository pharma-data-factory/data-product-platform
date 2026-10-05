/* eslint-disable no-restricted-imports */
// Reads the repository to prove the documents and headings still exist.
import fs from 'fs';
import path from 'path';
import {
  isPublicDocsPath,
  PUBLIC_DOCS,
  publicDocFor,
  publicDocsEnabled,
} from './constants';

const ROOT = path.resolve(__dirname, '../../../../..');

describe('public installation docs (NXD-114)', () => {
  it('recognises /install and its documents, and nothing else', () => {
    expect(isPublicDocsPath('/install')).toBe(true);
    expect(isPublicDocsPath('/install/')).toBe(true);
    expect(isPublicDocsPath('/install/github')).toBe(true);
    expect(isPublicDocsPath('/installer')).toBe(false);
    expect(isPublicDocsPath('/docs')).toBe(false);
  });

  it('finds a document by slug', () => {
    expect(publicDocFor('/install/github')?.path).toBe('docs/github-setup.md');
    expect(publicDocFor('/install')).toBeUndefined();
    expect(publicDocFor('/install/no-such-doc')).toBeUndefined();
  });

  it('is on unless switched off, including the string an env var produces', () => {
    const config = (value: boolean | undefined) => ({
      getOptionalBoolean: () => value,
    });
    expect(publicDocsEnabled(config(undefined))).toBe(true);
    expect(publicDocsEnabled(config(true))).toBe(true);
    expect(publicDocsEnabled(config(false))).toBe(false);
  });

  it.each(PUBLIC_DOCS.map(doc => [doc.path]))('%s exists', docPath => {
    // A moved file must fail here, not on the page.
    expect(fs.existsSync(path.join(ROOT, docPath))).toBe(true);
  });

  it.each(
    PUBLIC_DOCS.filter(doc => doc.section).map(doc => [doc.path, doc.section!]),
  )('%s still has the heading "%s"', (docPath, section) => {
    // A renamed heading would silently show the whole file instead.
    expect(fs.readFileSync(path.join(ROOT, docPath), 'utf8')).toMatch(
      new RegExp(`^#{1,6} ${section}$`, 'm'),
    );
  });

  it('publishes no audit, strategy or decision record', () => {
    for (const doc of PUBLIC_DOCS) {
      expect(doc.path).not.toMatch(
        /audits|nexora-transformation|commercial|strategy|archive/i,
      );
    }
  });
});
