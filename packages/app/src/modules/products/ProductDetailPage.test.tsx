import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TestApiProvider, mockApis } from '@backstage/frontend-test-utils';
import { configApiRef } from '@backstage/core-plugin-api';
import { UnifiedThemeProvider } from '@backstage/theme';
import { ursComposerApiRef } from '@internal/plugin-urs-composer';
import { ProductDetailPage } from './ProductDetailPage';
import { pharmaDataFactoryTheme } from '../theme/theme';

jest.mock('@backstage/core-components', () => {
  const actual = jest.requireActual('@backstage/core-components');
  return {
    ...actual,
    Progress: () => null,
  };
});

const client = {
  getProduct: jest.fn(),
  listProductVersions: jest.fn(),
  listProductComponents: jest.fn(),
  listProductRequirements: jest.fn(),
  getRequirementCoverage: jest.fn(),
  getProductTraceability: jest.fn(),
  addProductComponent: jest.fn(),
  createTraceabilityLink: jest.fn(),
  createProductVersion: jest.fn(),
  checkReleaseGate: jest.fn(),
  transitionVersionStatus: jest.fn(),
  bindUrsBaseline: jest.fn(),
  listProductBaselines: jest.fn(),
  listComponentContracts: jest.fn(),
  listVersionDependencies: jest.fn(),
  getContract: jest.fn(),
};

jest.mock('./api', () => ({
  useComposerClient: () => client,
}));

const PRODUCT = {
  id: 'p1',
  name: 'Batch Genealogy',
  description: 'Traces a batch across sites',
  productType: 'DATA_PRODUCT',
  domain: 'manufacturing',
  lifecycle: 'ACTIVE',
  status: 'ACTIVE',
  createdBy: 'user:default/mo',
  createdAt: new Date('2026-01-01'),
  revision: 1,
};

/**
 * The DRAFT version is *not* the latest one.
 *
 * That is the shape the add-component bug needed: the form wrote against the
 * latest version while the picker selected any version, so a component added
 * while viewing 1.0.0 landed on 2.0.0.
 */
const VERSION_DRAFT = {
  id: 'v1',
  productId: 'p1',
  version: '1.0.0',
  status: 'DRAFT',
  ursBaselineId: 'urs-b1',
  createdBy: 'user:default/mo',
  createdAt: new Date('2026-01-01'),
  revision: 1,
};

const VERSION_RELEASED = {
  id: 'v2',
  productId: 'p1',
  version: '2.0.0',
  status: 'RELEASED',
  ursBaselineId: 'urs-b1',
  createdBy: 'user:default/mo',
  createdAt: new Date('2026-02-01'),
  revision: 1,
};

const COMPONENT = {
  id: 'c1',
  productVersionId: 'v2',
  componentType: 'API',
  name: 'Genealogy API',
  createdBy: 'user:default/mo',
  createdAt: new Date('2026-02-01'),
  revision: 1,
};

function coverageRow(overrides: Record<string, unknown> = {}) {
  return {
    requirementRef: 'URS-OEE-014',
    ursRequirementVersionId: 'r1',
    title: 'Batch lineage is traceable',
    origin: 'URS',
    mapping: 'MAPPED',
    componentIds: ['c1'],
    verified: true,
    testIds: ['t1'],
    runIds: ['run1'],
    findingIds: [],
    ...overrides,
  };
}

/** No `validationContextId`: the validation axis is unknown, not zero. */
const COVERAGE_WITHOUT_CONTEXT = {
  productVersionId: 'v2',
  ursBaselineId: 'urs-b1',
  total: 1,
  mapped: 1,
  unmapped: 0,
  verified: 1,
  validated: 0,
  byRequirement: [coverageRow({ validated: undefined })],
};

const CONTRACT = {
  id: 'ct1',
  productComponentId: 'c1',
  namespace: 'manufacturing',
  name: 'batch-genealogy',
  version: '1.0.0',
  schemaType: 'JSON_SCHEMA',
  status: 'ACTIVE',
  qualityRules: [],
  exchange: { deliveryMechanism: 'kafka', accessMode: 'REQUEST' },
  createdBy: 'user:default/mo',
  createdAt: new Date('2026-02-01'),
  revision: 1,
};

beforeEach(() => {
  jest.clearAllMocks();
  client.getProduct.mockResolvedValue(PRODUCT);
  client.listProductVersions.mockResolvedValue([
    VERSION_DRAFT,
    VERSION_RELEASED,
  ]);
  client.listProductComponents.mockResolvedValue([COMPONENT]);
  client.listProductRequirements.mockResolvedValue([]);
  client.getRequirementCoverage.mockResolvedValue(COVERAGE_WITHOUT_CONTEXT);
  client.getProductTraceability.mockResolvedValue({
    productId: 'p1',
    componentCount: 1,
    coveredComponentCount: 1,
    coverage: 1,
    links: [],
  });
  client.addProductComponent.mockResolvedValue(COMPONENT);
  client.listProductBaselines.mockResolvedValue([]);
  client.listComponentContracts.mockResolvedValue([]);
  client.listVersionDependencies.mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
});

