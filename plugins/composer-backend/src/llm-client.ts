import { isComponentType, type ComponentType } from '@internal/platform-common';
import {
  buildProductSpecSystemPrompt,
  buildProductSpecUserPrompt,
  type ProductSpecContext,
} from './prompt-template';
import type {
  AISuggestedComponent,
  AISuggestedContract,
} from './types';

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
  generateProductSpec(
    context: ProductSpecContext,
  ): Promise<{
    productName: string;
    description: string;
    domain: string;
    components: AISuggestedComponent[];
    contracts: AISuggestedContract[];
  }>;
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

  async generateProductSpec(
    context: ProductSpecContext,
  ): Promise<{
    productName: string;
    description: string;
    domain: string;
    components: AISuggestedComponent[];
    contracts: AISuggestedContract[];
  }> {
    const systemPrompt = buildProductSpecSystemPrompt();
    const userPrompt = buildProductSpecUserPrompt(context);

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

    return parseProductSpecResponse(raw);
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

  async generateProductSpec(
    context: ProductSpecContext,
  ): Promise<{
    productName: string;
    description: string;
    domain: string;
    components: AISuggestedComponent[];
    contracts: AISuggestedContract[];
  }> {
    const reqIds = context.requirements.map(r => r.id);
    const components: AISuggestedComponent[] = context.availableComponents
      .slice(0, 4)
      .map((c, i) => ({
        name: c.name,
        reason: `Addresses ${c.purpose} for ${context.businessNeed}`,
        // This deterministic stub does not classify. The catalog category
        // ('data', 'integration', …) is a different vocabulary from
        // COMPONENT_TYPES, so it cannot be mapped; classification comes from
        // the model on the real generateProductSpec path.
        componentType: 'PROCESSING',
        priority: (['required', 'recommended', 'optional', 'recommended'] as const)[i],
        traceabilityRefs: reqIds.slice(i, i + 2),
      }));

    const contracts: AISuggestedContract[] = [
      {
        name: `${context.solutionName}-input-contract`,
        type: 'input',
        description: `Input data contract for ${context.solutionName}`,
        traceabilityRefs: reqIds.slice(0, 1),
      },
      {
        name: `${context.solutionName}-output-contract`,
        type: 'output',
        description: `Output data contract for ${context.solutionName}`,
        traceabilityRefs: reqIds.slice(-1),
      },
    ];

    return {
      productName: context.solutionName.replace(/\s+/g, '-').toLowerCase(),
      description: `Auto-generated product spec for: ${context.businessNeed}`,
      domain: 'manufacturing',
      components,
      contracts,
    };
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

/**
 * The model is asked to pick a componentType from COMPONENT_TYPES, but it is
 * not bound to do so. Anything outside the vocabulary — or a draft generated
 * before the field existed — becomes PROCESSING, the neutral default, so an
 * invalid value never reaches the database.
 */
export function toComponentType(value: unknown): ComponentType {
  return typeof value === 'string' && isComponentType(value)
    ? value
    : 'PROCESSING';
}

function parseProductSpecResponse(raw: string): {
  productName: string;
  description: string;
  domain: string;
  components: AISuggestedComponent[];
  contracts: AISuggestedContract[];
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('LLM response is not valid JSON');
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj.productName !== 'string') {
    throw new Error('LLM response missing "productName"');
  }
  if (typeof obj.description !== 'string') {
    throw new Error('LLM response missing "description"');
  }
  if (typeof obj.domain !== 'string') {
    throw new Error('LLM response missing "domain"');
  }

  const validPriorities = new Set(['required', 'recommended', 'optional']);
  const components: AISuggestedComponent[] = [];
  if (Array.isArray(obj.components)) {
    for (const item of obj.components) {
      const c = item as Record<string, unknown>;
      if (typeof c.name !== 'string' || typeof c.reason !== 'string') continue;
      const priority =
        typeof c.priority === 'string' && validPriorities.has(c.priority)
          ? (c.priority as 'required' | 'recommended' | 'optional')
          : 'recommended';
      const traceabilityRefs = Array.isArray(c.traceabilityRefs)
        ? (c.traceabilityRefs as unknown[]).filter(
            (r): r is string => typeof r === 'string',
          )
        : [];
      components.push({
        name: c.name,
        reason: c.reason,
        componentType: toComponentType(c.componentType),
        priority,
        traceabilityRefs,
      });
    }
  }

  const contracts: AISuggestedContract[] = [];
  if (Array.isArray(obj.contracts)) {
    for (const item of obj.contracts) {
      const ct = item as Record<string, unknown>;
      if (typeof ct.name !== 'string' || typeof ct.type !== 'string') continue;
      const traceabilityRefs = Array.isArray(ct.traceabilityRefs)
        ? (ct.traceabilityRefs as unknown[]).filter(
            (r): r is string => typeof r === 'string',
          )
        : [];
      contracts.push({
        name: ct.name,
        type: ct.type,
        description: typeof ct.description === 'string' ? ct.description : '',
        traceabilityRefs,
      });
    }
  }

  return {
    productName: obj.productName,
    description: obj.description,
    domain: obj.domain,
    components,
    contracts,
  };
}
