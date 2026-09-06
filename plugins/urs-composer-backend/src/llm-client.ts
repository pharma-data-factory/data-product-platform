import type { RequirementClassification } from '@internal/platform-common';
import type { GxPRelevance, RequirementPriority } from './types';

export interface RequirementGenerationContext {
  businessCapabilities: string[];
  businessNeed: { title: string; desiredOutcome?: string; businessValue?: string };
  context: {
    title?: string;
    scope?: string;
    outOfScope?: string;
    processContext?: string;
    gxpRelevance?: GxPRelevance;
    patientImpact?: boolean;
    dataIntegrityImpact?: boolean;
    electronicRecords?: boolean;
  };
  existingRequirements?: string[];
}

export interface GeneratedRequirement {
  title: string;
  statement: string;
  rationale: string;
  priority: RequirementPriority;
  classification: RequirementClassification;
  gxpRelevance: GxPRelevance;
}

export interface LLMClient {
  generateRequirements(
    context: RequirementGenerationContext,
    systemPrompt: string,
  ): Promise<GeneratedRequirement[]>;
}

export interface OpenAILLMClientOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  fetchApi: typeof fetch;
}

export class OpenAILLMClient implements LLMClient {
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

  async generateRequirements(
    context: RequirementGenerationContext,
    systemPrompt: string,
  ): Promise<GeneratedRequirement[]> {
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

export class MockLLMClient implements LLMClient {
  async generateRequirements(
    _context: RequirementGenerationContext,
    _systemPrompt: string,
  ): Promise<GeneratedRequirement[]> {
    return [
      {
        title: 'Data integrity audit trail',
        statement:
          'The solution shall maintain an immutable audit trail of all data modifications in compliance with ALCOA+ principles.',
        rationale:
          'Regulatory requirement for GxP systems to ensure data integrity and traceability.',
        priority: 'MUST' as RequirementPriority,
        classification: {
          componentType: 'GOVERNANCE',
          requirementNature: 'COMPLIANCE',
          criticality: 'CRITICAL',
        },
        gxpRelevance: 'DIRECT' as GxPRelevance,
      },
      {
        title: 'User authentication enforcement',
        statement:
          'The solution shall require unique user authentication before allowing any data entry or modification.',
        rationale:
          'Ensures attributable records per 21 CFR Part 11 electronic signature requirements.',
        priority: 'MUST' as RequirementPriority,
        classification: {
          componentType: 'GOVERNANCE',
          requirementNature: 'COMPLIANCE',
          criticality: 'HIGH',
        },
        gxpRelevance: 'DIRECT' as GxPRelevance,
      },
    ];
  }
}

function buildUserPrompt(context: RequirementGenerationContext): string {
  const parts: string[] = [];

  parts.push('Generate URS requirements for the following context:\n');

  if (context.businessCapabilities.length > 0) {
    parts.push(`Business Capabilities: ${context.businessCapabilities.join(', ')}`);
  }

  parts.push(`Business Need: ${context.businessNeed.title}`);
  if (context.businessNeed.desiredOutcome) {
    parts.push(`Desired Outcome: ${context.businessNeed.desiredOutcome}`);
  }
  if (context.businessNeed.businessValue) {
    parts.push(`Business Value: ${context.businessNeed.businessValue}`);
  }

  if (context.context.title) {
    parts.push(`\nURS Context: ${context.context.title}`);
  }
  if (context.context.scope) {
    parts.push(`In Scope: ${context.context.scope}`);
  }
  if (context.context.outOfScope) {
    parts.push(`Out of Scope: ${context.context.outOfScope}`);
  }
  if (context.context.processContext) {
    parts.push(`Process Context: ${context.context.processContext}`);
  }
  if (context.context.gxpRelevance) {
    parts.push(`GxP Relevance: ${context.context.gxpRelevance}`);
  }
  if (context.context.patientImpact !== undefined) {
    parts.push(`Patient Impact: ${context.context.patientImpact}`);
  }
  if (context.context.dataIntegrityImpact !== undefined) {
    parts.push(`Data Integrity Impact: ${context.context.dataIntegrityImpact}`);
  }
  if (context.context.electronicRecords !== undefined) {
    parts.push(`Electronic Records: ${context.context.electronicRecords}`);
  }

  if (context.existingRequirements && context.existingRequirements.length > 0) {
    parts.push(
      `\nExisting requirements (avoid duplicates):\n${context.existingRequirements.map(r => `- ${r}`).join('\n')}`,
    );
  }

  parts.push(
    '\nRespond with a JSON object containing a "requirements" array. Each item must have: title, statement, rationale, priority, classification, gxpRelevance.',
  );

  return parts.join('\n');
}

function parseAndValidateResponse(raw: string): GeneratedRequirement[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('LLM response is not valid JSON');
  }

  const obj = parsed as Record<string, unknown>;
  const arr = obj.requirements;
  if (!Array.isArray(arr)) {
    throw new Error('LLM response missing "requirements" array');
  }

  const results: GeneratedRequirement[] = [];
  for (const item of arr) {
    const req = item as Record<string, unknown>;
    if (
      typeof req.title !== 'string' ||
      typeof req.statement !== 'string' ||
      typeof req.priority !== 'string'
    ) {
      continue;
    }
    results.push({
      title: req.title,
      statement: req.statement,
      rationale: typeof req.rationale === 'string' ? req.rationale : '',
      priority: req.priority as RequirementPriority,
      classification: (req.classification as RequirementClassification) ?? {
        componentType: 'PROCESSING',
        requirementNature: 'FUNCTIONAL',
        criticality: 'MEDIUM',
      },
      gxpRelevance: (req.gxpRelevance as GxPRelevance) ?? 'NONE',
    });
  }

  return results;
}
