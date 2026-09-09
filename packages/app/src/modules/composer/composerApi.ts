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

export async function suggestComponents(
  baseUrl: string,
  request: ComponentSuggestionRequest,
): Promise<SuggestedComponent[]> {
  const response = await fetch(`${baseUrl}/composer/ai/suggest-components`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => 'unknown error');
    throw new Error(`AI suggestion failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as { suggestions: SuggestedComponent[] };
  return data.suggestions ?? [];
}

export async function generateProductSpec(
  baseUrl: string,
  ursBaselineId: string,
): Promise<AISpecDraft> {
  const response = await fetch(`${baseUrl}/composer/ai/generate-product-spec`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ursBaselineId }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => 'unknown error');
    throw new Error(`AI product spec generation failed (${response.status}): ${text}`);
  }

  return (await response.json()) as AISpecDraft;
}

export async function getSpecDraft(baseUrl: string, id: string): Promise<AISpecDraft> {
  const response = await fetch(`${baseUrl}/composer/ai/spec-drafts/${encodeURIComponent(id)}`);

  if (!response.ok) {
    const text = await response.text().catch(() => 'unknown error');
    throw new Error(`Failed to load spec draft (${response.status}): ${text}`);
  }

  return (await response.json()) as AISpecDraft;
}

export async function applySpecDraft(baseUrl: string, id: string): Promise<unknown> {
  const response = await fetch(
    `${baseUrl}/composer/ai/spec-drafts/${encodeURIComponent(id)}/apply`,
    { method: 'POST' },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => 'unknown error');
    throw new Error(`Failed to apply spec draft (${response.status}): ${text}`);
  }

  return response.json();
}

export async function rejectSpecDraft(baseUrl: string, id: string): Promise<void> {
  const response = await fetch(
    `${baseUrl}/composer/ai/spec-drafts/${encodeURIComponent(id)}/reject`,
    { method: 'POST' },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => 'unknown error');
    throw new Error(`Failed to reject spec draft (${response.status}): ${text}`);
  }
}
