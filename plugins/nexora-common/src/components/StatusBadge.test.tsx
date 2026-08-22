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
