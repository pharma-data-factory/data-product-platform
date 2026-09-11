import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { TestApiProvider } from '@backstage/frontend-test-utils';
import { OverviewPage, OVERVIEW_CARD_LINKS } from './OverviewPage';
import { validationExpertApiRef, ValidationOverview } from '../api';

const overview: ValidationOverview = {
  product: 'Platform Core',
  candidate: '1.0-RC2',
  candidateTag: 'platform-core-v1.0-rc2',
  baselineId: 'PDF-PC-VAL-BL-1.0',
  validationStatus: 'NOT_VALIDATED',
  part11Status: 'NOT_CLAIMED',
  gxpStatus: 'NOT_VALIDATED',
  requirementsBaselined: { active: 38, total: 38 },
  traceabilityPlanned: { covered: 38, total: 38 },
  iqStatus: 'PASS WITH OPEN OBSERVATIONS',
  oqStatus: 'READY',
  uatStatus: 'NOT STARTED',
  openRisks: 18,
  openFindings: 0,
  evidenceCount: 10,
  notes: ['Workbench only'],
};

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-pathname">{location.pathname}</div>;
}

function renderOverview() {
  const api = {
    getOverview: jest.fn().mockResolvedValue(overview),
    // The page also loads validation contexts. The stub did not have this,
    // so every test threw "api.getContexts is not a function" during the
    // effect and the page never finished rendering.
    getContexts: jest.fn().mockResolvedValue([]),
  };

  return render(
    <MemoryRouter initialEntries={['/validation-expert']}>
      <TestApiProvider apis={[[validationExpertApiRef, api as any]]}>
        <LocationDisplay />
        <OverviewPage />
      </TestApiProvider>
    </MemoryRouter>,
  );
}

describe('Validation Expert overview', () => {
  it('renders NOT_VALIDATED and key metrics', async () => {
    renderOverview();

    await waitFor(() => {
      expect(screen.getByText('NOT_VALIDATED')).toBeInTheDocument();
    });
    expect(screen.getByText('Validation Expert')).toBeInTheDocument();
    expect(screen.getAllByText('38 / 38').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('PASS WITH OPEN OBSERVATIONS')).toBeInTheDocument();
    expect(screen.getByText('READY')).toBeInTheDocument();
    expect(screen.getByText('NOT STARTED')).toBeInTheDocument();
  });

  it.each(OVERVIEW_CARD_LINKS)(
    'links $title card to $to',
    async ({ title, to }) => {
      renderOverview();

      await waitFor(() => {
        expect(screen.getByLabelText(`Open ${title}`)).toBeInTheDocument();
      });

      const link = screen.getByLabelText(`Open ${title}`);
      expect(link).toHaveAttribute('href', to);
      expect(link.tagName).toBe('A');
    },
  );

  it.each(OVERVIEW_CARD_LINKS)(
    'navigates to $to when $title card is clicked',
    async ({ title, to }) => {
      renderOverview();

      await waitFor(() => {
        expect(screen.getByLabelText(`Open ${title}`)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByLabelText(`Open ${title}`));
      expect(screen.getByTestId('location-pathname')).toHaveTextContent(to);
    },
  );

  it('does not make Candidate or Validation Status navigable', async () => {
    renderOverview();

    await waitFor(() => {
      expect(screen.getByText('NOT_VALIDATED')).toBeInTheDocument();
    });

    expect(screen.queryByLabelText('Open Candidate')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Open Validation Status')).not.toBeInTheDocument();
  });
});
