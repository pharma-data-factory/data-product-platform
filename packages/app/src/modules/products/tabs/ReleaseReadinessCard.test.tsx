import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UnifiedThemeProvider, themes } from '@backstage/theme';
import type { ProductRequirementCoverage } from '@internal/platform-common';
import { ReleaseReadinessCard } from './ReleaseReadinessCard';

function coverage(
  overrides: Partial<ProductRequirementCoverage> = {},
): ProductRequirementCoverage {
  return {
    productVersionId: 'v1',
    ursBaselineId: 'urs-b1',
    total: 12,
    mapped: 10,
    unmapped: 2,
    verified: 7,
    validated: 3,
    validationContextId: 'ctx-1',
    byRequirement: [],
    ...overrides,
  };
}

function renderCard(
  loadGate: jest.Mock,
  props: Partial<Parameters<typeof ReleaseReadinessCard>[0]> = {},
) {
  const element = (key: string) => (
    <UnifiedThemeProvider theme={themes.light}>
      <ReleaseReadinessCard
        versionLabel="1.0.0"
        loadGate={loadGate}
        refreshKey={key}
        coverage={coverage()}
        {...props}
      />
    </UnifiedThemeProvider>
  );
  const view = render(element('a'));
  return { ...view, rerenderWithKey: (key: string) => view.rerender(element(key)) };
}

describe('ReleaseReadinessCard (NXD-100)', () => {
  it('names each blocker instead of showing its code', async () => {
    renderCard(
      jest.fn().mockResolvedValue({
        passed: false,
        blockers: [
          { code: 'NO_APPROVED_BASELINE', message: 'Approve a product baseline.' },
          { code: 'INCOMPLETE_TRACEABILITY', message: '2 requirements unverified.' },
        ],
      }),
    );
    expect(await screen.findByText('Blocked by 2 checks')).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Release blockers' });
    expect(list).toHaveTextContent('No approved product baseline');
    expect(list).toHaveTextContent('Approve a product baseline.');
    expect(list).toHaveTextContent('Requirements are not all verified');
    expect(list).not.toHaveTextContent('NO_APPROVED_BASELINE');
  });

  it('says when a version is ready, in words and not only in green', async () => {
    renderCard(jest.fn().mockResolvedValue({ passed: true, blockers: [] }));
    expect(
      await screen.findByText(/Ready to release — every release-gate check passes/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Release blockers' })).toBeNull();
  });

  it('shows coverage as meters with their real denominator', async () => {
    renderCard(jest.fn().mockResolvedValue({ passed: true, blockers: [] }));
    const implemented = await screen.findByRole('meter', { name: 'Implemented' });
    expect(implemented).toHaveAttribute('aria-valuenow', '10');
    expect(implemented).toHaveAttribute('aria-valuemax', '12');
    expect(implemented).toHaveAttribute('aria-valuetext', '10 of 12 (83%)');
    expect(screen.getByRole('meter', { name: 'Verified' })).toHaveAttribute(
      'aria-valuenow',
      '7',
    );
    expect(screen.getByText('3 of 12')).toBeInTheDocument();
  });

  it('shows validation as unknown, not as an empty bar, without a validation context', async () => {
    renderCard(jest.fn().mockResolvedValue({ passed: true, blockers: [] }), {
      coverage: coverage({ validationContextId: undefined, validated: 0 }),
    });
    expect(
      await screen.findByText(/Unknown — no validation context/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('meter', { name: 'Validated' })).toBeNull();
  });

  it('asks for a URS baseline when there is nothing to measure', async () => {
    renderCard(jest.fn().mockResolvedValue({ passed: false, blockers: [] }), {
      coverage: null,
    });
    expect(
      await screen.findByText('Bind a URS baseline to measure coverage.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('meter')).toBeNull();
  });

  it('reports a failed gate check with a retry, not as "ready"', async () => {
    const loadGate = jest
      .fn()
      .mockRejectedValueOnce(new Error('Service Unavailable (503)'))
      .mockResolvedValueOnce({ passed: true, blockers: [] });
    renderCard(loadGate);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load the release gate',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText(/Ready to release/)).toBeInTheDocument();
  });

  it('re-checks the gate when something it reads has changed', async () => {
    const loadGate = jest.fn().mockResolvedValue({ passed: true, blockers: [] });
    const { rerenderWithKey } = renderCard(loadGate);
    await screen.findByText(/Ready to release/);
    rerenderWithKey('a');
    rerenderWithKey('b');
    await waitFor(() => expect(loadGate).toHaveBeenCalledTimes(2));
  });
});
