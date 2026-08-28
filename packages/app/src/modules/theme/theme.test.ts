import {
  PHARMA_NAVY,
  PHARMA_TEAL,
  pharmaDataFactoryDarkTheme,
  pharmaDataFactoryTheme,
} from './theme';

describe('nexora themes', () => {
  it('uses a light industrial palette with navy and cyan', () => {
    expect(PHARMA_NAVY).toBe('#0A1929');
    expect(PHARMA_TEAL).toBe('#00C2D9');
    const palette = pharmaDataFactoryTheme.getTheme('v4')?.palette;
    expect(palette?.background?.default).toBe('#F4F6F8');
    expect(palette?.primary?.main).toBe(PHARMA_NAVY);
    expect(palette?.secondary?.main).toBe(PHARMA_TEAL);
    expect(palette?.navigation?.background).toBe(PHARMA_NAVY);
    expect(
      (palette as { type?: string } | undefined)?.type,
    ).toBe('light');
  });

  it('provides a dark variant for the top-right theme switch', () => {
    const palette = pharmaDataFactoryDarkTheme.getTheme('v4')?.palette;
    expect(
      (palette as { type?: string } | undefined)?.type,
    ).toBe('dark');
    expect(palette?.background?.default).toBe('#071521');
    expect(palette?.primary?.main).toBe(PHARMA_TEAL);
    expect(palette?.navigation?.background).toBe('#05101C');
    expect(palette?.secondary?.main).toBe('#5EE4F0');
  });

  it('gives table cells readable padding without changing brand colors', () => {
    const overrides = (
      pharmaDataFactoryTheme.getTheme('v4') as
        | { overrides?: { MuiTableCell?: { root?: { padding?: string } } } }
        | undefined
    )?.overrides;
    expect(overrides?.MuiTableCell?.root?.padding).toBe('14px 16px');
  });
});
