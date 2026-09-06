export interface AvailableComponentSummary {
  name: string;
  title: string;
  category: string;
  purpose: string;
  certificationStatus: string;
}

export interface ComponentSuggestionContext {
  productName: string;
  description: string;
  domain: string;
  existingSelections: string[];
  availableComponents: AvailableComponentSummary[];
}

export type SuggestionPriority = 'required' | 'recommended' | 'optional';

export interface SuggestedComponent {
  name: string;
  reason: string;
  priority: SuggestionPriority;
}

export interface ComposerLLMClient {
  suggestComponents(
    context: ComponentSuggestionContext,
    systemPrompt: string,
  ): Promise<SuggestedComponent[]>;
}

export interface OpenAILLMClientOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  fetchApi: typeof fetch;
}

export class OpenAIComposerLLMClient implements ComposerLLMClient {
  private baseUrl: string;
  private apiKey: string;
  private model: string;
  private fetchApi: typeof fetch;

  constructor(options: OpenAILLMClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.fetchApi = options.fetchApi;
  }

  async suggestComponents(
    context: ComponentSuggestionContext,
    systemPrompt: string,
  ): Promise<SuggestedComponent[]> {
    const userPrompt = buildUserPrompt(context);

    const response = await this.fetchApi(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'unknown error');
      throw new Error(`LLM API error (${response.status}): ${text}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    const raw = data.choices?.[0]?.message?.content;
    if (!raw) {
      throw new Error('LLM returned empty response');
    }

    return parseAndValidateResponse(raw);
  }
}

export class MockComposerLLMClient implements ComposerLLMClient {
  async suggestComponents(
    context: ComponentSuggestionContext,
    _systemPrompt: string,
  ): Promise<SuggestedComponent[]> {
    const available = context.availableComponents.filter(
      c => !context.existingSelections.includes(c.name),
    );
    if (available.length === 0) {
      return [];
    }
    return available.slice(0, 3).map((c, i) => ({
      name: c.name,
      reason: `Recommended for ${context.domain} data product based on ${c.category.toLowerCase()} capabilities.`,
      priority: (['required', 'recommended', 'optional'] as const)[i % 3],
    }));
  }
}

function buildUserPrompt(context: ComponentSuggestionContext): string {
  const parts: string[] = [];

  parts.push('Suggest platform components for the following data product:\n');
  parts.push(`Product Name: ${context.productName}`);
  parts.push(`Description: ${context.description}`);
  parts.push(`Domain: ${context.domain}`);

  if (context.existingSelections.length > 0) {
    parts.push(
      `\nAlready selected: ${context.existingSelections.join(', ')}`,
    );
  }

  parts.push('\nAvailable platform components:');
  for (const c of context.availableComponents) {
    parts.push(
      `- ${c.name} (${c.title}): ${c.purpose} [${c.category}, ${c.certificationStatus}]`,
    );
  }

  parts.push(
    '\nRespond with a JSON object containing a "suggestions" array. Each item must have: name (must match an available component name exactly), reason (why this component is needed), priority ("required", "recommended", or "optional").',
  );

  return parts.join('\n');
}

function parseAndValidateResponse(raw: string): SuggestedComponent[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('LLM response is not valid JSON');
  }

  const obj = parsed as Record<string, unknown>;
  const arr = obj.suggestions;
  if (!Array.isArray(arr)) {
    throw new Error('LLM response missing "suggestions" array');
  }

  const validPriorities = new Set(['required', 'recommended', 'optional']);
  const results: SuggestedComponent[] = [];
  for (const item of arr) {
    const s = item as Record<string, unknown>;
    if (typeof s.name !== 'string' || typeof s.reason !== 'string') {
      continue;
    }
    const priority =
      typeof s.priority === 'string' && validPriorities.has(s.priority)
        ? (s.priority as SuggestionPriority)
        : 'recommended';
    results.push({
      name: s.name,
      reason: s.reason,
      priority,
    });
  }

  return results;
}
