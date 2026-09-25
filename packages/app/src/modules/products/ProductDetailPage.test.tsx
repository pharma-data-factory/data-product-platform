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
  updateProduct: jest.fn(),
  listProductBaselines: jest.fn(),
  createProductBaseline: jest.fn(),
  approveProductBaseline: jest.fn(),
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
  // A ProductLifecycle, not a ProductStatus — the fixture used to carry
  // 'ACTIVE', which is the status vocabulary and not one of the three values
  // `PRODUCT_LIFECYCLES` offers.
  lifecycle: 'EXPERIMENTAL',
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
  client.updateProduct.mockImplementation(async (_id, input) => ({
    ...PRODUCT,
    ...input,
  }));
  client.createProductBaseline.mockResolvedValue({});
  client.approveProductBaseline.mockResolvedValue({});
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

/**
 * Batch 1: the two release-gate blockers that no screen could clear.
 *
 * `PUT /products/:id`, `createProductBaseline` and `approveProductBaseline`
 * all existed and were reachable from the client; nothing called them. A
 * product created through the UI therefore met the gate with three
 * `POLICY_OBLIGATION_UNMET` blockers and `NO_APPROVED_BASELINE`, and no
 * sequence of clicks could change that.
 */
describe('ProductDetailPage — governance', () => {
  async function pick(label: string, option: string) {
    fireEvent.mouseDown(screen.getByLabelText(label));
    await act(async () => {
      fireEvent.click(await screen.findByRole('option', { name: option }));
    });
  }

  it('names the obligations the gate will refuse the product for', async () => {
    await renderPage();

    expect(screen.getByText('3 unanswered')).toBeInTheDocument();
    expect(
      screen.getByText(
        /refuse this product until it states its owner, data classification, GxP relevance/,
      ),
    ).toBeInTheDocument();
  });

  it('asks a GxP product for its criticality, and a non-GxP one not', async () => {
    await renderPage();

    expect(screen.getByText('Optional')).toBeInTheDocument();

    await pick('GxP relevance', 'DIRECT');

    expect(screen.getByText('Required for a GxP product')).toBeInTheDocument();
  });

  it('saves only the fields it owns', async () => {
    await renderPage();

    fireEvent.change(screen.getByLabelText('Owner'), {
      target: { value: 'group:default/platform-team' },
    });
    await pick('GxP relevance', 'DIRECT');
    await pick('Data classification', 'CONFIDENTIAL');
    await pick('Criticality', 'HIGH');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save governance' }));
    });

    // Not the whole product: a PUT carrying every field would let a stale copy
    // of one nobody edited overwrite a concurrent change.
    expect(client.updateProduct).toHaveBeenCalledWith('p1', {
      owner: 'group:default/platform-team',
      gxpRelevance: 'DIRECT',
      dataClassification: 'CONFIDENTIAL',
      criticality: 'HIGH',
      lifecycle: 'EXPERIMENTAL',
    });
  });

  it('reports the answers as complete once they are stored', async () => {
    client.getProduct.mockResolvedValue({
      ...PRODUCT,
      owner: 'group:default/platform-team',
      gxpRelevance: 'NONE',
      dataClassification: 'INTERNAL',
    });

    await renderPage();

    // NONE is an answer, so criticality is not outstanding.
    expect(screen.getByText('Complete')).toBeInTheDocument();
    expect(screen.queryByText(/unanswered/)).toBeNull();
  });

  it('refuses to save when nothing changed', async () => {
    await renderPage();

    expect(
      screen.getByRole('button', { name: 'Save governance' }),
    ).toBeDisabled();
  });
});

describe('ProductDetailPage — baselines', () => {
  const DRAFT_BASELINE = {
    id: 'b1',
    productVersionId: 'v2',
    baselineVersion: '1.0.0',
    status: 'DRAFT',
    snapshot: {},
    ursBaselineIds: ['urs-b1'],
    createdBy: 'user:default/mo',
    createdAt: new Date('2026-02-01'),
    revision: 1,
  };

  it('reports that no baseline is approved, which is what the gate checks', async () => {
    await renderPage();

    expect(screen.getByText('None approved')).toBeInTheDocument();
    expect(
      screen.getByText('No baseline on this version yet.'),
    ).toBeInTheDocument();
  });

  it('creates a baseline against the selected version', async () => {
    await renderPage();
    await selectVersion('1.0.0 (DRAFT)');

    fireEvent.change(screen.getByLabelText('Baseline label'), {
      target: { value: 'QMS-DOC-4471' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Create baseline' }));
    });

    expect(client.createProductBaseline).toHaveBeenCalledWith('v1', {
      baselineVersion: 'QMS-DOC-4471',
    });
  });

  it('lets the server number the baseline when no label is given', async () => {
    await renderPage();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Create baseline' }));
    });

    expect(client.createProductBaseline).toHaveBeenCalledWith('v2', {});
  });

  it('approves a DRAFT baseline — the blocker no screen could clear', async () => {
    client.listProductBaselines.mockResolvedValue([DRAFT_BASELINE]);
    await renderPage();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    });

    expect(client.approveProductBaseline).toHaveBeenCalledWith('b1');
  });

  it('offers no approval for a baseline that is already approved', async () => {
    client.listProductBaselines.mockResolvedValue([
      { ...DRAFT_BASELINE, status: 'APPROVED', approvedBy: 'user:default/qa' },
    ]);
    await renderPage();

    expect(screen.getByText('Approved 1.0.0')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
  });

  it('says when a baseline claims no requirements', async () => {
    client.listProductBaselines.mockResolvedValue([
      { ...DRAFT_BASELINE, ursBaselineIds: undefined },
    ]);
    await renderPage();

    expect(
      screen.getByText(/No URS baseline — bind one on the Requirements tab/),
    ).toBeInTheDocument();
  });

  it('shows a failed baseline action beside the section, not as a page error', async () => {
    client.approveProductBaseline.mockRejectedValue(
      new Error('Cannot approve baseline in status SUPERSEDED'),
    );
    client.listProductBaselines.mockResolvedValue([DRAFT_BASELINE]);
    await renderPage();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    });

    expect(
      screen.getByText('Cannot approve baseline in status SUPERSEDED'),
    ).toBeInTheDocument();
    // The page is still usable.
    expect(screen.getByText('Release Management')).toBeInTheDocument();
  });
});
