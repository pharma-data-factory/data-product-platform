import {
  fetchApiRef,
  discoveryApiRef,
  identityApiRef,
  useApi,
} from '@backstage/core-plugin-api';
import type {
  Product,
  ProductComponent,
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
  };
}
