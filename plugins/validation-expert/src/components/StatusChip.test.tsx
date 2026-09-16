import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NEXORA_TONE } from '@internal/plugin-nexora-common';
import { StatusChip } from './shared';

function chipRoot(label: string) {
  return screen.getByText(label).closest('.MuiChip-root') as HTMLElement;
}

/**
 * These assert that each status maps to the right *semantic tone*, not to a
 * particular hex value. The palette is managed centrally in nexora-common and
 * is allowed to move — it already did once, when the "pass" teal was darkened
 * to clear the WCAG AA contrast threshold. Pinning literals here only produced
 * a stale test that failed while the component was correct.
 */
describe('StatusChip', () => {
  it('uses Nexora pass tone for PASS', () => {
    render(<StatusChip value="PASS" />);
    expect(chipRoot('PASS')).toHaveStyle({
      backgroundColor: NEXORA_TONE.success.bg,
      color: NEXORA_TONE.success.fg,
    });
  });

  it('uses warn tone for NOT_VALIDATED', () => {
    render(<StatusChip value="NOT_VALIDATED" />);
    expect(chipRoot('NOT_VALIDATED')).toHaveStyle({
      color: NEXORA_TONE.warning.fg,
    });
  });

  it('uses fail tone for FAIL', () => {
    render(<StatusChip value="FAIL" />);
    expect(chipRoot('FAIL')).toHaveStyle({
      backgroundColor: NEXORA_TONE.danger.bg,
      color: NEXORA_TONE.danger.fg,
    });
  });
});
