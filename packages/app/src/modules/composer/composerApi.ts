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

export async function suggestComponents(
  request: ComponentSuggestionRequest,
): Promise<SuggestedComponent[]> {
  const response = await fetch('/api/composer/ai/suggest-components', {
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
