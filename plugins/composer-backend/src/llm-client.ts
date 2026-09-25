import {
  COMPONENT_TYPES,
  isComponentType,
  type ComponentType,
} from '@internal/platform-common';
import {
  buildProductAnalystSystemPrompt,
  buildProductAnalystUserPrompt,
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
  /**
   * Answer a governance-bounded question about a data product.
   *
   * The context is the product descriptor (title, domain, owner, quality,
   * contracts, lineage, validation status, analytics providers). The LLM
   * may only answer based on that context — no raw data access.
   * Phase 6 (P6-S2).
   */
  analyzeProduct(
    question: string,
    productContext: Record<string, unknown>,
  ): Promise<string>;
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

  async analyzeProduct(
    question: string,
    productContext: Record<string, unknown>,
  ): Promise<string> {
    const systemPrompt = buildProductAnalystSystemPrompt();
    const userPrompt = buildProductAnalystUserPrompt(question, productContext);
    const response = await this.fetchApi(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        temperature: 0.4,
      }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => 'unknown error');
      throw new Error(`LLM API error (${response.status}): ${text}`);
    }
    const data = (await response.json()) as { choices: Array<{ message: { content: string } }> };
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) throw new Error('LLM returned empty response');
    return raw;
  }
}

// ============================================================================
// Anthropic (Claude) client
// ============================================================================

export interface AnthropicLLMClientOptions {
  apiKey: string;
  model: string;
  /** Max tokens per response. Defaults to 4096 — sufficient for JSON outputs. */
  maxTokens?: number;
  fetchApi: typeof fetch;
}

/**
 * The response shapes, as schemas the Anthropic API enforces.
 *
 * Until now both JSON paths asked for a shape in the prompt and hoped: the
 * parsers below exist because the model was free to answer with prose, a code
 * fence, a missing field or an invented `priority`. `output_config.format`
 * makes the shape a constraint on generation rather than a request, so the
 * failure mode it was written for stops occurring on this provider.
 *
 * They sit here rather than beside the parsers they mirror only because the
 * class below references them and this file is read top to bottom.
 *
 * **The parsers stay, and that is deliberate.** They are the contract for
 * `OpenAIComposerLLMClient` too, which has no equivalent mechanism, and a
 * schema does not survive a refusal or a truncated response (both are checked
 * in `callAnthropicApi`). Belt and braces on a path that writes to the product
 * record.
 *
 * Schema rules the API imposes, so these do not drift into being invalid:
 * every object needs `additionalProperties: false`, and `minLength`/`maximum`
 * style constraints are rejected — what cannot be expressed here is what the
 * parsers still check.
 */
const SUGGESTION_PRIORITIES = [
  'required',
  'recommended',
  'optional',
] as const;

const COMPONENT_SUGGESTIONS_SCHEMA = {
  type: 'object',
  properties: {
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description:
              'Must match one of the available component names exactly.',
          },
          reason: { type: 'string' },
          priority: { type: 'string', enum: [...SUGGESTION_PRIORITIES] },
        },
        required: ['name', 'reason', 'priority'],
        additionalProperties: false,
      },
    },
  },
  required: ['suggestions'],
  additionalProperties: false,
} as const;

const PRODUCT_SPEC_SCHEMA = {
  type: 'object',
  properties: {
    productName: { type: 'string' },
    description: { type: 'string' },
    domain: { type: 'string' },
    components: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          reason: { type: 'string' },
          // An enum, so `toComponentType`'s PROCESSING fallback can no longer
          // be reached from this provider — the model cannot invent a type.
          componentType: { type: 'string', enum: [...COMPONENT_TYPES] },
          priority: { type: 'string', enum: [...SUGGESTION_PRIORITIES] },
          traceabilityRefs: { type: 'array', items: { type: 'string' } },
        },
        required: [
          'name',
          'reason',
          'componentType',
          'priority',
          'traceabilityRefs',
        ],
        additionalProperties: false,
      },
    },
    contracts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          type: { type: 'string' },
          description: { type: 'string' },
          traceabilityRefs: { type: 'array', items: { type: 'string' } },
        },
        required: ['name', 'type', 'description', 'traceabilityRefs'],
        additionalProperties: false,
      },
    },
  },
  required: [
    'productName',
    'description',
    'domain',
    'components',
    'contracts',
  ],
  additionalProperties: false,
} as const;

