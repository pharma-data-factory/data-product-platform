import fs from 'fs';
import path from 'path';

/**
 * NXD-095. Two accessibility rules that regress silently, checked as text.
 *
 * An icon-only button with only a `title` has no dependable accessible name,
 * and three shipped that way in the URS wizard and approval page. A
 * `readOnly` checkbox inside a clickable card made the wizard's first step
 * impossible to complete from a keyboard. Neither shows up in a visual
 * review, and there is no axe run in CI yet to catch them.
 */

const ROOT = path.resolve(__dirname, '../../..');

function frontendSources(): string[] {
  const roots = [path.join(ROOT, 'packages/app/src')];
  for (const plugin of fs.readdirSync(path.join(ROOT, 'plugins'))) {
    if (plugin.endsWith('-backend')) continue;
    const src = path.join(ROOT, 'plugins', plugin, 'src');
    if (fs.existsSync(src)) roots.push(src);
  }
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.tsx$/.test(entry.name) && !/\.test\.tsx$/.test(entry.name)) {
        files.push(full);
      }
    }
  };
  roots.forEach(walk);
  return files;
}

/** Opening tags of `name`, tolerating `=>` inside attribute expressions. */
function openingTags(source: string, name: string): string[] {
  return source.match(new RegExp(`<${name}\\b(?:=>|[^>])*>`, 'g')) ?? [];
}

describe('frontend accessibility guards (NXD-095)', () => {
  const files = frontendSources();

  it('scans the frontend packages', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it('gives every IconButton an aria-label', () => {
    const offenders = files.flatMap(file =>
      openingTags(fs.readFileSync(file, 'utf8'), 'IconButton')
        .filter(tag => !/aria-label/.test(tag))
        .map(tag => `${path.relative(ROOT, file)}: ${tag.replace(/\s+/g, ' ')}`),
    );
    expect(offenders).toEqual([]);
  });

  it('never renders a readOnly Checkbox, which a keyboard cannot change', () => {
    const offenders = files.flatMap(file =>
      openingTags(fs.readFileSync(file, 'utf8'), 'Checkbox')
        .filter(tag => /\breadOnly\b/.test(tag))
        .map(tag => `${path.relative(ROOT, file)}: ${tag.replace(/\s+/g, ' ')}`),
    );
    expect(offenders).toEqual([]);
  });
});
