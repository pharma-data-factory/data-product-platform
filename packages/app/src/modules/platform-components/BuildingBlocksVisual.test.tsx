import { render, screen } from '@testing-library/react';
import { UnifiedThemeProvider } from '@backstage/theme';
import { pharmaDataFactoryTheme } from '../theme/theme';
import { BuildingBlocksVisual } from './BuildingBlocksVisual';

describe('BuildingBlocksVisual', () => {
  it('shows the composition fork without presenting Equipment Use Log as available', () => {
    render(
      <UnifiedThemeProvider theme={pharmaDataFactoryTheme}>
        <BuildingBlocksVisual />
      </UnifiedThemeProvider>,
    );

    expect(
      screen.getByLabelText(
        'Component Library composes into an existing Golden Path such as OEE, or a new use case in Composer such as Equipment Use Log as a design-first example',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('COMPONENT LIBRARY')).toBeInTheDocument();
    expect(screen.getByText('REST')).toBeInTheDocument();
    expect(screen.getByText('MQTT')).toBeInTheDocument();
    expect(screen.getByText('REST Source')).toBeInTheDocument();
    expect(screen.getByText('COMPOSITION')).toBeInTheDocument();
    expect(screen.getByText('EXISTING PATTERN')).toBeInTheDocument();
    expect(screen.getByText('NEW USE CASE')).toBeInTheDocument();
    expect(screen.getByText('Golden Path')).toBeInTheDocument();
    expect(screen.getByText('Composer')).toBeInTheDocument();
    expect(screen.getByText('OEE')).toBeInTheDocument();
    expect(screen.getByText('Create Product')).toBeInTheDocument();
    expect(screen.getByText('Equipment Use Log')).toBeInTheDocument();
    expect(screen.getByText('DESIGN FIRST')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Equipment Use Log is a design example. It is not a Golden Path.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Cold Chain')).not.toBeInTheDocument();
    expect(screen.queryByText('AVAILABLE')).not.toBeInTheDocument();
  });
});
