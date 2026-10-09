/**
 * NXD-153. An AI build assignment: bound requirements of a DRAFT version go
 * to the product repository's AI build workflow, recorded before they are
 * dispatched; what GitHub shows afterwards — run, pull request, merge — is
 * recorded as outcome, each change an audit event. Nexora writes no code.
 */

import knex, { Knex } from 'knex';
import { ComposerRepository } from './repository';
import { ComposerService } from './service';
import type { UrsBaselineResolver } from './urs-baseline-resolver';
import type { AiBuildClient } from './ai-build-client';

const mockLogger: any = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn((): any => mockLogger),
};

const actor = 'user:default/demo-author';
const REPO = 'https://github.com/pharma-data-factory/oee';

const requirement = (ref: string) => ({
  id: `rv-${ref}`,
  requirementRef: ref,
  title: `${ref} title`,
  statement: `${ref} statement`,
  priority: 'MUST',
  gxpRelevance: 'INDIRECT',
  versionLabel: '1.0',
  contentHash: `sha256:${ref}`,
});

const resolver: UrsBaselineResolver = {
  resolveApprovedBaseline: jest.fn(async (id: string) => ({
    id,
    status: 'APPROVED',
    baselineVersion: '1.0',
  })),
  resolveBaselineContext: jest.fn(async (id: string) => ({
    baselineId: id,
    baselineVersion: '1.0',
    requirementSetId: 'seed:urs-epm',
    solutionName: 'EPM',
    businessCapabilities: [],
    requirements: [
      requirement('URS-EPM-001'),
      requirement('URS-EPM-002'),
    ] as any,
  })),
};

