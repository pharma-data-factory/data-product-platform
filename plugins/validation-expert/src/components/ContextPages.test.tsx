import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { identityApiRef } from '@backstage/core-plugin-api';
import { TestApiProvider } from '@backstage/frontend-test-utils';
import { ContextDetailPage, ContextsPage } from './ContextPages';
import { validationExpertApiRef, ValidationContext } from '../api';

const sampleContext: ValidationContext = {
  id: 'VALIDATION-CTX-ABC',
  status: 'PENDING',
  createdAt: '2026-09-11T08:00:00.000Z',
  createdBy: 'user:default/alice',
  source: {
    requirementSetId: 'set-1',
    requirementSetTitle: 'OEE Line',
    baselineId: 'bl-1',
    baselineVersion: '1.0',
    businessCapabilityIds: ['cap-oee'],
    approvalStatus: 'APPROVED',
    approvedBy: 'user:default/approver',
    sourceSystem: 'urs-composer',
    requirementIds: ['URS-OEE-001', 'URS-OEE-002'],
  },
};

const identityApi = {
  getBackstageIdentity: jest.fn().mockResolvedValue({
    ownershipEntityRefs: ['group:default/data-product-developers'],
  }),
};

describe('Validation contexts UI', () => {
  it('lists contexts with deep links', async () => {
    const api = {
      getContexts: jest.fn().mockResolvedValue([sampleContext]),
    };

    render(
      <MemoryRouter>
        <TestApiProvider apis={[[validationExpertApiRef, api as any]]}>
          <ContextsPage />
        </TestApiProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('VALIDATION-CTX-ABC')).toBeInTheDocument();
    });
    expect(screen.getByText('OEE Line')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'VALIDATION-CTX-ABC' }),
    ).toHaveAttribute('href', '/validation-expert/contexts/VALIDATION-CTX-ABC');
    expect(screen.getByRole('link', { name: 'OEE Line' })).toHaveAttribute(
      'href',
      '/urs-composer/set-1',
    );
  });

  it('shows Approved URS reference and linked runs on detail page', async () => {
    const api = {
      getContext: jest.fn().mockResolvedValue(sampleContext),
      getContextRequirements: jest.fn().mockResolvedValue({
        contextId: sampleContext.id,
        baselineId: sampleContext.source.baselineId,
        baselineVersion: sampleContext.source.baselineVersion,
        requirementSetId: sampleContext.source.requirementSetId,
        items: [
          {
            requirementId: 'URS-OEE-001',
            title: 'Capture OEE',
            statement: 'The solution shall capture OEE.',
            priority: 'MUST',
          },
          {
            requirementId: 'URS-OEE-002',
            title: 'Report OEE',
            statement: 'The solution shall report OEE.',
          },
        ],
        source: 'urs-composer',
        note: 'Read-through of pinned baseline requirement versions. Not a GxP validation claim.',
      }),
      getContextRuns: jest.fn().mockResolvedValue([
        {
          id: 'IQ-RUN-0001',
          type: 'IQ',
          status: 'PENDING',
          candidate: 'platform-core-v1.0-rc2',
          baselineId: 'bl-1',
          contextId: sampleContext.id,
          createdAt: '2026-09-11T09:00:00.000Z',
          createdBy: { userEntityRef: 'user:default/alice' },
          executions: [],
        },
      ]),
    };

    render(
      <MemoryRouter
        initialEntries={['/validation-expert/contexts/VALIDATION-CTX-ABC']}
      >
        <TestApiProvider
          apis={[
            [validationExpertApiRef, api as any],
            [identityApiRef, identityApi as any],
          ]}
        >
          <Routes>
            <Route
              path="/validation-expert/contexts/:contextId"
              element={<ContextDetailPage />}
            />
          </Routes>
        </TestApiProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Approved URS reference')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('Capture OEE')).toBeInTheDocument();
    });
    expect(screen.getByText('The solution shall capture OEE.')).toBeInTheDocument();
    expect(screen.getByText('URS-OEE-002')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('IQ-RUN-0001')).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: 'IQ-RUN-0001' })).toHaveAttribute(
      'href',
      '/validation-expert/runs/IQ-RUN-0001',
    );
    expect(api.getContext).toHaveBeenCalledWith('VALIDATION-CTX-ABC');
    expect(api.getContextRequirements).toHaveBeenCalledWith('VALIDATION-CTX-ABC');
    expect(api.getContextRuns).toHaveBeenCalledWith('VALIDATION-CTX-ABC');
  });
});
