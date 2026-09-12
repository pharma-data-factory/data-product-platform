import {
  fetchApiRef,
  discoveryApiRef,
  identityApiRef,
  useApi,
} from '@backstage/core-plugin-api';
import type {
  Product,
  ProductBaseline,
  ProductComponent,
  ProductVersion,
  PersistedProductManifest,
  TraceabilityLink,
} from '@internal/platform-common';

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

export interface ProductQaReadinessResult {
  productVersionId: string;
  versionStatus: string;
  releaseGatePassed: boolean;
  evidenceCompleteness:
    | 'MISSING'
    | 'PRESENT'
    | 'UNAVAILABLE'
    | 'NOT_APPLICABLE';
  evidenceId?: string;
  idempotencyKey?: string;
  ursPinStatus:
    | 'APPROVED'
    | 'SUPERSEDED'
    | 'NOT_APPROVED'
    | 'UNAVAILABLE'
    | 'MISSING'
    | 'NOT_APPLICABLE';
  ursBaselineId?: string;
  ursSupersededBy?: string;
  ursPinMessage?: string;
  message: string;
  disclaimer: 'technical-control-not-gxp';
}

export interface ApprovedUrsBaselineOption {
  id: string;
  status: string;
  baselineVersion: string;
  requirementSetId?: string;
  solutionName?: string;
}

export interface UrsBaselinePinStatus {
  id: string;
  status: string;
  baselineVersion: string;
  requirementSetId?: string;
  supersededBy?: string;
}

export interface ProductScaffoldBinding {
  productId: string;
  productName: string;
  productSlug: string;
  description?: string;
  domain?: string;
  owner?: string;
  productVersionId: string;
  productVersion: string;
  productBaselineId: string;
  ursBaselineId: string;
  manifestContentHash: string;
  manifestVersion: string;
  scaffolderPinValues: {
    productManifestContentHash: string;
    ursBaselineId: string;
    productBaselineId: string;
    productVersionId: string;
    productId: string;
  };
  supportedTemplateRefs: string[];
}

export interface ProductChangeSignalItem {
  id: string;
  changeRequestId: string;
  matchAxis?: string;
  title?: string;
  status?: string;
  productId?: string;
  productVersionId?: string;
  ursBaselineId?: string;
  source?: string;
}

export interface ProductChangeSignalsResult {
  items: ProductChangeSignalItem[];
  scanned: number;
  ursTotal: number;
  hydratedCount: number;
  disclaimer: 'advisory-soft-index-not-gxp';
}

export interface ComposerClient {
  createProduct(input: Record<string, unknown>): Promise<Product>;
  listProducts(): Promise<{ items: Product[]; total: number }>;
  getProduct(id: string): Promise<Product>;
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
  checkQaReadiness(versionId: string): Promise<ProductQaReadinessResult>;
  listProductChangeSignals(
    versionId: string,
  ): Promise<ProductChangeSignalsResult>;
  transitionVersionStatus(
    versionId: string,
    targetStatus: string,
  ): Promise<ProductVersion>;
  listProductBaselines(versionId: string): Promise<ProductBaseline[]>;
  createProductBaseline(
    versionId: string,
    input: { ursBaselineId: string; baselineVersion?: string },
  ): Promise<ProductBaseline>;
  approveProductBaseline(baselineId: string): Promise<ProductBaseline>;
  listApprovedUrsBaselines(): Promise<ApprovedUrsBaselineOption[]>;
  getUrsBaselinePinStatus(ursBaselineId: string): Promise<UrsBaselinePinStatus>;
  getProductManifest(versionId: string): Promise<PersistedProductManifest>;
  getScaffoldBinding(versionId: string): Promise<ProductScaffoldBinding>;
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
      throw new Error(data.error || `Request failed (${response.status})`);
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
    checkQaReadiness: versionId =>
      request('GET', `/versions/${versionId}/qa-readiness`),
    listProductChangeSignals: versionId =>
      request('GET', `/versions/${versionId}/change-signals`),
    transitionVersionStatus: (versionId, targetStatus) =>
      request('POST', `/versions/${versionId}/transition`, { targetStatus }),
    listProductBaselines: versionId =>
      request('GET', `/versions/${versionId}/baselines`),
    createProductBaseline: (versionId, input) =>
      request('POST', `/versions/${versionId}/baselines`, input),
    approveProductBaseline: baselineId =>
      request('POST', `/baselines/${baselineId}/approve`, {}),
    listApprovedUrsBaselines: async () => {
      const result = await request('GET', '/urs-baselines/approved');
      return (result?.items ?? []) as ApprovedUrsBaselineOption[];
    },
    getUrsBaselinePinStatus: ursBaselineId =>
      request(
        'GET',
        `/urs-baselines/${encodeURIComponent(ursBaselineId)}/status`,
      ),
    getProductManifest: versionId =>
      request('GET', `/versions/${versionId}/manifest`),
    getScaffoldBinding: versionId =>
      request('GET', `/versions/${versionId}/scaffold-binding`),
  };
}
