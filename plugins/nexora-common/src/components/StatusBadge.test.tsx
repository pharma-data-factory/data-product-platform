import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EmptyIntegrationState } from './Cards';
import { StatusBadge } from './StatusBadge';

describe('shared industrial components', () => {
  it('exposes accessible status labels without relying on color alone', () => {
    render(<StatusBadge state="CONNECTED" kind="connectivity" />);
    expect(screen.getByLabelText('connectivity status CONNECTED')).toHaveTextContent(
      'CONNECTED',
    );
  });

  it('renders compatibility as a colored chip with the correct label', () => {
    render(<StatusBadge state="COMPATIBLE" kind="compatibility" />);
    expect(
      screen.getByLabelText('compatibility status COMPATIBLE'),
    ).toHaveTextContent('COMPATIBLE');
  });

  it('maps unknown compatibility values to UNKNOWN', () => {
    render(<StatusBadge state="not-a-status" kind="compatibility" />);
    expect(
      screen.getByLabelText('compatibility status UNKNOWN'),
    ).toHaveTextContent('UNKNOWN');
  });

  it('renders entitlement status as a chip', () => {
    render(<StatusBadge state="ACTIVE" kind="entitlement" />);
    expect(
      screen.getByLabelText('entitlement status ACTIVE'),
    ).toHaveTextContent('ACTIVE');
  });

  it('falls back to UNKNOWN for unrecognized entitlement status', () => {
    render(<StatusBadge state="not-a-status" kind="entitlement" />);
    expect(
      screen.getByLabelText('entitlement status UNKNOWN'),
    ).toHaveTextContent('UNKNOWN');
  });

  it('falls back for missing integrations', () => {
    render(
      <EmptyIntegrationState
        title="Equipment State"
        message="No runtime state integration configured."
      />,
    );
    expect(
      screen.getByLabelText('Equipment State'),
    ).toHaveTextContent('No runtime state integration configured.');
  });
});
