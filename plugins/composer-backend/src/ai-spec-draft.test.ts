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
        // The stable logical id. Slice 1a made it load-bearing: the snapshot
        // is keyed on it and a requirement without one cannot be mapped to a
        // component or a test, so the binding refuses.
        requirementRef: 'URS-WD-001',
        title: 'Balance events arrive within 2 seconds',
        statement:
          'The solution shall ingest weighing events in near real time.',
        priority: 'MUST',
        gxpRelevance: 'DIRECT',
        contentHash: 'sha256:urs-version-0001',
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
          // The prompt demands this of the model and the draft has always
          // carried it; until Slice 1a `applySpecDraft` dropped it, so every
          // AI-built product failed its own release gate on
          // INCOMPLETE_TRACEABILITY.
          traceabilityRefs: ['URS-WD-001'],
        },
      ],
      contracts: [],
      provenance: {
        modelId: 'stub-model',
        promptHash: `sha256:${'0'.repeat(64)}`,
        rawResponse: '{"stub":true}',
      },
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

  // MVP1 item 6 / NXD-064 C-3. The draft used to live in a Map on the service
  // instance, so it was lost on restart and invisible to a second one. A
  // second ComposerService over the same database is what "a second instance"
  // means here — if the draft were still in process memory this reads
  // undefined.
  it('survives the service that generated it', async () => {
    const draft = await service.generateProductSpec(URS_BASELINE_ID, actor);

    const secondInstance = new ComposerService({
      logger: mockLogger,
      repository: await ComposerRepository.create({ getClient: () => db }),
      ursBaselineResolver: stubResolver(),
      llmClient: stubLlmClient(),
    });

    const readBack = await secondInstance.getSpecDraft(draft.id);
    expect(readBack).toMatchObject({
      id: draft.id,
      status: 'PENDING_REVIEW',
      ursBaselineId: URS_BASELINE_ID,
      productName: draft.productName,
    });
    expect(readBack?.suggestedComponents).toEqual(draft.suggestedComponents);
  });

  // The provenance C-3 asks for by name: "persist drafts with model id, prompt
  // hash and raw response before they can be applied". Parsing is lossy on
  // purpose — invented requirement refs are dropped, unknown component types
  // fall back to PROCESSING — so only rawResponse can answer whether the
  // proposal was altered before a human applied it.
  it('records which model proposed it and what it actually said', async () => {
    const draft = await service.generateProductSpec(URS_BASELINE_ID, actor);
    const stored = await service.getSpecDraft(draft.id);

    expect(stored?.modelId).toBeTruthy();
    expect(stored?.promptHash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(stored?.rawResponse).toBeTruthy();
    expect(JSON.parse(stored!.rawResponse)).toBeDefined();
  });

  it('records the product an applied draft became, and refuses to apply twice', async () => {
    const draft = await service.generateProductSpec(URS_BASELINE_ID, actor);
    const product = await service.applySpecDraft(draft.id, actor);

    const applied = await service.getSpecDraft(draft.id);
    expect(applied?.productId).toBe(product.id);
    expect(applied?.appliedBy).toBe(actor);

    // The status guard now reads from the store rather than from an object the
    // caller happens to hold, so it still holds across instances.
    await expect(service.applySpecDraft(draft.id, actor)).rejects.toThrow(
      /Cannot apply draft in status APPLIED/,
    );
  });

  it('keeps a rejected draft, and keeps it rejected', async () => {
    const draft = await service.generateProductSpec(URS_BASELINE_ID, actor);
    await service.rejectSpecDraft(draft.id, actor);

    const rejected = await service.getSpecDraft(draft.id);
    // Rejected, not deleted: what the model proposed and a human declined is
    // exactly the record C-3 says was missing.
    expect(rejected?.status).toBe('REJECTED');
    expect(rejected?.rawResponse).toBeTruthy();
    expect(rejected?.productId).toBeUndefined();

    await expect(service.rejectSpecDraft(draft.id, actor)).rejects.toThrow(
      /Cannot reject draft in status REJECTED/,
    );
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
    expect((await service.getSpecDraft(draft.id))?.status).toBe('APPLIED');
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
    // Inherited from the version binding now, rather than passed straight to
    // the baseline — one binding mechanism instead of two.
    expect(baselines[0].ursBaselineIds).toContain(URS_BASELINE_ID);
    expect(versions[0].ursBaselineId).toBe(URS_BASELINE_ID);
  });

  it('brings the requirements across, not just the baseline id', async () => {
    const draft = await service.generateProductSpec(URS_BASELINE_ID, actor);
    const product = await service.applySpecDraft(draft.id, actor);
    const [version] = await service.listProductVersions(product.id);

    const requirements = await service.listProductRequirements(version.id);
    expect(requirements.map(r => r.requirementRef)).toEqual(['URS-WD-001']);
    expect(requirements[0].contentHash).toBe('sha256:urs-version-0001');
  });

  it('creates the traceability links the model was asked to produce', async () => {
    // Previously the suggested components were created and their
    // traceabilityRefs discarded, so the generated product could not pass
    // INCOMPLETE_TRACEABILITY — the gate refused the platform's own output.
    const draft = await service.generateProductSpec(URS_BASELINE_ID, actor);
    const product = await service.applySpecDraft(draft.id, actor);
    const [version] = await service.listProductVersions(product.id);

    const coverage = await service.getRequirementCoverage(version.id);
    expect(coverage.total).toBe(1);
    expect(coverage.mapped).toBe(1);
    expect(coverage.unmapped).toBe(0);
  });
});
