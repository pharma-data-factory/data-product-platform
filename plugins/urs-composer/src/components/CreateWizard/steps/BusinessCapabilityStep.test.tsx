/**
 * Business Capability Step Tests
 * 
 * Tests for:
 * - Capability loading
 * - Capability selection
 * - Loading state
 * - Error state
 * - Search/filter
 */

import { renderWithApp } from '../../../__testUtils__';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { BusinessCapabilityStep } from './BusinessCapabilityStep';
import { URSWizardState, initializeWizardState } from '../wizardState';
import { ursComposerApiRef } from '../../../api/ursComposerApi';

const mockApi = {
  listCapabilities: jest.fn(),
  listRequirementSets: jest.fn().mockResolvedValue({ items: [], total: 0 }),
};

const renderStep = (state: URSWizardState, onStateChange: jest.Mock) =>
  renderWithApp(
    <BusinessCapabilityStep state={state} onStateChange={onStateChange} />,
    { apis: [[ursComposerApiRef, mockApi as any]] },
  );

describe('BusinessCapabilityStep', () => {
  const mockState: URSWizardState = {
    ...initializeWizardState(),
    businessCapabilityRefs: [],
  };

  const mockOnStateChange = jest.fn();

  const mockCapabilities = [
    {
      id: 'business-capability:make/oee',
      name: 'OEE Management',
      description: 'Equipment performance management',
      domain: 'Production',
      source: 'DOCUMENTATION' as const,
    },
    {
      id: 'business-capability:make/material',
      name: 'Material Management',
      description: 'Raw material tracking',
      domain: 'Supply Chain',
      source: 'DOCUMENTATION' as const,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // LOADING
  // ============================================================================

  describe('Loading', () => {
    test('shows loading spinner while fetching capabilities', async () => {
      mockApi.listCapabilities.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ items: mockCapabilities, total: mockCapabilities.length }), 100)),
      );

      renderStep(mockState, mockOnStateChange);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('OEE Management')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  describe('Error handling', () => {
    test('displays error message on API failure', async () => {
      mockApi.listCapabilities.mockRejectedValueOnce({
        status: 500,
        message: 'Internal server error',
      });

      renderStep(mockState, mockOnStateChange);

      await waitFor(() => {
        expect(screen.getByText(/failed to load capabilities/i)).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // SELECTION
  // ============================================================================

  describe('Capability selection', () => {
    beforeEach(() => {
      mockApi.listCapabilities.mockResolvedValueOnce({ items: mockCapabilities, total: mockCapabilities.length });
    });

    test('loads and displays capabilities', async () => {
      renderStep(mockState, mockOnStateChange);

      await waitFor(() => {
        expect(screen.getByText('OEE Management')).toBeInTheDocument();
        expect(screen.getByText('Material Management')).toBeInTheDocument();
      });
    });

    test('calls onStateChange when capability selected', async () => {
      renderStep(mockState, mockOnStateChange);

      await waitFor(() => {
        const card = screen.getByText('OEE Management').closest('div[role="button"]') || 
                     screen.getByText('OEE Management').closest('div');
        if (card) {
          fireEvent.click(card);
        }
      });

      await waitFor(() => {
        expect(mockOnStateChange).toHaveBeenCalledWith(
          expect.objectContaining({
            businessCapabilityRefs: expect.arrayContaining(['business-capability:make/oee']),
          }),
        );
      });
    });

    test('shows selected capabilities as chips', async () => {
      const stateWithSelection: URSWizardState = {
        ...mockState,
        businessCapabilityRefs: ['business-capability:make/oee'],
      };

      renderStep(stateWithSelection, mockOnStateChange);

      await waitFor(() => {
        expect(screen.getAllByText('OEE Management').length).toBeGreaterThanOrEqual(2);
        expect(screen.getByText('Selected Capabilities:')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // SEARCH/FILTER
  // ============================================================================

  describe('Search/filter', () => {
    beforeEach(() => {
      mockApi.listCapabilities.mockResolvedValueOnce({ items: mockCapabilities, total: mockCapabilities.length });
    });

    test('filters capabilities by search term', async () => {
      renderStep(mockState, mockOnStateChange);

      await waitFor(() => {
        expect(screen.getByText('OEE Management')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search capabilities...');
      fireEvent.change(searchInput, { target: { value: 'material' } });

      await waitFor(() => {
        expect(screen.queryByText('OEE Management')).not.toBeInTheDocument();
        expect(screen.getByText('Material Management')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // EMPTY STATE
  // ============================================================================

  describe('Empty state', () => {
    test('shows empty state message when no capabilities match search', async () => {
      mockApi.listCapabilities.mockResolvedValueOnce({ items: mockCapabilities, total: mockCapabilities.length });

      renderStep(mockState, mockOnStateChange);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search capabilities...');
        fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
      });

      await waitFor(() => {
        expect(screen.getByText('No capabilities match your search.')).toBeInTheDocument();
      });
    });
  });
});
