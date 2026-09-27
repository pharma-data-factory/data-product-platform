/**
 * "What happened in this one operation?" — on the product side.
 *
 * NXD-065 asked this of the URS trail and found `audit_events.correlation_id`
 * NULL in every row. The product trail was worse: `composer_audit_events` had
 * no such column at all, and `ComposerService.audit()` minted a fresh
 * `randomUUID()` per event. Applying an AI spec draft writes events for the
 * product, the version, the URS binding, each component, each traceability
 * link, the baseline and the draft itself — one act by one reviewer, and
 * nothing joined them.
 *
 * The assertions here are about what reaches the repository, not about what
 * the service returns. That is deliberate and it is the same reason the URS
 * suite does it: the defect was invisible from the outside. Every one of
 * those calls succeeded throughout.
 */

import knex, { Knex } from 'knex';
import { ComposerRepository } from './repository';
import { ComposerService } from './service';
import type { ComposerAuditEvent } from './repository-interface';
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

const URS_BASELINE_ID = 'urs-baseline-corr-1';
const ACTOR = 'user:default/reviewer';

function stubResolver(): UrsBaselineResolver {
  const reference: UrsBaselineReference = {
    id: URS_BASELINE_ID,
    status: 'APPROVED',
    baselineVersion: '1.0',
  };
  const context: UrsBaselineContext = {
    baselineId: URS_BASELINE_ID,
    baselineVersion: '1.0',
    requirementSetId: 'urs-set-corr-1',
    solutionName: 'Correlation Probe',
    solutionType: 'data-product',
    businessNeed: 'Prove that one operation writes one correlation id',
    businessCapabilities: ['capability:default/manufacturing'],
    requirements: [
      {
        id: 'urs-version-corr-1',
        requirementRef: 'URS-CORR-001',
        title: 'Events of one operation share an id',
        statement: 'The platform shall correlate the events of one operation.',
        priority: 'MUST',
        gxpRelevance: 'DIRECT',
        contentHash: 'sha256:urs-version-corr-1',
      },
    ],
  };
  return {
    resolveApprovedBaseline: jest.fn(async () => reference),
    resolveBaselineContext: jest.fn(async () => context),
  };
}

function stubLlmClient(): ComposerLLMClient {
  return {
    suggestComponents: jest.fn(async () => []),
    generateProductSpec: jest.fn(async () => ({
      productName: 'Correlation Probe Product',
      description: 'Exists so that one apply writes many events.',
      domain: 'manufacturing',
      components: [
        {
          name: 'probe-source',
          reason: 'Ingests the probe',
          priority: 'required' as const,
          traceabilityRefs: ['URS-CORR-001'],
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

describe('composer audit correlation', () => {
  let db: Knex;
  let service: ComposerService;
  let repository: ComposerRepository;
  let captured: ComposerAuditEvent[];

  beforeEach(async () => {
    db = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await db.raw('select 1');
    repository = await ComposerRepository.create({ getClient: () => db });

    captured = [];
    const realCreate = repository.createAuditEvent.bind(repository);
    jest
      .spyOn(repository, 'createAuditEvent')
      .mockImplementation(async event => {
        captured.push(event);
        // Still write it. A spy that swallows the call would not notice the
        // repository refusing the row, which is half of what this guards.
        return realCreate(event);
      });

    service = new ComposerService({
      logger: mockLogger,
      repository,
      ursBaselineResolver: stubResolver(),
      llmClient: stubLlmClient(),
    });
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await db?.destroy();
  });

  it('gives every event of one applySpecDraft the same correlation id', async () => {
    const draft = await service.generateProductSpec(URS_BASELINE_ID, ACTOR);
    captured = [];

    await service.applySpecDraft(draft.id, ACTOR);

    // More than one event, or the assertion below proves nothing.
    expect(captured.length).toBeGreaterThan(1);

    const ids = new Set(captured.map(e => e.correlationId));
    expect(ids.size).toBe(1);
    expect([...ids][0]).toMatch(/^[0-9a-f-]{36}$/);

    // Spanning entity types is the point: a correlation that only ever joins
    // rows of one kind is a grouping, not an account of an operation.
    const entityTypes = new Set(captured.map(e => e.entityType));
    expect(entityTypes.size).toBeGreaterThan(1);
    expect(entityTypes).toContain('PRODUCT');
    expect(entityTypes).toContain('PRODUCT_VERSION');
    expect(entityTypes).toContain('PRODUCT_BASELINE');
    expect(entityTypes).toContain('AI_SPEC_DRAFT');
  });

  it('gives a separate operation a different correlation id', async () => {
    const draft = await service.generateProductSpec(URS_BASELINE_ID, ACTOR);
    captured = [];
    await service.applySpecDraft(draft.id, ACTOR);
    const first = captured[0].correlationId;

    captured = [];
    const product = await service.createProduct(
      { name: 'Unrelated Product', productType: 'DATA_PRODUCT' },
      ACTOR,
    );

    expect(captured).toHaveLength(1);
    expect(captured[0].entityId).toBe(product.id);
    expect(captured[0].correlationId).not.toBe(first);
  });

  it('persists the correlation id and reads it back on the trail', async () => {
    const product = await service.createProduct(
      { name: 'Readback Product', productType: 'DATA_PRODUCT' },
      ACTOR,
    );

    const trail = await repository.getEntityAuditTrail('PRODUCT', product.id);

    expect(trail).toHaveLength(1);
    expect(trail[0].correlationId).toBe(captured[0].correlationId);
    expect(trail[0].correlationId).not.toBe('');
  });

  // The column is nullable and the type is not. That is the deliberate
  // asymmetry NXD-065 chose and this port kept: historic rows stay NULL
  // because inventing a correlation for an event that was never part of a
  // recorded operation is worse than an honest gap. A row read back that way
  // reports the empty string, which says "not part of one" rather than
  // pretending.
  it('reads a pre-existing uncorrelated row back as an empty string', async () => {
    await db('composer_audit_events').insert({
      id: 'legacy-event-1',
      entity_type: 'PRODUCT',
      entity_id: 'legacy-product-1',
      event_type: 'PRODUCT_CREATED',
      actor: ACTOR,
      timestamp: new Date(),
    });

    const trail = await repository.getEntityAuditTrail(
      'PRODUCT',
      'legacy-product-1',
    );

    expect(trail).toHaveLength(1);
    expect(trail[0].correlationId).toBe('');
  });
});