const ursApi = {
  listApprovedBaselines: jest.fn().mockResolvedValue([]),
};

async function renderPage() {
  await act(async () => {
    render(
      <UnifiedThemeProvider theme={pharmaDataFactoryTheme}>
        <MemoryRouter initialEntries={['/products/p1']}>
          <TestApiProvider
            apis={[
              [configApiRef, mockApis.config()],
              [ursComposerApiRef, ursApi],
            ]}
          >
            <Routes>
              <Route
                path="/products/:productId"
                element={<ProductDetailPage />}
              />
            </Routes>
          </TestApiProvider>
        </MemoryRouter>
      </UnifiedThemeProvider>,
    );
  });
}

async function selectVersion(label: string) {
  fireEvent.mouseDown(screen.getByLabelText('Version'));
  await act(async () => {
    fireEvent.click(await screen.findByRole('option', { name: label }));
  });
}

describe('ProductDetailPage — NXD-056 tab set', () => {
  it('renders the six tabs and opens on Overview', async () => {
    await renderPage();

    for (const label of [
      'Overview',
      'Requirements',
      'Architecture',
      'Contracts',
      'Tests',
      'Validation',
    ]) {
      expect(screen.getByRole('tab', { name: label })).toBeInTheDocument();
    }
    // Development is deliberately absent until Step 2 gives the product a
    // repository identity.
    expect(screen.queryByRole('tab', { name: 'Development' })).toBeNull();

    expect(screen.getByText('Release Management')).toBeInTheDocument();
  });

  it('keeps the active tab when the version changes, and reloads for it', async () => {
    await renderPage();

    // Default selection is the latest version, 2.0.0.
    expect(client.getRequirementCoverage).toHaveBeenCalledWith('v2');

    fireEvent.click(screen.getByRole('tab', { name: 'Architecture' }));
    await selectVersion('1.0.0 (DRAFT)');

    expect(screen.getByRole('tab', { name: 'Architecture' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(client.listProductComponents).toHaveBeenCalledWith('v1');
    expect(client.getRequirementCoverage).toHaveBeenCalledWith('v1');
  });

  it('adds a component to the selected version, not the latest one', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('tab', { name: 'Architecture' }));

    // 2.0.0 is selected and RELEASED, so the form refuses up front.
    expect(screen.getByLabelText('Name')).toBeDisabled();
    expect(
      screen.getByText(
        'Version is RELEASED. Components can only be added while the version is DRAFT.',
      ),
    ).toBeInTheDocument();

    await selectVersion('1.0.0 (DRAFT)');

    const name = screen.getByLabelText('Name');
    expect(name).not.toBeDisabled();
    fireEvent.change(name, { target: { value: 'Lineage Store' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Add component' }));
    });

    expect(client.addProductComponent).toHaveBeenCalledWith(
      'v1',
      expect.objectContaining({ name: 'Lineage Store' }),
    );
  });

  it('reports validation as unknown, not zero, when no context resolves', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('tab', { name: 'Validation' }));

    expect(screen.getByText('Validation status unknown')).toBeInTheDocument();
    expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
    expect(screen.queryByText(/0 of 1 requirement/)).toBeNull();
    expect(screen.queryByText('NOT VALIDATED')).toBeNull();
  });

  it('distinguishes a baseline without build evidence from no baseline', async () => {
    client.listProductBaselines.mockResolvedValue([
      {
        id: 'b1',
        productVersionId: 'v2',
        baselineVersion: '1.0.0',
        status: 'APPROVED',
        snapshot: {},
        createdBy: 'user:default/mo',
        createdAt: new Date('2026-02-01'),
        revision: 1,
      },
      {
        id: 'b2',
        productVersionId: 'v2',
        baselineVersion: '2.0.0',
        status: 'APPROVED',
        snapshot: {},
        createdBy: 'user:default/mo',
        createdAt: new Date('2026-03-01'),
        provenance: {
          releaseCommitSha: 'a'.repeat(40),
          artifactDigest: `sha256:${'b'.repeat(64)}`,
          provenanceTimestamp: '2026-03-01T10:00:00.000Z',
          provenanceRecordedBy: 'service:default/ci',
        },
        revision: 1,
      },
    ]);

    await renderPage();
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: 'Tests' }));
    });

    await waitFor(() => {
      expect(
        screen.getByText(/No build evidence recorded/),
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/Commit aaaaaaaaaaaa/)).toBeInTheDocument();
  });

  it('lists provided contracts by coordinate and flags an unresolvable dependency', async () => {
    client.listComponentContracts.mockResolvedValue([CONTRACT]);
    client.listVersionDependencies.mockResolvedValue([
      { id: 'd1', productVersionId: 'v2', contractId: 'gone', revision: 1 },
    ]);
    client.getContract.mockRejectedValue(new Error('Contract not found'));

    await renderPage();
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: 'Contracts' }));
    });

    await waitFor(() => {
      expect(
        screen.getByText('manufacturing/batch-genealogy@1.0.0'),
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/Exchange: kafka/)).toBeInTheDocument();
    expect(
      screen.getByText(/names a contract that no longer exists/),
    ).toBeInTheDocument();
  });
});