/**
 * Calls the Anthropic Messages API via raw `fetch`.
 *
 * No `@anthropic-ai/sdk` dependency: the request shape is simple enough, and
 * adding a dependency requires approval under the transformation's working
 * method. Uses the same `parseAndValidateResponse` / `parseProductSpecResponse`
 * helpers as `OpenAIComposerLLMClient` — the extracted text is identical in
 * structure regardless of which provider produced it.
 *
 * Default model: `claude-haiku-4-5`. Haiku is fast and economical for
 * structured JSON output; the model can be overridden via `composer.ai.model`.
 * Operators who want higher reasoning quality can set `composer.ai.model` to
 * `claude-opus-5` or `claude-sonnet-5` without touching code.
 *
 * Response parsing: the Anthropic content array may contain `thinking` blocks
 * (on Opus 5, thinking is on by default). `callAnthropicApi` finds the first
 * `text` block, so thinking blocks are silently skipped.
 *
 * The two JSON methods send `output_config.format`, which constrains
 * generation to the schema instead of asking for it in the prompt — see
 * `COMPONENT_SUGGESTIONS_SCHEMA`. `analyzeProduct` deliberately does not: it
 * answers a person in prose. This requires a model that supports structured
 * outputs (Haiku 4.5, Sonnet 5, Opus 5, Opus 4.8 — not Opus 4.7 or 4.6), which
 * is the one constraint `composer.ai.model` now carries.
 */
export class AnthropicComposerLLMClient implements ComposerLLMClient {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly fetchApi: typeof fetch;

  constructor(options: AnthropicLLMClientOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.maxTokens = options.maxTokens ?? 4096;
    this.fetchApi = options.fetchApi;
  }

  /**
   * One call to the Messages API.
   *
   * `jsonSchema` is optional because only two of the three callers want JSON:
   * `analyzeProduct` answers a person in prose, and constraining that to a
   * schema would be wrong. When it is given, the API constrains generation to
   * it rather than being asked to comply in the prompt.
   */
  private async callAnthropicApi(
    system: string,
    userContent: string,
    jsonSchema?: unknown,
  ): Promise<string> {
    const response = await this.fetchApi(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: this.maxTokens,
          system,
          messages: [{ role: 'user', content: userContent }],
          ...(jsonSchema
            ? {
                output_config: {
                  format: { type: 'json_schema', schema: jsonSchema },
                },
              }
            : {}),
        }),
      },
    );

    if (!response.ok) {
      const text = await response.text().catch(() => 'unknown error');
      throw new Error(`Anthropic API error (${response.status}): ${text}`);
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text?: string }>;
      stop_reason?: string;
      stop_details?: { category?: string | null; explanation?: string };
    };

    // Two states where the text is present but the schema does not hold, and
    // both were previously reported as "not valid JSON" by the parser — which
    // sends whoever is debugging it looking for a prompt fault that is not
    // there.
    //
    // A refusal is a safety decision: the answer is not an attempt at the
    // schema at all. Truncation means generation hit the ceiling mid-object,
    // so the JSON is well-formed right up to where it stops.
    if (data.stop_reason === 'refusal') {
      const category = data.stop_details?.category ?? 'unspecified';
      throw new Error(
        `Anthropic API declined this request (${category}). ` +
          `The response does not follow the requested schema.`,
      );
    }
    if (data.stop_reason === 'max_tokens') {
      throw new Error(
        `Anthropic API response was truncated at max_tokens=${this.maxTokens}. ` +
          `Raise composer.ai.maxTokens for this product size.`,
      );
    }

    // Content may include thinking blocks (Opus 5); find the first text block.
    const textBlock = data.content?.find(b => b.type === 'text');
    if (!textBlock?.text) {
      throw new Error('Anthropic API returned empty text response');
    }

    return textBlock.text;
  }

  async suggestComponents(
    context: ComponentSuggestionContext,
    systemPrompt: string,
  ): Promise<SuggestedComponent[]> {
    const userPrompt = buildUserPrompt(context);
    const raw = await this.callAnthropicApi(
      systemPrompt,
      userPrompt,
      COMPONENT_SUGGESTIONS_SCHEMA,
    );
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
    const raw = await this.callAnthropicApi(
      systemPrompt,
      userPrompt,
      PRODUCT_SPEC_SCHEMA,
    );
    return parseProductSpecResponse(raw);
  }

  async analyzeProduct(
    question: string,
    productContext: Record<string, unknown>,
  ): Promise<string> {
    const raw = await this.callAnthropicApi(
      buildProductAnalystSystemPrompt(),
      buildProductAnalystUserPrompt(question, productContext),
    );
    return raw;
  }
}

// ============================================================================
// Mock client (testing / disabled state)
// ============================================================================

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

  async analyzeProduct(
    question: string,
    productContext: Record<string, unknown>,
  ): Promise<string> {
    const ctx = productContext as Record<string, unknown>;
    const title = String(ctx.title ?? ctx.name ?? 'Data Product');
    return `[Mock] "${title}" — ${question} (AI analyst disabled; configure composer.ai to enable).`;
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
