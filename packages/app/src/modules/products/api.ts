import {
  fetchApiRef,
  discoveryApiRef,
  identityApiRef,
  useApi,
} from '@backstage/core-plugin-api';
import type {
  Product,
  ProductComponent,
  ProductRequirement,
  ProductRequirementCoverage,
  ProductVersion,
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
  transitionVersionStatus(
    versionId: string,
    targetStatus: string,
  ): Promise<ProductVersion>;
  listProductBaselines(
    versionId: string,
  ): Promise<Array<Record<string, unknown>>>;
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
  ): Promise<Record<string, unknown>>;
  approveProductBaseline(
    baselineId: string,
  ): Promise<Record<string, unknown>>;
  bindUrsBaseline(
    versionId: string,
    ursBaselineId: string,
  ): Promise<{ version: ProductVersion; requirements: ProductRequirement[] }>;
  listProductRequirements(versionId: string): Promise<ProductRequirement[]>;
  getRequirementCoverage(
    versionId: string,
  ): Promise<ProductRequirementCoverage>;
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
    transitionVersionStatus: (versionId, targetStatus) =>
      request('POST', `/versions/${versionId}/transition`, { targetStatus }),
    listProductBaselines: versionId =>
      request('GET', `/versions/${versionId}/baselines`),
    createProductBaseline: (versionId, input) =>
      request('POST', `/versions/${versionId}/baselines`, input ?? {}),
    approveProductBaseline: baselineId =>
      request('POST', `/baselines/${baselineId}/approve`, {}),
    bindUrsBaseline: (versionId, ursBaselineId) =>
      request('POST', `/versions/${versionId}/urs-baseline`, { ursBaselineId }),
    listProductRequirements: versionId =>
      request('GET', `/versions/${versionId}/requirements`).then(
        (body: { items: ProductRequirement[] }) => body.items,
      ),
    getRequirementCoverage: versionId =>
      request('GET', `/versions/${versionId}/requirement-coverage`),
  };
}
