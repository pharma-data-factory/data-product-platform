import { getNexoraCssVariables } from './cssVariables';
import { nexoraColors, nexoraTypography } from './tokens';

describe('nexora design tokens', () => {
  it('exposes distinct light and dark semantic surfaces', () => {
    expect(nexoraColors.light.surface).toBe('#F4F6F8');
    expect(nexoraColors.dark.surface).toBe('#071521');
    expect(nexoraColors.light.accentReadable).toBe('#0098AB');
    expect(nexoraColors.light.text).not.toBe(nexoraColors.dark.text);
  });

  it('maps CSS variables for the active mode including typography', () => {
    const light = getNexoraCssVariables('light');
    const dark = getNexoraCssVariables('dark');
    expect(light['--nexora-color-surface']).toBe(nexoraColors.light.surface);
    expect(dark['--nexora-color-surface']).toBe(nexoraColors.dark.surface);
    expect(light['--nexora-font-display']).toBe(
      nexoraTypography.fontFamily.display,
    );
    expect(light['--nx-cyan']).toBe(nexoraColors.light.accent);
  });
});
