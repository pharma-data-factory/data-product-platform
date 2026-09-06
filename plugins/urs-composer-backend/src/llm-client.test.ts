import { MockLLMClient, OpenAILLMClient } from './llm-client';
import type { RequirementGenerationContext } from './llm-client';

const testContext: RequirementGenerationContext = {
  businessCapabilities: ['Material Dispensing'],
  businessNeed: {
    title: 'Operators must weigh materials accurately',
    desiredOutcome: 'Zero dispensing errors',
    businessValue: 'Patient safety',
  },
  context: {
    title: 'Weighing & Dispensing',
    scope: 'Raw material weighing for batch production',
    gxpRelevance: 'DIRECT' as any,
    patientImpact: true,
    dataIntegrityImpact: true,
    electronicRecords: true,
  },
};

describe('MockLLMClient', () => {
  it('returns static suggestions', async () => {
    const client = new MockLLMClient();
    const results = await client.generateRequirements(testContext, 'test prompt');

    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.title).toBeTruthy();
      expect(r.statement).toBeTruthy();
      expect(r.priority).toBeTruthy();
      expect(r.classification).toBeDefined();
      expect(r.gxpRelevance).toBeTruthy();
    }
  });
});

describe('OpenAILLMClient response parsing', () => {
  function createMockFetch(responseBody: unknown, status = 200) {
    return jest.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(responseBody),
      text: () => Promise.resolve(JSON.stringify(responseBody)),
    });
  }

  it('parses valid JSON response with requirements array', async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              requirements: [
                {
                  title: 'Test Requirement',
                  statement: 'The solution shall do X',
                  rationale: 'Because Y',
                  priority: 'MUST',
                  classification: {
                    componentType: 'PROCESSING',
                    requirementNature: 'FUNCTIONAL',
                    criticality: 'HIGH',
                  },
                  gxpRelevance: 'DIRECT',
                },
              ],
            }),
          },
        },
      ],
    };

    const client = new OpenAILLMClient({
      baseUrl: 'https://api.test.com',
      apiKey: 'test-key',
      model: 'gpt-4o-mini',
      fetchApi: createMockFetch(mockResponse) as any,
    });

    const results = await client.generateRequirements(testContext, 'system prompt');
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Test Requirement');
    expect(results[0].priority).toBe('MUST');
  });

  it('skips invalid items in the array', async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              requirements: [
                {
                  title: 'Valid',
                  statement: 'The solution shall work',
                  priority: 'SHOULD',
                },
                {
                  title: 'Missing statement',
                  priority: 'MUST',
                },
                {
                  statement: 'Missing title',
                  priority: 'MUST',
                },
              ],
            }),
          },
        },
      ],
    };

    const client = new OpenAILLMClient({
      baseUrl: 'https://api.test.com',
      apiKey: 'test-key',
      model: 'gpt-4o-mini',
      fetchApi: createMockFetch(mockResponse) as any,
    });

    const results = await client.generateRequirements(testContext, 'system prompt');
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Valid');
  });

  it('throws on non-JSON response', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.reject(new Error('invalid json')),
      text: () => Promise.resolve('not json'),
    });

    const client = new OpenAILLMClient({
      baseUrl: 'https://api.test.com',
      apiKey: 'test-key',
      model: 'gpt-4o-mini',
      fetchApi: fetchFn as any,
    });

    await expect(
      client.generateRequirements(testContext, 'system prompt'),
    ).rejects.toThrow('invalid json');
  });

  it('throws on API error', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve('Rate limit exceeded'),
    });

    const client = new OpenAILLMClient({
      baseUrl: 'https://api.test.com',
      apiKey: 'test-key',
      model: 'gpt-4o-mini',
      fetchApi: fetchFn as any,
    });

    await expect(
      client.generateRequirements(testContext, 'system prompt'),
    ).rejects.toThrow('LLM API error (429)');
  });

  it('throws on empty response', async () => {
    const mockResponse = { choices: [{ message: { content: '' } }] };

    const client = new OpenAILLMClient({
      baseUrl: 'https://api.test.com',
      apiKey: 'test-key',
      model: 'gpt-4o-mini',
      fetchApi: createMockFetch(mockResponse) as any,
    });

    await expect(
      client.generateRequirements(testContext, 'system prompt'),
    ).rejects.toThrow('empty response');
  });

  it('applies default classification when missing', async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              requirements: [
                {
                  title: 'No Classification',
                  statement: 'The solution shall handle defaults',
                  priority: 'COULD',
                },
              ],
            }),
          },
        },
      ],
    };

    const client = new OpenAILLMClient({
      baseUrl: 'https://api.test.com',
      apiKey: 'test-key',
      model: 'gpt-4o-mini',
      fetchApi: createMockFetch(mockResponse) as any,
    });

    const results = await client.generateRequirements(testContext, 'system prompt');
    expect(results[0].classification.componentType).toBe('PROCESSING');
    expect(results[0].classification.requirementNature).toBe('FUNCTIONAL');
    expect(results[0].gxpRelevance).toBe('NONE');
  });
});
