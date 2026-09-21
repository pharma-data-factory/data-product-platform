import { COMPONENT_TYPES } from '@internal/platform-common';
import type { AvailableComponentSummary } from './llm-client';

export function buildSystemPrompt(): string {
  return [
    'You are a GxP Data Platform architect specializing in life sciences manufacturing data products.',
    '',
    'Your task is to recommend platform components for building a data product composition.',
    '',
    'Rules:',
    '- Only suggest components from the provided available components list',
    '- Use exact component names as they appear in the list',
    '- Assign priority: "required" (core functionality), "recommended" (best practice), "optional" (nice-to-have)',
    '- Consider GxP compliance: governance, audit, and observability components are often required in regulated environments',
    '- Do not suggest components that are already selected',
    '- Suggest 3-8 components depending on complexity',
    '- Provide a clear reason for each suggestion referencing the product description or domain',
    '',
    'Example suggestions (use as style reference):',
    '',
    'Name: mqtt-consumer',
    'Reason: Required for real-time equipment telemetry ingestion in OEE monitoring.',
    'Priority: required',
    '',
    'Name: time-series-storage',
    'Reason: Recommended for persisting high-frequency sensor data with retention policies.',
    'Priority: recommended',
    '',
    'Name: health-check',
    'Reason: Required for runtime availability monitoring and alerting in GxP environments.',
    'Priority: required',
    '',
    'Respond ONLY with a JSON object: { "suggestions": [...] }',
  ].join('\n');
}

// ============================================================================
// Product Spec Generation Prompts
// ============================================================================

export interface ProductSpecContext {
  businessNeed: string;
  solutionType: string;
  solutionName: string;
  requirements: Array<{
    id: string;
    title: string;
    statement: string;
    category?: string;
    priority?: string;
    classification?: {
      componentType?: string;
      requirementNature?: string;
      criticality?: string;
    };
  }>;
  businessCapabilities: string[];
  availableComponents: AvailableComponentSummary[];
}

export function buildProductSpecSystemPrompt(): string {
  return [
    'You are a GxP Data Platform Solution Architect specializing in life sciences manufacturing.',
    '',
    'Your task is to generate a complete product specification from approved URS requirements.',
    'The product is a BLACK BOX: URS requirements are inputs, the product transforms them into validated outputs.',
    '',
    'Rules:',
    '- Only suggest components from the provided available components list',
    '- Use exact component names as they appear in the list',
    '- Every suggested component MUST reference at least one URS requirement ID (traceability)',
    '- Assign priority: "required" (directly satisfies a MUST-have URS), "recommended" (best practice for SHOULD-have), "optional" (nice-to-have)',
    `- Classify every component with a componentType from this list exactly: ${COMPONENT_TYPES.join(', ')}`,
    '- Consider ISA-88 batch control model: map requirements to recipe layers (General → Site → Master → Control)',
    '- Consider GxP compliance: audit, governance, and observability components are required for regulated environments',
    '- Suggest data contracts that define input/output interfaces between components',
    '- Generate a descriptive product name and domain based on the business need',
    '',
    'Output format (JSON):',
    '{',
    '  "productName": "descriptive-name",',
    '  "description": "What this product does and why",',
    '  "domain": "manufacturing|quality|lab|supply-chain|...",',
    '  "components": [',
    '    { "name": "exact-component-name", "reason": "...", "componentType": "PROCESSING", "priority": "required|recommended|optional", "traceabilityRefs": ["req-id-1"] }',
    '  ],',
    '  "contracts": [',
    '    { "name": "contract-name", "type": "input|output|internal", "description": "...", "traceabilityRefs": ["req-id-1"] }',
    '  ]',
    '}',
  ].join('\n');
}

export function buildProductSpecUserPrompt(context: ProductSpecContext): string {
  const parts: string[] = [];

  parts.push('Generate a product specification from the following approved URS baseline:\n');
  parts.push(`Business Need: ${context.businessNeed}`);
  parts.push(`Solution Type: ${context.solutionType}`);
  parts.push(`Solution Name: ${context.solutionName}`);

  if (context.businessCapabilities.length > 0) {
    parts.push(`\nBusiness Capabilities: ${context.businessCapabilities.join(', ')}`);
  }

  parts.push(`\nURS Requirements (${context.requirements.length}):`);
  for (const req of context.requirements) {
    const classInfo = req.classification
      ? ` [${req.classification.componentType || '-'}/${req.classification.requirementNature || '-'}/${req.classification.criticality || '-'}]`
      : '';
    parts.push(`- [${req.id}] ${req.title}: ${req.statement} (${req.priority || 'unspecified'})${classInfo}`);
  }

  parts.push('\nAvailable platform components:');
  for (const c of context.availableComponents) {
    parts.push(`- ${c.name} (${c.title}): ${c.purpose} [${c.category}, ${c.certificationStatus}]`);
  }

  parts.push('\nRespond with a JSON object matching the specified output format.');

  return parts.join('\n');
}

// ============================================================================
// Governed AI Data Analyst prompts (Phase 6, P6-S2)
// ============================================================================

/**
 * System prompt for the Governed AI Data Analyst.
 *
 * Governance constraints:
 * - Only answer based on the provided product descriptor (no external knowledge)
 * - Never fabricate quality metrics or validation status
 * - Always acknowledge when information is NOT_AVAILABLE
 * - Never claim the product is validated when it isn't
 */
export function buildProductAnalystSystemPrompt(): string {
  return [
    'You are a Governed AI Data Analyst for the Nexora manufacturing data platform.',
    '',
    'Your role is to answer questions about a specific data product using ONLY the',
    'information provided in the product descriptor below. You do not have access to',
    'the actual data — only the product metadata.',
    '',
    'Governance rules:',
    '- Never fabricate quality metrics, validation status, or data values',
    '- Always use NOT_AVAILABLE as the answer when a field shows that value',
    '- Never claim a product is GxP validated unless validation.status === VALIDATED',
    '- Be concise but complete; cite which field or annotation you are reading from',
    '- If the question cannot be answered from the descriptor, say so clearly',
    '',
    'End every response with: "Source: product descriptor (governance-bounded)."',
  ].join('\n');
}

export function buildProductAnalystUserPrompt(
  question: string,
  productContext: Record<string, unknown>,
): string {
  const context = JSON.stringify(productContext, null, 2);
  return [
    'Product Descriptor:',
    '```json',
    context,
    '```',
    '',
    `Question: ${question}`,
  ].join('\n');
}
