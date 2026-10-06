import { messageFromErrorBody } from '@internal/platform-common';
import {
  fetchApiRef,
  discoveryApiRef,
  identityApiRef,
  useApi,
} from '@backstage/core-plugin-api';
import type {
  DataContract,
  Product,
  ProductBaseline,
  ProductComponent,
  ProductDependency,
  ProductRequirement,
  ProductRequirementCoverage,
  ProductVersion,
  TraceabilityLink,
} from '@internal/platform-common';

/** NXD-128. A justification, and the PIN for a GMP-relevant product. */
export interface SignatureInput {
  justification?: string;
  pin?: string;
}

/** NXD-128. One approval or release, as recorded. */
export interface ProductSignatureRecord {
  id: string;
  entityType: 'PRODUCT_VERSION' | 'PRODUCT_BASELINE';
  entityId: string;
  meaning: 'VERSION_APPROVED' | 'VERSION_RELEASED' | 'BASELINE_APPROVED';
  justification: string;
  signedBy: string;
  signedAt: string;
  gmpRelevant: boolean;
  reauthMethod?: string;
}

/** What an import of CI test evidence recorded (NXD-123). */
export interface TestEvidenceImport {
  run: { id: number; url: string; commit: string; conclusion: string | null };
  imported: number;
  skipped: number;
  alreadyRecorded: number;
  byRequirement: Record<string, { passed: number; failed: number }>;
  uncoveredRequirements: string[];
  unknownRequirements: string[];
}

/** NXD-133: what importing a version's release provenance recorded. */
export interface ReleaseProvenanceImport {
  baseline: ProductBaseline;
  release: { tag: string; url: string; commit: string };
  image: { repository?: string; digest: string; reference?: string };
  /** The same build was already on the baseline; nothing was written. */
  alreadyRecorded: boolean;
}

export interface ProductTraceability {
  productId: string;
  componentCount: number;
  coveredComponentCount: number;
  coverage: number;
  links: TraceabilityLink[];
}

export interface ReleaseGateBlocker {
  code: string;
  message: string;
}

export interface ReleaseGateResult {
  passed: boolean;
  blockers: ReleaseGateBlocker[];
}

export interface ComposerClient {
  createProduct(input: Record<string, unknown>): Promise<Product>;
  listProducts(): Promise<{ items: Product[]; total: number }>;
  getProduct(id: string): Promise<Product>;
  /**
   * Edits a product's governance metadata.
   *
   * `PUT /products/:id` has existed since the plugin did; nothing in the
   * frontend called it, and the create form collects four of the sixteen
   * fields. Owner, data classification and GxP relevance were therefore
   * unsettable for the whole life of a product — three release-gate blockers
   * with no UI that could clear them.
   */
  updateProduct(id: string, input: Record<string, unknown>): Promise<Product>;
  createProductVersion(productId: string): Promise<ProductVersion>;
  listProductVersions(productId: string): Promise<ProductVersion[]>;
  addProductComponent(
    versionId: string,
    input: Record<string, unknown>,
  ): Promise<ProductComponent>;
  listProductComponents(versionId: string): Promise<ProductComponent[]>;
  createTraceabilityLink(
    input: Record<string, unknown>,
  ): Promise<TraceabilityLink>;
  getProductTraceability(productId: string): Promise<ProductTraceability>;
  checkReleaseGate(versionId: string): Promise<ReleaseGateResult>;
  transitionVersionStatus(
    versionId: string,
    targetStatus: string,
    /** NXD-128: approval and release of a GMP product are signed. */
    signature?: SignatureInput,
  ): Promise<ProductVersion>;
  /** NXD-128: approvals and releases of a product, as attested. */
  listProductSignatures(productId: string): Promise<ProductSignatureRecord[]>;
  /**
   * Baselines of one version, newest first (`created_at` descending).
   *
   * Typed as `ProductBaseline[]` rather than the loose record it used to
   * return: the Tests tab reads `provenance` off these, and CI's build
   * evidence is the one field on the record that nothing in the frontend had
   * ever looked at.
   */
  listProductBaselines(versionId: string): Promise<ProductBaseline[]>;
  /**
   * `ursBaselineIds` is optional because a bound version supplies it: the
   * service inherits `product_versions.urs_baseline_id` when the body states
   * none. It used to be impossible to send at all — this method hard-coded an
   * empty body, so the one field that made the release gate's URS check
   * reachable could not be set from the UI.
   */
  createProductBaseline(
    versionId: string,
    input?: Record<string, unknown>,
  ): Promise<ProductBaseline>;
  approveProductBaseline(
    baselineId: string,
    signature?: SignatureInput,
  ): Promise<ProductBaseline>;
  bindUrsBaseline(
    versionId: string,
    ursBaselineId: string,
  ): Promise<{ version: ProductVersion; requirements: ProductRequirement[] }>;
  listProductRequirements(versionId: string): Promise<ProductRequirement[]>;
  getRequirementCoverage(
    versionId: string,
  ): Promise<ProductRequirementCoverage>;
  /** NXD-123: record the newest CI run's test evidence for this version. */
  importTestEvidence(versionId: string): Promise<TestEvidenceImport>;
  /** NXD-133: record the version's release build on its approved baseline. */
  importReleaseProvenance(versionId: string): Promise<ReleaseProvenanceImport>;
  /** Contracts this component provides. Keyed by component, listed by coordinate. */
  listComponentContracts(componentId: string): Promise<DataContract[]>;
  /** Contracts this version consumes — the other side of the exchange. */
  listVersionDependencies(versionId: string): Promise<ProductDependency[]>;
  /**
   * One contract by id.
   *
   * A `ProductDependency` carries only `contractId`, and a bare UUID says
   * nothing about what is being consumed. Resolving it is what turns the
   * dependency list into coordinates — the point of Slice 1.
   */
  getContract(contractId: string): Promise<DataContract>;
}

