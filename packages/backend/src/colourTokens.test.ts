/**
 * Keeps migrated files free of raw colour literals.
 *
 * Colours must resolve back to plugins/nexora-common/src/tokens.ts. A raw hex
 * in a component cannot be managed centrally and cannot follow the light/dark
 * switch under User Settings — it simply stays whatever it was.
 *
 * This is a ratchet, not a repo-wide ban: the files below have been migrated
 * and must stay clean. The marketing surfaces under identity/, architecture/,
 * ecosystem/, legal/ and build/ still hold several hundred literals and are
 * deliberately not listed yet. Add a path here as it is migrated.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../../..');

/** Migrated — must contain no raw colour literals. */
const TOKENISED_FILES = [
  'packages/app/src/modules/admin/UsersRolesPage.tsx',
  'packages/app/src/modules/admin/AdminLandingPage.tsx',
  'packages/app/src/modules/products/ProductDetailPage.tsx',
  'plugins/data-products/src/components/CiStatusChip.tsx',
  'plugins/data-products/src/components/StatusChip.tsx',
  'plugins/data-products/src/components/CompatibilityChip.tsx',
  'plugins/nexora-common/src/components/StatusBadge.tsx',
  'plugins/urs-composer/src/pages/URSLibraryPage.tsx',
  'plugins/urs-composer/src/pages/URSRequirementSetPage.tsx',
];

/** Hex colours and rgb()/rgba() literals. */
const COLOUR_LITERAL = /#[0-9A-Fa-f]{3,8}\b|rgba?\([\d\s.,]+\)/g;

function read(relative: string): string {
  return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

describe('colour tokens', () => {
  it.each(TOKENISED_FILES)('%s uses tokens, not raw colours', relative => {
    const matches = read(relative).match(COLOUR_LITERAL) ?? [];
    expect(matches).toEqual([]);
  });

  it('keeps the palette in the token module, not in component code', () => {
    const tokens = read('plugins/nexora-common/src/tokens.ts');
    expect(tokens).toContain('NEXORA_TONE');
    expect(tokens).toContain('NEXORA_GREY');
    // NEXORA_STATUS used to be declared inside StatusBadge.tsx.
    expect(tokens).toContain('NEXORA_STATUS');
    expect(read('plugins/nexora-common/src/components/StatusBadge.tsx')).not.toMatch(
      /const NEXORA_STATUS\s*=/,
    );
  });

  it('keeps brand colours out of the domain layer', () => {
    // platform-common defines URSStatus; it must name tones, not colours,
    // because the UI palette depends on it and not the other way round.
    const urs = read('packages/platform-common/src/urs.ts');
    expect(urs).toContain('StatusTone');
    expect(urs.match(COLOUR_LITERAL) ?? []).toEqual([]);
  });
});
