/**
 * AI Spec Draft tests — the URS baseline -> product path.
 *
 * This is the route a regulated product is supposed to take: an approved URS
 * baseline is resolved, an LLM proposes a specification, a reviewer applies it
 * and a product exists that can be traced back to the requirements it came
 * from. Nothing covered that path until now, which is why the two defects
 * below survived.
 */

import knex, { Knex } from 'knex';
import { ComposerRepository } from './repository';
import { ComposerService } from './service';
import type { ComposerLLMClient } from './llm-client';
import type {
  UrsBaselineContext,
  UrsBaselineReference,
  UrsBaselineResolver,
} from './urs-baseline-resolver';

const mockLogger: any = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn((): any => mockLogger),
};

function createDb(): Knex {
  return knex({
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
  });
}

const URS_BASELINE_ID = 'urs-baseline-0001';

/** Stands in for the URS Composer across the HTTP boundary. */
function stubResolver(): UrsBaselineResolver {
  const reference: UrsBaselineReference = {
    id: URS_BASELINE_ID,
    status: 'APPROVED',
    baselineVersion: '1.0',
  };

  const context: UrsBaselineContext = {
    baselineId: URS_BASELINE_ID,
    baselineVersion: '1.0',
    requirementSetId: 'urs-set-0001',
    solutionName: 'Dispensing Weighing Capture',
    solutionType: 'data-product',
    businessNeed: 'Capture weighing events from connected balances',
    businessCapabilities: ['capability:default/dispensing'],
    requirements: [
      {
        id: 'urs-version-0001',
        title: 'Balance events arrive within 2 seconds',
        statement:
          'The solution shall ingest weighing events in near real time.',
        priority: 'MUST',
      },
    ],
  };

  return {
    resolveApprovedBaseline: jest.fn(async () => reference),
    resolveBaselineContext: jest.fn(async () => context),
  };
}

/** Stands in for the LLM; returns a fixed, valid specification. */
function stubLlmClient(): ComposerLLMClient {
  return {
    suggestComponents: jest.fn(async () => []),
    generateProductSpec: jest.fn(async () => ({
      productName: 'Weighing Events Data Product',
      description: 'Near real-time weighing events from connected balances.',
      domain: 'manufacturing',
      components: [
        {
          name: 'balance-mqtt-source',
          reason: 'Ingests weighing events from the balance',
          priority: 'required' as const,
        },
      ],
      contracts: [],
    })),
  } as unknown as ComposerLLMClient;
}

describe('AI spec draft: approved URS baseline -> product', () => {
  let db: Knex;
  let service: ComposerService;
  const actor = 'user:default/test-user';

  beforeAll(async () => {
    db = createDb();
    await db.raw('select 1');
    const repository = await ComposerRepository.create({ getClient: () => db });
    service = new ComposerService({
      logger: mockLogger,
      repository,
      ursBaselineResolver: stubResolver(),
      llmClient: stubLlmClient(),
    });
  });

  afterAll(async () => {
    await db?.destroy();
  });

  it('generates a draft that is pending review', async () => {
    const draft = await service.generateProductSpec(URS_BASELINE_ID, actor);

    expect(draft.status).toBe('PENDING_REVIEW');
    expect(draft.ursBaselineId).toBe(URS_BASELINE_ID);
    expect(draft.suggestedComponents.length).toBeGreaterThan(0);
  });

  // U1 (fixed) — applySpecDraft used to pass productType: 'data-product';
  // validateProduct requires PRODUCT_TYPES = ['DATA_PRODUCT', 'SERVICE'].
  it('applies the draft, creates the product, and sets the actor as owner', async () => {
    const draft = await service.generateProductSpec(URS_BASELINE_ID, actor);

    const product = await service.applySpecDraft(draft.id, actor);

    expect(product.id).toBeTruthy();
    expect(product.name).toBe('Weighing Events Data Product');
    expect(product.productType).toBe('DATA_PRODUCT');
    // The reviewer/approver becomes the product owner, satisfying the
    // `owner-declared` platform policy obligation at apply time.
    expect(product.owner).toBe(actor);
    expect(service.getSpecDraft(draft.id)?.status).toBe('APPLIED');
  });

  // U2 — the applied draft records its origin only in the version changelog,
  // as prose. Nothing machine-readable ties the product back to the URS
  // baseline, so the release gate's URS check never fires for AI-built
  // products and traceability cannot be reported on.
  it('records the URS baseline on the product for traceability', async () => {
    const draft = await service.generateProductSpec(URS_BASELINE_ID, actor);
    const product = await service.applySpecDraft(draft.id, actor);

    const versions = await service.listProductVersions(product.id);
    expect(versions).toHaveLength(1);

    const baselines = await service.listProductBaselines(versions[0].id);
    expect(baselines.length).toBeGreaterThan(0);
    expect(baselines[0].ursBaselineIds).toContain(URS_BASELINE_ID);
  });
});