describe('AI build assignments (NXD-153)', () => {
  let db: Knex;
  let repository: ComposerRepository;
  let service: ComposerService;
  let versionId: string;
  let client: { dispatch: jest.Mock; getStatus: jest.Mock };

  const events = async () =>
    (
      await db('composer_audit_events')
        .where({ entity_type: 'AI_BUILD_ASSIGNMENT' })
        .orderBy('timestamp')
    ).map((e: any) => e.event_type);

  async function setUp(aiBuild = true, bind = true) {
    db = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    repository = await ComposerRepository.create({ getClient: () => db });
    client = {
      dispatch: jest.fn(async () => ({ dispatched: true })),
      getStatus: jest.fn(async () => ({ available: true })),
    };
    service = new ComposerService({
      logger: mockLogger,
      repository,
      ursBaselineResolver: resolver,
      ...(aiBuild
        ? {
            aiBuild: {
              client: client as AiBuildClient,
              agents: {
                'claude-code': { model: 'claude-opus-5-5' },
                codex: { model: 'gpt-6.1-sol' },
              },
              defaultAgent: 'claude-code',
            },
          }
        : {}),
    });
    const product = await service.createProduct(
      {
        name: 'oee-line-3',
        productType: 'DATA_PRODUCT',
        repositoryUrl: REPO,
      } as any,
      actor,
    );
    const version = await service.createProductVersion(
      product.id,
      { version: '1.0' },
      actor,
    );
    if (bind) await service.bindUrsBaseline(version.id, 'urs-epm-1', actor);
    versionId = version.id;
  }

  afterEach(async () => {
    await db?.destroy();
  });

  it('records the assignment, then dispatches the bound requirements with their text', async () => {
    await setUp();
    const assignment = await service.issueAiBuildAssignment(
      versionId,
      { note: ' Start with the API. ' },
      actor,
    );

    expect(assignment).toMatchObject({
      status: 'DISPATCHED',
      versionLabel: '1.0',
      agent: 'claude-code',
      modelId: 'claude-opus-5-5',
      repositoryUrl: REPO,
      branch: `nexora/ai-${assignment.id}`,
      issuedBy: actor,
      note: 'Start with the API.',
      requirements: [
        {
          requirementRef: 'URS-EPM-001',
          ursRequirementVersionId: 'rv-URS-EPM-001',
          contentHash: 'sha256:URS-EPM-001',
        },
        {
          requirementRef: 'URS-EPM-002',
          ursRequirementVersionId: 'rv-URS-EPM-002',
          contentHash: 'sha256:URS-EPM-002',
        },
      ],
    });
    expect(assignment.payloadHash).toMatch(/^sha256:[0-9a-f]{64}$/);
    const [repoUrl, payload] = client.dispatch.mock.calls[0];
    expect(repoUrl).toBe(REPO);
    expect(payload).toEqual({
      assignmentId: assignment.id,
      agent: 'claude-code',
      model: 'claude-opus-5-5',
      product: 'oee-line-3',
      version: '1.0',
      requirements: [
        {
          id: 'URS-EPM-001',
          title: 'URS-EPM-001 title',
          statement: 'URS-EPM-001 statement',
          priority: 'MUST',
        },
        {
          id: 'URS-EPM-002',
          title: 'URS-EPM-002 title',
          statement: 'URS-EPM-002 statement',
          priority: 'MUST',
        },
      ],
      note: 'Start with the API.',
    });
    expect(await service.listAiBuildAssignments(versionId)).toEqual([
      assignment,
    ]);
    expect(await events()).toEqual([
      'AI_BUILD_ASSIGNED',
      'AI_BUILD_DISPATCHED',
    ]);
  });

  it('runs the agent the assignment names, with its model, and refuses one not offered (NXD-154)', async () => {
    await setUp();
    const codex = await service.issueAiBuildAssignment(
      versionId,
      { agent: 'codex' },
      actor,
    );
    expect(codex).toMatchObject({ agent: 'codex', modelId: 'gpt-6.1-sol' });
    expect(client.dispatch.mock.calls[0][1]).toMatchObject({
      agent: 'codex',
      model: 'gpt-6.1-sol',
    });
    expect(await service.listAiBuildAssignments(versionId)).toEqual([codex]);
    const assigned = await db('composer_audit_events')
      .where({ event_type: 'AI_BUILD_ASSIGNED' })
      .first();
    expect(JSON.parse(assigned.new_value)).toMatchObject({
      agent: 'codex',
      modelId: 'gpt-6.1-sol',
    });
    for (const agent of ['gemini', 42, 'toString']) {
      await expect(
        service.issueAiBuildAssignment(versionId, { agent }, actor),
      ).rejects.toThrow('agent must be one of claude-code, codex');
    }
    expect(client.dispatch).toHaveBeenCalledTimes(1);
    expect(service.getAiBuildAgents()).toEqual({
      enabled: true,
      defaultAgent: 'claude-code',
      agents: [
        { agent: 'claude-code', model: 'claude-opus-5-5' },
        { agent: 'codex', model: 'gpt-6.1-sol' },
      ],
    });
  });

  it('reads an assignment from before the agent was recorded as Claude Code (NXD-154)', async () => {
    await setUp();
    const a = await service.issueAiBuildAssignment(versionId, {}, actor);
    await db('ai_build_assignments')
      .where({ id: a.id })
      .update({ agent: null });
    expect((await repository.getAiBuildAssignment(a.id))?.agent).toBe(
      'claude-code',
    );
  });

  it('assigns a subset by id, and refuses an id the version does not carry', async () => {
    await setUp();
    const one = await service.issueAiBuildAssignment(
      versionId,
      { requirementRefs: ['URS-EPM-002'] },
      actor,
    );
    expect(one.requirements.map(r => r.requirementRef)).toEqual([
      'URS-EPM-002',
    ]);
    await expect(
      service.issueAiBuildAssignment(
        versionId,
        { requirementRefs: ['URS-EPM-999'] },
        actor,
      ),
    ).rejects.toThrow('Not bound to version 1.0: URS-EPM-999');
    await expect(
      service.issueAiBuildAssignment(versionId, { requirementRefs: [] }, actor),
    ).rejects.toThrow('at least one');
  });

  it('keeps an assignment GitHub did not take, with the reason, and dispatches nothing twice', async () => {
    await setUp();
    client.dispatch.mockResolvedValueOnce({
      dispatched: false,
      reason: 'no-ai-build-workflow',
    });
    const refused = await service.issueAiBuildAssignment(versionId, {}, actor);
    expect(refused).toMatchObject({
      status: 'NOT_DISPATCHED',
      dispatchReason: 'no-ai-build-workflow',
    });

    client.dispatch.mockRejectedValueOnce(new Error('data-products down'));
    const failed = await service.issueAiBuildAssignment(versionId, {}, actor);
    expect(failed).toMatchObject({
      status: 'NOT_DISPATCHED',
      dispatchReason: 'unavailable',
    });

    expect(
      (await service.listAiBuildAssignments(versionId)).map(a => a.status),
    ).toEqual(['NOT_DISPATCHED', 'NOT_DISPATCHED']);
    expect(
      await service.refreshAiBuildAssignment(refused.id, actor),
    ).toMatchObject({ status: 'NOT_DISPATCHED' });
    expect(client.getStatus).not.toHaveBeenCalled();
  });

  it('refuses without the AI build, without a binding, and for a version that is not a draft', async () => {
    await setUp(false);
    await expect(
      service.issueAiBuildAssignment(versionId, {}, actor),
    ).rejects.toThrow('not enabled');
    await db.destroy();

    await setUp(true, false);
    await expect(
      service.issueAiBuildAssignment(versionId, {}, actor),
    ).rejects.toThrow('Bind an approved URS baseline');
    await db('product_versions')
      .where({ id: versionId })
      .update({ status: 'APPROVED' });
    await expect(
      service.issueAiBuildAssignment(versionId, {}, actor),
    ).rejects.toThrow('DRAFT version only');
    expect(client.dispatch).not.toHaveBeenCalled();
  });

  it('follows GitHub: run, pull request, merge with its commit, each change one audit event', async () => {
    await setUp();
    const { id } = await service.issueAiBuildAssignment(versionId, {}, actor);

    client.getStatus.mockResolvedValueOnce({
      available: true,
      run: {
        id: 5,
        url: 'https://github.com/pharma-data-factory/oee/actions/runs/5',
        status: 'in_progress',
        conclusion: null,
      },
    });
    expect(await service.refreshAiBuildAssignment(id, actor)).toMatchObject({
      status: 'RUNNING',
    });

    client.getStatus.mockResolvedValueOnce({
      available: true,
      run: {
        id: 5,
        url: 'https://github.com/pharma-data-factory/oee/actions/runs/5',
        status: 'completed',
        conclusion: 'success',
      },
      pullRequest: {
        number: 9,
        title: 'AI build',
        url: 'https://github.com/pharma-data-factory/oee/pull/9',
        headSha: 'h1',
        state: 'open',
        merged: false,
      },
    });
    expect(await service.refreshAiBuildAssignment(id, actor)).toMatchObject({
      status: 'PR_OPEN',
      pullRequestNumber: 9,
      pullRequestHeadSha: 'h1',
      runConclusion: 'success',
    });

    // Unchanged: recorded again, no new event.
    client.getStatus.mockResolvedValueOnce({
      available: true,
      pullRequest: {
        number: 9,
        title: 'AI build',
        url: 'https://github.com/pharma-data-factory/oee/pull/9',
        headSha: 'h1',
        state: 'open',
        merged: false,
      },
    });
    await service.refreshAiBuildAssignment(id, actor);

    client.getStatus.mockResolvedValueOnce({
      available: true,
      pullRequest: {
        number: 9,
        title: 'AI build',
        url: 'https://github.com/pharma-data-factory/oee/pull/9',
        headSha: 'h2',
        state: 'closed',
        merged: true,
        mergedAt: '2026-10-08T15:00:00Z',
        mergeCommitSha: 'm1',
        closedAt: '2026-10-08T15:00:00Z',
      },
    });
    const merged = await service.refreshAiBuildAssignment(
      id,
      'user:default/reviewer',
    );
    expect(merged).toMatchObject({
      status: 'MERGED',
      mergeCommitSha: 'm1',
      pullRequestHeadSha: 'h2',
      runUrl: expect.stringContaining('/runs/5'),
    });
    expect((await repository.getAiBuildAssignment(id))?.status).toBe('MERGED');
    expect(await events()).toEqual([
      'AI_BUILD_ASSIGNED',
      'AI_BUILD_DISPATCHED',
      'AI_BUILD_RUNNING',
      'AI_BUILD_PR_OPEN',
      'AI_BUILD_MERGED',
    ]);
    expect(client.getStatus).toHaveBeenCalledWith(REPO, id);
  });

  it('names a run that failed or proposed nothing, and an unreadable GitHub as unavailable', async () => {
    await setUp();
    const a = await service.issueAiBuildAssignment(versionId, {}, actor);
    client.getStatus.mockResolvedValueOnce({
      available: true,
      run: { id: 1, url: 'u', status: 'completed', conclusion: 'failure' },
    });
    expect(await service.refreshAiBuildAssignment(a.id, actor)).toMatchObject({
      status: 'RUN_FAILED',
    });
    client.getStatus.mockResolvedValueOnce({
      available: true,
      run: { id: 1, url: 'u', status: 'completed', conclusion: 'success' },
    });
    expect(await service.refreshAiBuildAssignment(a.id, actor)).toMatchObject({
      status: 'NO_CHANGE',
    });
    client.getStatus.mockResolvedValueOnce({
      available: false,
      reason: 'inaccessible',
    });
    await expect(service.refreshAiBuildAssignment(a.id, actor)).rejects.toThrow(
      'inaccessible',
    );
  });
});
