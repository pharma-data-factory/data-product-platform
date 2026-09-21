/**
 * Contrast guardrail for the semantic tones.
 *
 * This asserts a property, not a set of hex values: any future colour change
 * that drops a pair below the WCAG 2.1 AA threshold fails here, instead of
 * shipping unreadable text. It is what caught the original defects — brand
 * cyan as text was 2.16:1, and the "approved" teal 3.74:1.
 */
import {
  NEXORA_CARD,
  NEXORA_GREY,
  NEXORA_TONE,
  NexoraToneName,
} from './tokens';

const AA_NORMAL_TEXT = 4.5;

/** Composites rgba() over a backdrop; plain hex passes through. */
function toRgb(color: string, backdrop: [number, number, number]): [number, number, number] {
  const rgba = /^rgba?\(([^)]+)\)$/.exec(color.trim());
  if (rgba) {
    const parts = rgba[1].split(',').map(p => Number(p.trim()));
    const [r, g, b] = parts;
    const alpha = parts.length > 3 ? parts[3] : 1;
    return [r, g, b].map((c, i) =>
      Math.round(c * alpha + backdrop[i] * (1 - alpha)),
    ) as [number, number, number];
  }
  const hex = color.replace('#', '');
  return [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16)) as [
    number,
    number,
    number,
  ];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(foreground: string, background: string): number {
  const card = toRgb(NEXORA_CARD, [255, 255, 255]);
  const bg = toRgb(background, card);
  const fg = toRgb(foreground, bg);
  const a = relativeLuminance(fg);
  const b = relativeLuminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const TONES = Object.keys(NEXORA_TONE) as NexoraToneName[];

describe('semantic tone contrast', () => {
  it.each(TONES)('%s: foreground on its own fill is readable', tone => {
    const { bg, fg } = NEXORA_TONE[tone];
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it.each(TONES)('%s: text variant is readable on a card', tone => {
    expect(
      contrastRatio(NEXORA_TONE[tone].text, NEXORA_CARD),
    ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it('body and muted text are readable on the lightest greys', () => {
    for (const surface of [NEXORA_CARD, NEXORA_GREY[50], NEXORA_GREY[100]]) {
      expect(contrastRatio(NEXORA_GREY[900], surface)).toBeGreaterThanOrEqual(
        AA_NORMAL_TEXT,
      );
      expect(contrastRatio(NEXORA_GREY[600], surface)).toBeGreaterThanOrEqual(
        AA_NORMAL_TEXT,
      );
    }
  });

  it('computes known ratios correctly', () => {
    // Sanity check on the maths itself, against hand-verified values.
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 1);
    expect(contrastRatio('#00C2D9', '#FFFFFF')).toBeCloseTo(2.16, 1);
  });
});