export function useComposerClient(): ComposerClient {
  const fetchApi = useApi(fetchApiRef);
  const discovery = useApi(discoveryApiRef);
  const identityApi = useApi(identityApiRef);

  const request = async (method: string, path: string, body?: unknown) => {
    const baseUrl = await discovery.getBaseUrl('composer');
    const { token } = await identityApi.getCredentials();
    const response = await fetchApi.fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      throw new Error(
        messageFromErrorBody(data, `Request failed (${response.status})`),
      );
    }
    if (response.status === 204) {
      return undefined;
    }
    return response.json();
  };

  return {
    createProduct: input => request('POST', '/products', input),
    listProducts: () => request('GET', '/products'),
    getProduct: id => request('GET', `/products/${id}`),
    updateProduct: (id, input) => request('PUT', `/products/${id}`, input),
    createProductVersion: productId =>
      request('POST', `/products/${productId}/versions`, {}),
    listProductVersions: productId =>
      request('GET', `/products/${productId}/versions`),
    addProductComponent: (versionId, input) =>
      request('POST', `/versions/${versionId}/components`, input),
    listProductComponents: versionId =>
      request('GET', `/versions/${versionId}/components`),
    createTraceabilityLink: input =>
      request('POST', '/traceability-links', input),
    getProductTraceability: productId =>
      request('GET', `/products/${productId}/traceability`),
    checkReleaseGate: versionId =>
      request('GET', `/versions/${versionId}/release-gate`),
    transitionVersionStatus: (versionId, targetStatus, signature) =>
      request('POST', `/versions/${versionId}/transition`, { targetStatus, signature }),
    listProductSignatures: productId =>
      request('GET', `/products/${productId}/signatures`).then(
        (body: { items: ProductSignatureRecord[] }) => body.items,
      ),
    listProductBaselines: versionId =>
      request('GET', `/versions/${versionId}/baselines`),
    createProductBaseline: (versionId, input) =>
      request('POST', `/versions/${versionId}/baselines`, input ?? {}),
    approveProductBaseline: (baselineId, signature) =>
      request('POST', `/baselines/${baselineId}/approve`, { signature }),
    bindUrsBaseline: (versionId, ursBaselineId) =>
      request('POST', `/versions/${versionId}/urs-baseline`, { ursBaselineId }),
    listProductRequirements: versionId =>
      request('GET', `/versions/${versionId}/requirements`).then(
        (body: { items: ProductRequirement[] }) => body.items,
      ),
    getRequirementCoverage: versionId =>
      request('GET', `/versions/${versionId}/requirement-coverage`),
    importTestEvidence: versionId =>
      request('POST', `/versions/${versionId}/test-evidence/import`, {}),
    importReleaseProvenance: versionId =>
      request('POST', `/versions/${versionId}/release-provenance/import`, {}),
    listComponentContracts: componentId =>
      request('GET', `/components/${componentId}/contracts`),
    listVersionDependencies: versionId =>
      request('GET', `/versions/${versionId}/dependencies`),
    getContract: contractId => request('GET', `/contracts/${contractId}`),
  };
}
