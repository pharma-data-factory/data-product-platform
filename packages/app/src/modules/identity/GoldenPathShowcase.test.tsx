import { fireEvent, render, screen, within } from '@testing-library/react';
import { LandingI18nProvider } from './landingI18n';
import { GoldenPathShowcase } from './GoldenPathShowcase';

function categoryFilterTrigger() {
  return within(screen.getByTestId('golden-path-category-filter')).getByRole('button');
}

function renderShowcase() {
  return render(
    <LandingI18nProvider>
      <GoldenPathShowcase compact />
    </LandingI18nProvider>,
  );
}

describe('Golden Path showcase filters', () => {
  it('lists certified and planned paths, then searches and filters by category', () => {
    renderShowcase();

    expect(screen.getByText('Golden Paths (6)')).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: 'Search Golden Paths...' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('golden-path-category-filter')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Explore MQTT Temperature' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Explore REST Equipment' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Explore OEE' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('heading', { name: 'OEE Data Product' }).closest('article')!).getByLabelText(
        'Version 1.0',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Explore Snowflake' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Explore SAP' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Explore Cold Chain' })).toBeInTheDocument();
    expect(screen.getAllByText('PLANNED').length).toBeGreaterThanOrEqual(3);

    fireEvent.change(screen.getByRole('textbox', { name: 'Search Golden Paths...' }), {
      target: { value: 'mqtt' },
    });
    expect(screen.getByText('Golden Paths (1)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Explore MQTT Temperature' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Explore OEE' })).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: 'Search Golden Paths...' }), {
      target: { value: '' },
    });
    fireEvent.mouseDown(categoryFilterTrigger());
    fireEvent.click(screen.getByRole('option', { name: 'Telemetry', hidden: true }));
    expect(screen.getByText('Golden Paths (2)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Explore MQTT Temperature' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Explore Cold Chain' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Explore OEE' })).not.toBeInTheDocument();

    fireEvent.mouseDown(categoryFilterTrigger());
    fireEvent.click(screen.getByRole('option', { name: 'All', hidden: true }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Search Golden Paths...' }), {
      target: { value: 'billing' },
    });
    expect(screen.getByText('Golden Paths (0)')).toBeInTheDocument();
    expect(
      screen.getByText('No Golden Paths match this search or category.'),
    ).toBeInTheDocument();
  });

  it('explains a planned Golden Path without offering Create', () => {
    renderShowcase();

    fireEvent.click(screen.getByRole('button', { name: 'Explore Cold Chain' }));
    const detail = screen.getByLabelText('Cold Chain details');
    expect(
      within(detail).getByText(/Specified so manufacturing and digital teams can plan/i),
    ).toBeInTheDocument();
    expect(within(detail).getByText(/temperature-integrity product/i)).toBeInTheDocument();
    expect(within(detail).getByText(/not GxP validation of the cold chain/i)).toBeInTheDocument();
    expect(within(detail).getByText(/USB loggers/i)).toBeInTheDocument();
    expect(screen.queryByText(/Explore · Marketplace/)).not.toBeInTheDocument();
  });
});
