#!/usr/bin/env node
/**
 * Nexora — Platform Guardrails Guard
 *
 * Mechanically verifies the AGENTS.md repository rules:
 *   - Backstage Core is extended, never patched / vendored / modified
 *   - no private @backstage /src or /dist imports (/alpha = UPGRADE_RISK)
 *   - single package manager (Yarn Berry), no foreign lockfiles
 *   - no unsafe dependency ranges ("latest" / "*")
 *   - dependency baseline drift is inventoried
 *   - root resolutions are classified
 *   - no node_modules mutation scripts
 *   - app/backend thinness + cross-plugin boundaries (warning only)
 *
 * Node.js standard library only. Exit 0 = no hard violations, exit 1 = FAIL.
 * Run from repository root: yarn guard:platform
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';

const ROOT = process.cwd();

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

const findings = { fail: [], warn: [], pass: [] };

const fail = (check, message) => findings.fail.push(`[${check}] ${message}`);
const warn = (check, message) => findings.warn.push(`[${check}] ${message}`);
const pass = (check, message) => findings.pass.push(`[${check}] ${message}`);

// ---------------------------------------------------------------------------
// Filesystem helpers
// ---------------------------------------------------------------------------

const WALK_EXCLUDES = new Set([
  'node_modules',
  '.git',
  '.yarn',
  '.runtime',
  '.pytest_cache',
  'coverage',
  'dist',
  'dist-types',
  'build',
  'var',
  '.tmp',
]);

function walk(dir, onFile, depth = 0, maxDepth = 8) {
  if (depth > maxDepth || !fs.existsSync(dir)) return;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (WALK_EXCLUDES.has(entry.name) || entry.name.startsWith('.git')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, onFile, depth + 1, maxDepth);
    } else if (entry.isFile()) {
      onFile(full);
    }
  }
}

const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function sha256(file) {
  if (!fs.existsSync(file)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function collectWorkspacePackageJsons() {
  const files = [];
  const rootPj = path.join(ROOT, 'package.json');
  if (fs.existsSync(rootPj)) files.push(rootPj);
  for (const base of ['packages', 'plugins']) {
    const dir = path.join(ROOT, base);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      const pj = path.join(dir, name, 'package.json');
      if (fs.existsSync(pj)) files.push(pj);
    }
  }
  return files;
}

// ---------------------------------------------------------------------------
// Baseline echo
// ---------------------------------------------------------------------------

function reportBaseline() {
  const backstageJson = readJson(path.join(ROOT, 'backstage.json'));
  const rootPj = readJson(path.join(ROOT, 'package.json')) || {};
  const yarnrc = fs.existsSync(path.join(ROOT, '.yarnrc.yml'))
    ? fs.readFileSync(path.join(ROOT, '.yarnrc.yml'), 'utf8')
    : '';
  console.log('PLATFORM BASELINE');
  console.log(`  Backstage release baseline : ${backstageJson?.version ?? 'UNKNOWN'}`);
  console.log(`  Package manager            : ${rootPj.packageManager ?? 'UNKNOWN'}`);
  console.log(`  Node engines               : ${rootPj.engines?.node ?? 'UNKNOWN'}`);
  const yarnPath = (yarnrc.match(/yarnPath:\s*(\S+)/) || [])[1];
  console.log(`  Yarn release path          : ${yarnPath ?? 'n/a'}`);
  const lockSum = sha256(path.join(ROOT, 'yarn.lock'));
  console.log(`  yarn.lock sha256           : ${lockSum ?? 'MISSING'}`);
  if (!lockSum) {
    fail('YARN_LOCK', 'yarn.lock is missing — controlled platform baseline artifact absent');
  }
  console.log('');
}

// ---------------------------------------------------------------------------
// CHECK A — Backstage Core patching mechanisms
// ---------------------------------------------------------------------------

function checkPatching() {
  const CHECK = 'BACKSTAGE_CORE_PATCHING';

  // patch-package convention: patches/@backstage+*.patch
  const patchPackageDir = path.join(ROOT, 'patches');
  if (fs.existsSync(patchPackageDir)) {
    for (const f of fs.readdirSync(patchPackageDir)) {
      if (/^@backstage\+/i.test(f)) {
        fail(CHECK, `patch-package patch targets Backstage: patches/${f}`);
      }
    }
  }

  // Yarn Berry patches: .yarn/patches/*backstage*
  const yarnPatches = path.join(ROOT, '.yarn', 'patches');
  if (fs.existsSync(yarnPatches)) {
    for (const f of fs.readdirSync(yarnPatches)) {
      if (/@?backstage/i.test(f)) {
        fail(CHECK, `Yarn patch targets Backstage: .yarn/patches/${f}`);
      }
    }
  }

  // patch-package declared as dependency anywhere
  for (const pj of collectWorkspacePackageJsons()) {
    const j = readJson(pj);
    if (!j) continue;
    for (const sec of ['dependencies', 'devDependencies']) {
      if (j[sec] && j[sec]['patch-package']) {
        warn(CHECK, `patch-package declared in ${rel(pj)} (${sec}) — verify no @backstage patches`);
      }
    }
  }

  // postinstall / any script referencing patch-package
  for (const pj of collectWorkspacePackageJsons()) {
    const j = readJson(pj);
    for (const [name, value] of Object.entries(j?.scripts || {})) {
      if (typeof value === 'string' && /patch-package/.test(value)) {
        warn(CHECK, `script "${name}" in ${rel(pj)} invokes patch-package`);
      }
    }
  }

  // obvious vendored Backstage core directories
  for (const candidate of [
    'backstage-core',
    'backstage-fork',
    'vendored-backstage',
    'backstage-src',
  ]) {
    if (fs.existsSync(path.join(ROOT, candidate))) {
      fail(CHECK, `vendored Backstage directory detected: ${candidate}/`);
    }
  }

  if (!findings.fail.some((f) => f.startsWith(`[${CHECK}]`))) {
    pass(CHECK, 'no Backstage patching mechanisms detected');
  }
}

// ---------------------------------------------------------------------------
// CHECK B — private/internal Backstage imports
// ---------------------------------------------------------------------------

function checkPrivateImports() {
  const CHECK = 'PRIVATE_BACKSTAGE_IMPORTS';
  const ALPHA_CHECK = 'ALPHA_API_USAGE';
  const SOURCE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
  const privateRe = /['"](@backstage\/[^'"]+?\/(?:src|dist)\/[^'"]*)['"]/;
  const alphaRe = /['"](@backstage\/[^'"]+\/alpha)['"]/;
  const privateHits = [];
  const alphaHits = [];

  for (const base of ['packages', 'plugins']) {
    walk(path.join(ROOT, base), (file) => {
      if (!SOURCE_EXT.has(path.extname(file))) return;
      const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
      lines.forEach((line, i) => {
        const priv = line.match(privateRe);
        if (priv) privateHits.push(`${rel(file)}:${i + 1} -> ${priv[1]}`);
        const alpha = line.match(alphaRe);
        if (alpha) alphaHits.push(`${rel(file)}:${i + 1} -> ${alpha[1]}`);
      });
    });
  }

  if (privateHits.length) {
    for (const h of privateHits) fail(CHECK, `private Backstage import: ${h}`);
  } else {
    pass(CHECK, 'no @backstage .../src or .../dist imports in owned source');
  }

  if (alphaHits.length) {
    for (const h of alphaHits) {
      warn(ALPHA_CHECK, `UPGRADE_RISK documented /alpha API: ${h}`);
    }
  } else {
    pass(ALPHA_CHECK, 'no /alpha API usage');
  }
}

// ---------------------------------------------------------------------------
// CHECK C — package manager consistency
// ---------------------------------------------------------------------------

function checkPackageManager() {
  const CHECK = 'PACKAGE_MANAGER_CONSISTENCY';
  const FOREIGN_LOCKFILES = new Set([
    'package-lock.json',
    'pnpm-lock.yaml',
    'npm-shrinkwrap.json',
    'bun.lockb',
    'bun.lock',
  ]);
  const hits = [];
  walk(ROOT, (file) => {
    if (FOREIGN_LOCKFILES.has(path.basename(file))) hits.push(rel(file));
  });
  if (hits.length) {
    for (const h of hits) {
      fail(CHECK, `foreign lockfile present: ${h} (Yarn Berry repository)`);
    }
  } else {
    pass(CHECK, 'no npm/pnpm/bun lockfiles detected');
  }
  if (!fs.existsSync(path.join(ROOT, 'yarn.lock'))) {
    fail(CHECK, 'yarn.lock missing');
  }
}

// ---------------------------------------------------------------------------
// CHECK D — unsafe dependency ranges
// ---------------------------------------------------------------------------

// Allowlisted findings with documented reasons (PRE_EXISTING, reviewed in
// PLATFORM_GUARDRAILS_REPORT.md). Key: "<package.json rel>|<section>|<name>".
const UNSAFE_RANGE_ALLOWLIST = new Map([
  [
    'packages/app/package.json|devDependencies|@types/react-dom',
    'PRE_EXISTING type-stub wildcard; React type alignment is already pinned ' +
      'by root resolutions @types/react and @types/react-dom = ^18. ' +
      'Review in next dependency-governance cleanup.',
  ],
]);

function checkUnsafeRanges() {
  const CHECK = 'UNSAFE_DEPENDENCY_RANGES';
  let found = 0;
  for (const pj of collectWorkspacePackageJsons()) {
    const j = readJson(pj);
    if (!j) continue;
    for (const sec of ['dependencies', 'devDependencies', 'peerDependencies']) {
      for (const [name, range] of Object.entries(j[sec] || {})) {
        if (typeof range !== 'string') continue;
        if (range === 'latest' || range === '*') {
          found++;
          const key = `${rel(pj)}|${sec}|${name}`;
          const reason = UNSAFE_RANGE_ALLOWLIST.get(key);
          if (reason) {
            warn(CHECK, `allowlisted unsafe range ${name}@${range} in ${rel(pj)} (${sec}) — ${reason}`);
          } else {
            fail(CHECK, `unsafe dependency range ${name}@${range} in ${rel(pj)} (${sec})`);
          }
        }
      }
    }
  }
  if (!findings.fail.some((f) => f.startsWith(`[${CHECK}]`))) {
    pass(CHECK, found === 0
      ? 'no "latest"/"*" dependency ranges'
      : 'all "latest"/"*" ranges are allowlisted with documented reasons');
  }
}

// ---------------------------------------------------------------------------
// CHECK E — dependency baseline drift inventory
// ---------------------------------------------------------------------------

function parseMajor(range) {
  const m = String(range).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function checkDependencyBaseline() {
  const CHECK = 'DEPENDENCY_BASELINE';
  const FAMILIES = {
    backstage: (n) => n.startsWith('@backstage/'),
    community: (n) => n.startsWith('@backstage-community/'),
    react: (n) => n === 'react' || n === 'react-dom',
    mui: (n) => n.startsWith('@mui/') || n.startsWith('@material-ui/'),
    typescript: (n) => n === 'typescript',
  };
  // family -> package -> range -> [workspaces]
  const inventory = {};
  const muiGenerations = new Set();

  for (const pj of collectWorkspacePackageJsons()) {
    const j = readJson(pj);
    if (!j) continue;
    const ws = rel(pj);
    for (const sec of ['dependencies', 'devDependencies', 'peerDependencies']) {
      for (const [name, range] of Object.entries(j[sec] || {})) {
        if (typeof range !== 'string') continue;
        for (const [family, match] of Object.entries(FAMILIES)) {
          if (!match(name)) continue;
          inventory[family] = inventory[family] || {};
          inventory[family][name] = inventory[family][name] || {};
          (inventory[family][name][range] = inventory[family][name][range] || []).push(ws);
          if (family === 'mui') {
            muiGenerations.add(name.startsWith('@mui/') ? 'mui-v5+' : 'material-ui-v4');
          }
        }
      }
    }
  }

  console.log('DEPENDENCY BASELINE INVENTORY');
  for (const [family, packages] of Object.entries(inventory)) {
    console.log(`  ${family}:`);
    for (const [name, ranges] of Object.entries(packages).sort()) {
      const rangeList = Object.keys(ranges);
      const drift = rangeList.length > 1 ? '  <-- conflicting ranges' : '';
      console.log(`    ${name}${drift}`);
      for (const r of rangeList) {
        console.log(`      ${r}  (${ranges[r].length} workspace(s))`);
      }
    }
  }
  console.log('');

  // React: conflicting MAJORS are a hard failure; same-major drift is a warning.
  for (const pkg of ['react', 'react-dom']) {
    const ranges = inventory.react?.[pkg];
    if (!ranges) continue;
    const majors = new Set(Object.keys(ranges).map(parseMajor));
    if (majors.size > 1) {
      fail(CHECK, `React major drift in ${pkg}: ${Object.keys(ranges).join(' vs ')}`);
    } else if (Object.keys(ranges).length > 1) {
      warn(CHECK, `REVIEW_REQUIRED ${pkg} range drift (same major): ${Object.keys(ranges).join(' vs ')}`);
    }
  }

  // Mixed Material UI generations (v4 + v5) without explicit approval is a failure.
  if (muiGenerations.size > 1) {
    fail(CHECK, `mixed Material UI generations in use: ${[...muiGenerations].join(' + ')}`);
  } else {
    pass(CHECK, `Material UI generation consistent: ${[...muiGenerations].join(', ') || 'none'}`);
  }

  // Backstage + community packages: different package versions are normal
  // (Backstage packages do not share one npm version). Conflicting ranges are
  // reported for review, judged against the release baseline, not failed here.
  for (const family of ['backstage', 'community', 'typescript']) {
    for (const [name, ranges] of Object.entries(inventory[family] || {})) {
      const rangeList = Object.keys(ranges);
      if (rangeList.length > 1) {
        const detail = rangeList
          .map((r) => `${r} [${ranges[r].map((w) => path.dirname(w)).join(', ')}]`)
          .join(' vs ');
        warn(CHECK, `REVIEW_REQUIRED ${name} conflicting ranges: ${detail}`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// CHECK F — root resolutions governance
// ---------------------------------------------------------------------------

const RESOLUTION_ALLOWLIST = new Map([
  [
    '@material-ui/lab',
    'PRE_EXISTING baseline resolution aligning the Material UI lab alpha ' +
      'generation with Backstage core-components expectations.',
  ],
  [
    '@backstage/plugin-permission-react',
    'PRE_EXISTING legacy resolution (^0.5.2) while backend declares ^0.7.2. ' +
      'Must be reviewed in a dedicated dependency-governance cleanup gate; ' +
      'not removed during the guardrails gate.',
  ],
]);

function checkResolutions() {
  const CHECK = 'RESOLUTIONS';
  const rootPj = readJson(path.join(ROOT, 'package.json'));
  const resolutions = rootPj?.resolutions || {};
  if (Object.keys(resolutions).length === 0) {
    pass(CHECK, 'no root resolutions declared');
    return;
  }
  console.log('ROOT RESOLUTIONS');
  for (const [target, range] of Object.entries(resolutions)) {
    const coreTarget =
      target.startsWith('@backstage/') ||
      target === 'react' ||
      target === 'react-dom' ||
      target.startsWith('@mui/') ||
      target.startsWith('@material-ui/');
    let classification;
    if (target.startsWith('@types/')) {
      classification = 'BASELINE';
    } else if (coreTarget) {
      classification = RESOLUTION_ALLOWLIST.has(target)
        ? 'REVIEW_REQUIRED (documented)'
        : 'HIGH_RISK';
    } else {
      classification = 'REVIEW_REQUIRED';
    }
    console.log(`  ${target}: ${range}  -> ${classification}`);
    if (classification === 'HIGH_RISK') {
      fail(CHECK, `undocumented HIGH_RISK resolution on core dependency: ${target}@${range}`);
    } else if (classification.startsWith('REVIEW_REQUIRED')) {
      warn(CHECK, `resolution ${target}@${range} — ${RESOLUTION_ALLOWLIST.get(target) || 'review required'}`);
    }
  }
  console.log('');
  if (!findings.fail.some((f) => f.startsWith(`[${CHECK}]`))) {
    pass(CHECK, 'all resolutions classified (no undocumented HIGH_RISK entries)');
  }
}

// ---------------------------------------------------------------------------
// CHECK G — node_modules mutation scripts
// ---------------------------------------------------------------------------

function checkNodeModulesMutation() {
  const CHECK = 'NODE_MODULES_MUTATION';
  const protectedPathRe = /node_modules[\\/]+(@backstage|react|@mui|@material-ui)[\\/]/;
  const mutationVerbs = /\b(rm|rmdir|del|erase|mv|move|cp|copy|sed|patch|truncate|Set-Content|Out-File|writeFile|rmSync|copyFile)\b/;
  const hits = [];

  for (const pj of collectWorkspacePackageJsons()) {
    const j = readJson(pj);
    for (const [name, value] of Object.entries(j?.scripts || {})) {
      if (typeof value !== 'string') continue;
      if (protectedPathRe.test(value) && mutationVerbs.test(value)) {
        hits.push(`${rel(pj)} script "${name}": ${value}`);
      }
    }
  }

  const scriptsDir = path.join(ROOT, 'scripts');
  if (fs.existsSync(scriptsDir)) {
    for (const f of fs.readdirSync(scriptsDir)) {
      if (!/\.(js|mjs|cjs|sh|ps1)$/.test(f)) continue;
      const content = fs.readFileSync(path.join(scriptsDir, f), 'utf8');
      // a script that both addresses a protected node_modules path AND mutates files
      const mutating = /(fs\.(rm|unlink|write|copy|rename)|rmSync|unlinkSync|writeFileSync|copyFileSync)/.test(content);
      if (protectedPathRe.test(content) && mutating) {
        hits.push(`scripts/${f}: writes into protected node_modules paths`);
      }
    }
  }

  if (hits.length) {
    for (const h of hits) fail(CHECK, `node_modules mutation: ${h}`);
  } else {
    pass(CHECK, 'no scripts mutate node_modules/@backstage, react, @mui or @material-ui');
  }
}

// ---------------------------------------------------------------------------
// CHECK H — app/backend composition thinness (WARNING only)
// ---------------------------------------------------------------------------

function countSource(dir) {
  let files = 0;
  let lines = 0;
  walk(dir, (file) => {
    if (!/\.(ts|tsx|js|jsx)$/.test(file)) return;
    files++;
    lines += fs.readFileSync(file, 'utf8').split(/\r?\n/).length;
  });
  return { files, lines };
}

function checkCompositionThinness() {
  const APP_LIMITS = { files: 300, lines: 40000 };
  const BACKEND_LIMITS = { files: 150, lines: 15000 };

  const app = countSource(path.join(ROOT, 'packages', 'app', 'src'));
  const backend = countSource(path.join(ROOT, 'packages', 'backend', 'src'));

  console.log('COMPOSITION LAYER SIZE');
  console.log(`  packages/app/src     : ${app.files} files, ${app.lines} lines`);
  console.log(`  packages/backend/src : ${backend.files} files, ${backend.lines} lines`);
  console.log('');

  if (app.files > APP_LIMITS.files || app.lines > APP_LIMITS.lines) {
    warn(
      'APP_COMPOSITION_WARNING',
      `packages/app/src is large (${app.files} files, ${app.lines} lines) — ` +
        'verify domain logic lives in owned plugins, not the composition layer',
    );
  } else {
    pass('APP_COMPOSITION', `packages/app within composition limits (${app.files} files, ${app.lines} lines)`);
  }

  if (backend.files > BACKEND_LIMITS.files || backend.lines > BACKEND_LIMITS.lines) {
    warn(
      'BACKEND_COMPOSITION_WARNING',
      `packages/backend/src is large (${backend.files} files, ${backend.lines} lines) — ` +
        'verify domain logic lives in owned backend plugins, not the composition layer',
    );
  } else {
    pass('BACKEND_COMPOSITION', `packages/backend within composition limits (${backend.files} files, ${backend.lines} lines)`);
  }
}

// ---------------------------------------------------------------------------
// CHECK I — cross-plugin boundary risks (WARNING only)
// ---------------------------------------------------------------------------

function checkCrossPluginBoundaries() {
  const CHECK = 'CROSS_PLUGIN_BOUNDARY';
  const SOURCE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
  const relativeRe = /from\s+['"](\.\.?\/[^'"]+)['"]/g;
  const privateInternalRe = /['"](@internal\/[^'"]+?\/src\/[^'"]*)['"]/;
  const hits = [];

  const pluginsDir = path.join(ROOT, 'plugins');
  if (!fs.existsSync(pluginsDir)) {
    pass(CHECK, 'no plugins directory');
    return;
  }

  for (const name of fs.readdirSync(pluginsDir)) {
    const pluginSrc = path.join(pluginsDir, name);
    walk(pluginSrc, (file) => {
      if (!SOURCE_EXT.has(path.extname(file))) return;
      const content = fs.readFileSync(file, 'utf8');
      const internal = content.match(privateInternalRe);
      if (internal) {
        hits.push(`${rel(file)} imports private source of another workspace: ${internal[1]}`);
      }
      let m;
      relativeRe.lastIndex = 0;
      while ((m = relativeRe.exec(content)) !== null) {
        const resolved = path.resolve(path.dirname(file), m[1]);
        const resolvedRel = rel(resolved).split('/');
        if (resolvedRel[0] === 'plugins' && resolvedRel[1] && resolvedRel[1] !== name) {
          hits.push(`${rel(file)} imports across plugin boundary into plugins/${resolvedRel[1]}`);
        }
      }
    });
  }

  if (hits.length) {
    for (const h of hits) warn(CHECK, h);
  } else {
    pass(CHECK, 'no cross-plugin private implementation imports detected');
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log('==============================================================');
console.log('NEXORA — PLATFORM GUARDRAILS GUARD');
console.log('==============================================================');
console.log('');

reportBaseline();
checkPatching();
checkPrivateImports();
checkPackageManager();
checkUnsafeRanges();
checkDependencyBaseline();
checkResolutions();
checkNodeModulesMutation();
checkCompositionThinness();
checkCrossPluginBoundaries();

console.log('==============================================================');
console.log('SUMMARY');
console.log('==============================================================');
for (const p of findings.pass) console.log(`PASS     ${p}`);
for (const w of findings.warn) console.log(`WARNING  ${w}`);
for (const f of findings.fail) console.log(`FAIL     ${f}`);
console.log('');
console.log(`PASS: ${findings.pass.length}   WARNING: ${findings.warn.length}   FAIL: ${findings.fail.length}`);

if (findings.fail.length > 0) {
  console.log('\nRESULT: GUARDRAIL_VIOLATION');
  process.exit(1);
}
console.log('\nRESULT: GUARDRAILS_OK');
process.exit(0);
