import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StatusChip } from './shared';

function chipRoot(label: string) {
  return screen.getByText(label).closest('.MuiChip-root') as HTMLElement;
}

describe('StatusChip', () => {
  it('uses Nexora pass tone for PASS', () => {
    render(<StatusChip value="PASS" />);
    expect(chipRoot('PASS')).toHaveStyle({
      backgroundColor: '#0D9488',
      color: '#FFFFFF',
    });
  });

  it('uses warn tone for NOT_VALIDATED', () => {
    render(<StatusChip value="NOT_VALIDATED" />);
    expect(chipRoot('NOT_VALIDATED')).toHaveStyle({
      backgroundColor: '#FF8A00',
      color: '#FFFFFF',
    });
  });

  it('uses fail tone for FAIL', () => {
    render(<StatusChip value="FAIL" />);
    expect(chipRoot('FAIL')).toHaveStyle({
      backgroundColor: '#B91C1C',
      color: '#FFFFFF',
    });
  });
});
