import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CompatibilityChip } from './CompatibilityChip';
import { QualityChip } from './QualityChip';
import { CertificationChip } from './CertificationChip';

describe('quality, certification, and compatibility badges', () => {
  it.each(['DEVELOPMENT', 'TESTED', 'CERTIFIED'] as const)(
    'renders the %s quality badge',
    status => {
      render(<QualityChip status={status} />);
      expect(screen.getByText(status)).toBeInTheDocument();
    },
  );

  it.each(['DEVELOPMENT', 'TESTED', 'CERTIFIED'] as const)(
    'renders the %s certification badge',
    status => {
      render(<CertificationChip status={status} />);
      expect(screen.getByText(status)).toBeInTheDocument();
    },
  );

  it.each(['COMPATIBLE', 'BREAKING_CHANGE', 'UNKNOWN'] as const)(
    'renders the %s compatibility badge',
    status => {
      render(<CompatibilityChip status={status} />);
      expect(screen.getByText(status)).toBeInTheDocument();
    },
  );
});
