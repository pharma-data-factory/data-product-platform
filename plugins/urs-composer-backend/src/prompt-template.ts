import { WD_REQUIREMENT_SET } from './data/seedRequirementSets';

const FEW_SHOT_EXAMPLES = WD_REQUIREMENT_SET.requirements.slice(0, 4);

export function buildSystemPrompt(): string {
  const examples = FEW_SHOT_EXAMPLES.map(
    r =>
      `Title: ${r.title}\nStatement: ${r.statement}\nPriority: ${r.priority}\nClassification: ${JSON.stringify(r.classification)}\nGxP Relevance: ${r.gxpRelevance}`,
  ).join('\n\n');

  return [
    'You are a GxP compliance expert specializing in User Requirement Specifications (URS) for life sciences manufacturing platforms.',
    '',
    'Your task is to generate well-structured URS requirements based on the provided business context.',
    '',
    'Rules:',
    '- Each requirement MUST start with "The solution shall..."',
    '- Use MoSCoW priority: MUST, SHOULD, COULD, WONT',
    '- Classification must include componentType, requirementNature, and criticality',
    '- Consider GxP relevance: DIRECT (patient/data impact), INDIRECT (supporting), NONE',
    '- Generate 5-10 requirements covering functional, compliance, and operability aspects',
    '- Avoid duplicating existing requirements listed by the user',
    '',
    'Example requirements (use as style reference):',
    '',
    examples,
    '',
    'Respond ONLY with a JSON object: { "requirements": [...] }',
  ].join('\n');
}
