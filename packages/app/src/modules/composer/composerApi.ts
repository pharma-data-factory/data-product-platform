import { usePluginRequest } from '../products/api';

export interface AvailableComponentSummary {
  name: string;
  title: string;
  category: string;
  purpose: string;
  certificationStatus: string;
}

export type SuggestionPriority = 'required' | 'recommended' | 'optional';

export interface SuggestedComponent {
  name: string;
  reason: string;
  priority: SuggestionPriority;
}

export interface ComponentSuggestionRequest {
  productName: string;
  description: string;
  domain: string;
  existingSelections?: string[];
  availableComponents: AvailableComponentSummary[];
}

export type AISpecDraftStatus = 'PENDING_REVIEW' | 'APPLIED' | 'REJECTED';

export interface AISuggestedComponent {
  name: string;
  reason: string;
  priority: 'required' | 'recommended' | 'optional';
  traceabilityRefs: string[];
}

export interface AISuggestedContract {
  name: string;
  type: string;
  description: string;
  traceabilityRefs: string[];
}

export interface AISpecDraft {
  id: string;
  ursBaselineId: string;
  status: AISpecDraftStatus;
  productName: string;
  description: string;
  domain: string;
  suggestedComponents: AISuggestedComponent[];
  suggestedContracts: AISuggestedContract[];
  generatedBy: string;
  generatedAt: string;
  appliedBy?: string;
  appliedAt?: string;
}

/**
 * NXD-175. The Composer's AI routes, called the way every other Composer
 * call is: through the products module's request helper, with the signed-in
 * person's token. The routes are mounted at `/ai/...` on the `composer`
 * plugin; the client used to add a second `/composer` to the base URL and
 * send no token, so every call answered 404 (or 401) and none was tested.
 */
export interface SpecDraftReviewEdits {
  productName?: string;
  description?: string;
  domain?: string;
}

export interface ComposerAiClient {
  suggestComponents(request: ComponentSuggestionRequest): Promise<SuggestedComponent[]>;
  generateProductSpec(ursBaselineId: string): Promise<AISpecDraft>;
  getSpecDraft(id: string): Promise<AISpecDraft>;
  /** The reviewer's corrections win over the draft's values (NXD-175). */
  applySpecDraft(id: string, reviewed?: SpecDraftReviewEdits): Promise<unknown>;
  rejectSpecDraft(id: string): Promise<void>;
  /**
   * Ask the Governed AI Data Analyst a question about a data product.
   *
   * The `productContext` is the product descriptor — the LLM answers from
   * that context only, never from raw data rows. Phase 6 (P6-S2).
   */
  analyzeDataProduct(
    question: string,
    productContext: Record<string, unknown>,
  ): Promise<string>;
}

export function useComposerAiClient(): ComposerAiClient {
  const request = usePluginRequest('composer');
  const draftPath = (id: string) => `/ai/spec-drafts/${encodeURIComponent(id)}`;

  return {
    suggestComponents: suggestionRequest =>
      request('POST', '/ai/suggest-components', suggestionRequest).then(
        (body: { suggestions?: SuggestedComponent[] }) => body.suggestions ?? [],
      ),
    generateProductSpec: ursBaselineId =>
      request('POST', '/ai/generate-product-spec', { ursBaselineId }),
    getSpecDraft: id => request('GET', draftPath(id)),
    applySpecDraft: (id, reviewed) =>
      request('POST', `${draftPath(id)}/apply`, reviewed ?? {}),
    rejectSpecDraft: id => request('POST', `${draftPath(id)}/reject`, {}),
    analyzeDataProduct: (question, productContext) =>
      request('POST', '/ai/analyze-product', { question, productContext }).then(
        (body: { answer: string }) => body.answer,
      ),
  };
}
