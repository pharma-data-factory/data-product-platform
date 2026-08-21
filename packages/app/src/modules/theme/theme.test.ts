import { PHARMA_NAVY, PHARMA_TEAL, pharmaDataFactoryTheme } from './theme';

describe('pharma-data-factory theme', () => {
  it('uses a light industrial palette with navy and cyan', () => {
    expect(PHARMA_NAVY).toBe('#0A1929');
    expect(PHARMA_TEAL).toBe('#00C2D9');
    const palette = pharmaDataFactoryTheme.getTheme('v4')?.palette;
    expect(palette?.background?.default).toBe('#F4F6F8');
    expect(palette?.primary?.main).toBe(PHARMA_NAVY);
    expect(palette?.secondary?.main).toBe(PHARMA_TEAL);
    expect(palette?.navigation?.background).toBe(PHARMA_NAVY);
  });
});
