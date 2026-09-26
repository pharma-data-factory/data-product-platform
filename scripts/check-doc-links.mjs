#!/usr/bin/env node
/**
 * Nexora — Documentation Link Integrity
 *
 * Verifies that every relative link in the maintained documentation resolves
 * to a file that exists. Node standard library only.
 *
 * Scope, and why:
 *   - `docs/**` except `docs/archive/**` — the archive is historical by
 *     definition (CLAUDE.md section 1) and its links describe where things
 *     used to be. Repairing them would falsify the record.
 *   - the root governance documents, which are loaded or read first.
 *
 * Not checked: absolute `/...` targets (application routes such as
 * `/platform/architecture`, not files), external URLs, and `#anchors`.
 *
 * Case matters. A link to `./CONTRACTS.md` when the file is `./contracts.md`
 * resolves on macOS and Windows and 404s on Linux and in CI, so the check
 * compares against the real directory entry rather than asking the
 * filesystem.
 *
 * Exit 0 = every link resolves. Exit 1 = at least one does not.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const ROOT_DOCS = [
  'README.md',
  'START.md',
  'ROADMAP.md',
  'NEXORA_STRATEGY.md',
  'AGENTS.md',
  'CLAUDE.md',
];
const SKIP_DIRS = new Set(['archive', 'node_modules']);
const LINK = /\]\(\s*([^)\s]+?)\s*(?:#[^)]*)?\)/g;

/** Markdown files under `dir`, skipping SKIP_DIRS at any depth. */
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) walk(path.join(dir, e.name), out);
    } else if (e.name.endsWith('.md')) {
      out.push(path.join(dir, e.name));
    }
  }
  return out;
}

/** Case-sensitive existence check, so CI and macOS agree. */
function existsExact(target) {
  const dir = path.dirname(target);
  if (!fs.existsSync(dir)) return false;
  try {
    return fs.readdirSync(dir).includes(path.basename(target));
  } catch {
    return false;
  }
}

/** @returns {{ filesChecked: number, broken: Array<{file: string, href: string}> }} */
export function checkDocLinks() {
  const files = [...ROOT_DOCS.filter(f => fs.existsSync(f)), ...walk('docs')];
  const broken = [];

  for (const file of files) {
    const from = path.dirname(file);
    const text = fs.readFileSync(file, 'utf8');
    for (const [, href] of text.matchAll(LINK)) {
      if (/^(https?:|mailto:|#|\/)/.test(href)) continue;
      const target = path.resolve(from, decodeURI(href));
      if (!target.startsWith(ROOT)) continue; // outside the repository
      if (!existsExact(target)) broken.push({ file, href });
    }
  }

  return { filesChecked: files.length, broken };
}

/** One broken link per line, grouped by the file that contains it. */
export function formatBroken(broken) {
  const lines = [];
  let current = '';
  for (const { file, href } of broken) {
    if (file !== current) {
      lines.push(`  ${file}`);
      current = file;
    }
    lines.push(`      -> ${href}`);
  }
  return lines.join('\n');
}

// Standalone invocation only. verify-platform-guardrails.mjs imports
// checkDocLinks() and reports through its own findings model instead.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const { filesChecked, broken } = checkDocLinks();
  if (broken.length) {
    console.error(`\nDOC_LINK_INTEGRITY — ${broken.length} broken link(s):\n`);
    console.error(formatBroken(broken));
    console.error(
      `\nFix the path, point at the document that answers the question, or ` +
        `state the gap in prose. Do not link a page that was never written.\n`,
    );
    process.exit(1);
  }
  console.log(
    `DOC_LINK_INTEGRITY: ${filesChecked} files checked, all relative links resolve.`,
  );
}
