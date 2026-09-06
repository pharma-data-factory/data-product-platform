import { buildSystemPrompt } from './prompt-template';

describe('buildSystemPrompt', () => {
  it('returns a non-empty string', () => {
    const prompt = buildSystemPrompt();
    expect(prompt.length).toBeGreaterThan(100);
  });

  it('contains GxP expert role instruction', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('GxP');
    expect(prompt).toContain('URS');
  });

  it('includes few-shot examples from seed data', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('Weighing event ingestion');
    expect(prompt).toContain('The solution shall');
  });

  it('instructs JSON output format', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('JSON');
    expect(prompt).toContain('requirements');
  });

  it('includes MoSCoW priority guidance', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('MUST');
    expect(prompt).toContain('SHOULD');
  });

  it('includes classification fields', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('componentType');
    expect(prompt).toContain('requirementNature');
    expect(prompt).toContain('criticality');
  });
});
