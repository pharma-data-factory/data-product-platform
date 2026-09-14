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

  it('renders a URS status with its domain wording, not the raw enum', () => {
    render(<StatusBadge state="APPROVED" kind="urs" />);
    // ursStatusAppearance relabels APPROVED as "Released"; users should not
    // have to know the enum.
    expect(screen.getByLabelText('requirement status Released')).toHaveTextContent(
      'Released',
    );
  });

  it('distinguishes URS states by tone instead of colouring them all alike', () => {
    const { unmount } = render(<StatusBadge state="DRAFT" kind="urs" />);
    const draft = screen.getByLabelText('requirement status Draft');
    const draftBg = draft.style.backgroundColor;
    unmount();

    render(<StatusBadge state="REJECTED" kind="urs" />);
    const rejected = screen.getByLabelText('requirement status Rejected');

    expect(draftBg).toBeTruthy();
    expect(rejected.style.backgroundColor).toBeTruthy();
    expect(rejected.style.backgroundColor).not.toBe(draftBg);
  });

  it('strikes through states that are no longer effective', () => {
    render(<StatusBadge state="SUPERSEDED" kind="urs" />);
    expect(
      screen.getByLabelText('requirement status Superseded'),
    ).toHaveStyle('text-decoration: line-through');
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
