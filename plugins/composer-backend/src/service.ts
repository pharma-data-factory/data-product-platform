/**
 * Product Composer service layer.
 *
 * Owns Product/Version/Component/Contract CRUD plus traceability links.
 * Writes an append-only audit event for each mutation (ALCOA-aligned).
 */

import { LoggerService } from '@backstage/backend-plugin-api';
import { randomUUID } from 'crypto';
import {
  DataClassification,
  InterfaceType,
  PersistedProductManifest,
  Product,
  ProductBaseline,
  ProductBaselineDelta,
  ProductComponent,
  ProductQaReadiness,
  ProductVersion,
  SnapshotItemChange,
  TraceabilityLink,
  validateProduct,
  validateTraceabilityLink,
  resolveProductSoftRefMatchAxis,
  validateUrsProductBinding,
  ChangeImpactAssessment,
} from '@internal/platform-common';
import { IComposerRepository, ComposerAuditEvent } from './repository-interface';
import {
  CreateDataContractRequest,
  CreateProductBaselineRequest,
  CreateProductComponentRequest,
  CreateProductRequest,
  CreateProductVersionRequest,
  CreateTraceabilityLinkRequest,
  DataContract,
  ProductScaffoldBinding,
  TransitionProductVersionRequest,
  AISpecDraft,
  ProductChangeSignalsResult,
  ProductChangeSignalMatchAxis,
} from './types';
import type {
  UrsBaselineReference,
  UrsBaselineResolver,
} from './urs-baseline-resolver';
import { ursReleaseGateBlockerFromError } from './urs-baseline-resolver';
import type { CatalogManifestPinResolver } from './catalog-pin-resolver';
import { evaluateCatalogManifestPins } from './catalog-pin-resolver';
import type { CiStatusResolver } from './ci-status-resolver';
import { evaluateCiStatusForReleaseGate } from './ci-status-resolver';
import type { TechnicalEvidenceRegistrar } from './evidence-registrar';
import { buildDigitalThreadScaffoldArtifacts } from './digital-thread-artifacts';
import {
  buildChangeImpactAssessment,
  computeRequirementDeltas,
  hasOpenRetestRequired,
  type UrsRequirementPin,
} from './change-impact';
import {
  buildCiEvidenceIdempotencyKey,
  buildTechnicalCiEvidenceReference,
} from './evidence-registrar';
import type { TechnicalEvidenceLookup } from './evidence-lookup';
import { findTechnicalCiEvidenceByIdempotencyKey } from './evidence-lookup';
import type { ValidationDecisionResolver } from './validation-decision-resolver';
import type {
  AvailableComponentSummary,
  ComposerLLMClient,
} from './llm-client';
import { buildSystemPrompt } from './prompt-template';
import type { ProductSpecContext } from './prompt-template';
import {
  buildProductManifest,
  resolveUrsBaselineId,
  verifyPersistedManifestIntegrity,
} from './manifest';

export interface ReleaseGateBlocker {
  code: string;
  message: string;
}

const OFFICIAL_GOLDEN_PATH_TEMPLATE_REFS = [
  'template:default/mqtt-temperature-data-product',
  'template:default/rest-equipment-data-product',
  'template:default/oee-data-product',
] as const;

function slugifyProductName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['APPROVED'],
  APPROVED: ['RELEASE_CANDIDATE'],
  RELEASE_CANDIDATE: ['RELEASED', 'DRAFT'],
  RELEASED: ['SUPERSEDED'],
  SUPERSEDED: [],
};

export interface ComposerServiceOptions {
  logger: LoggerService;
  repository: IComposerRepository;
  ursBaselineResolver?: UrsBaselineResolver;
  catalogManifestPinResolver?: CatalogManifestPinResolver;
  ciStatusResolver?: CiStatusResolver;
  technicalEvidenceRegistrar?: TechnicalEvidenceRegistrar;
  technicalEvidenceLookup?: TechnicalEvidenceLookup;
  validationDecisionResolver?: ValidationDecisionResolver;
  llmClient?: ComposerLLMClient;
}

export class ComposerService {
  private readonly logger: LoggerService;
  private readonly repository: IComposerRepository;
  private readonly ursBaselineResolver?: UrsBaselineResolver;
  private readonly catalogManifestPinResolver?: CatalogManifestPinResolver;
  private readonly ciStatusResolver?: CiStatusResolver;
  private readonly technicalEvidenceRegistrar?: TechnicalEvidenceRegistrar;
  private readonly technicalEvidenceLookup?: TechnicalEvidenceLookup;
  private readonly validationDecisionResolver?: ValidationDecisionResolver;
  private readonly llmClient?: ComposerLLMClient;
  private readonly specDrafts = new Map<string, AISpecDraft>();

  constructor(options: ComposerServiceOptions) {
    this.logger = options.logger;
    this.repository = options.repository;
    this.ursBaselineResolver = options.ursBaselineResolver;
    this.catalogManifestPinResolver = options.catalogManifestPinResolver;
    this.ciStatusResolver = options.ciStatusResolver;
    this.technicalEvidenceRegistrar = options.technicalEvidenceRegistrar;
    this.technicalEvidenceLookup = options.technicalEvidenceLookup;
    this.validationDecisionResolver = options.validationDecisionResolver;
    this.llmClient = options.llmClient;
  }

  async createProduct(
    request: CreateProductRequest,
    actor: string,
  ): Promise<Product> {
    const issues = validateProduct(request);
    if (issues.length > 0) {
      throw new Error(issues.join('; '));
    }
    const product: Product = {
      id: randomUUID(),
      name: request.name,
      description: request.description,
      businessPurpose: request.businessPurpose,
      productType: request.productType as Product['productType'],
      domain: request.domain,
      subdomain: request.subdomain,
      owner: request.owner,
      team: request.team,
      lifecycle: (request.lifecycle as Product['lifecycle']) || 'EXPERIMENTAL',
      status: 'ACTIVE',
      criticality: request.criticality,
      gxpRelevance: request.gxpRelevance,
      dataClassification: request.dataClassification as
        | DataClassification
        | undefined,
      consumers: request.consumers,
      slo: request.slo,
      costInfo: request.costInfo,
      createdBy: actor,
      createdAt: new Date(),
      revision: 1,
    };
    await this.repository.createProduct(product);
    await this.audit('PRODUCT', product.id, 'PRODUCT_CREATED', actor);
    return product;
  }

  async listProducts(
    limit: number,
    offset: number,
  ): Promise<{ items: Product[]; total: number }> {
    return this.repository.listProducts(limit, offset);
  }

  async getProduct(id: string): Promise<Product | null> {
    return this.repository.getProduct(id);
  }

  async updateProduct(
    id: string,
    request: Partial<CreateProductRequest>,
    actor: string,
  ): Promise<Product> {
    const existing = await this.repository.getProduct(id);
    if (!existing) {
      throw new Error(`Product ${id} not found`);
    }
    const updated: Product = {
      ...existing,
      name: request.name ?? existing.name,
      description: request.description ?? existing.description,
      businessPurpose: request.businessPurpose ?? existing.businessPurpose,
      domain: request.domain ?? existing.domain,
      subdomain: request.subdomain ?? existing.subdomain,
      owner: request.owner ?? existing.owner,
      team: request.team ?? existing.team,
      criticality: request.criticality ?? existing.criticality,
      gxpRelevance: request.gxpRelevance ?? existing.gxpRelevance,
      updatedBy: actor,
      updatedAt: new Date(),
      revision: existing.revision + 1,
    };
    await this.repository.updateProduct(updated);
    await this.audit('PRODUCT', id, 'PRODUCT_UPDATED', actor);
    return updated;
  }

  async createProductVersion(
    productId: string,
    request: CreateProductVersionRequest,
    actor: string,
    credentials?: unknown,
  ): Promise<ProductVersion> {
    const product = await this.repository.getProduct(productId);
    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    const ursBaselineId = request.ursBaselineId?.trim();
    if (!ursBaselineId) {
      throw new Error(
        'Controlled ProductVersion requires ursBaselineId (APPROVED or BASELINED URS baseline)',
      );
    }
    if (!this.ursBaselineResolver) {
      throw new Error(
        'URS baseline resolver is not configured; cannot create a controlled ProductVersion',
      );
    }

    let ursRef: UrsBaselineReference;
    try {
      ursRef = await this.ursBaselineResolver.resolveApprovedBaseline(
        ursBaselineId,
        credentials,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Controlled Product without approved URS Baseline is rejected: ${message}`,
      );
    }

    const requirementSetId = (
      request.requirementSetId?.trim() ||
      ursRef.requirementSetId ||
      ''
    ).trim();
    const ursVersion = (
      request.ursVersion?.trim() ||
      ursRef.baselineVersion ||
      ''
    ).trim();
    const ursContentHash = (
      request.ursContentHash?.trim() ||
      ursRef.contentHash ||
      ''
    )
      .trim()
      .toLowerCase();

    const bindingIssues = validateUrsProductBinding({
      requirementSetId,
      ursBaselineId: ursRef.id,
      ursVersion,
      ursContentHash,
    });
    if (bindingIssues.length > 0) {
      throw new Error(
        `Controlled ProductVersion requires a valid URS binding: ${bindingIssues.join(
          '; ',
        )}`,
      );
    }

    if (
      request.requirementSetId?.trim() &&
      ursRef.requirementSetId &&
      request.requirementSetId.trim() !== ursRef.requirementSetId
    ) {
      throw new Error(
        `requirementSetId '${request.requirementSetId}' does not match URS baseline ${ursRef.id} (${ursRef.requirementSetId})`,
      );
    }
    if (
      request.ursVersion?.trim() &&
      ursRef.baselineVersion &&
      request.ursVersion.trim() !== ursRef.baselineVersion
    ) {
      throw new Error(
        `ursVersion '${request.ursVersion}' does not match URS baseline version '${ursRef.baselineVersion}'`,
      );
    }
    if (
      request.ursContentHash?.trim() &&
      ursRef.contentHash &&
      request.ursContentHash.trim().toLowerCase() !==
        ursRef.contentHash.toLowerCase()
    ) {
      throw new Error(
        `ursContentHash does not match live URS baseline content hash`,
      );
    }

    const versions = await this.repository.listProductVersions(productId);
    const previousApproved = versions
      .filter(v => v.status === 'RELEASED' || v.status === 'APPROVED')
      .sort((a, b) => b.versionNumber - a.versionNumber)[0];

    const versionNumber = versions.length + 1;
    const version: ProductVersion = {
      id: randomUUID(),
      productId,
      version: request.version ?? `${versionNumber}.0`,
      versionNumber,
      status: 'DRAFT',
      changelog: request.changelog,
      requirementSetId,
      ursBaselineId: ursRef.id,
      ursVersion,
      ursContentHash,
      parentVersionId: previousApproved?.id,
      createdBy: actor,
      createdAt: new Date(),
      revision: 1,
    };
    await this.repository.createProductVersion(version);
    await this.audit('PRODUCT_VERSION', version.id, 'PRODUCT_VERSION_CREATED', actor, {
      newValue: JSON.stringify({
        ursBaselineId: version.ursBaselineId,
        requirementSetId: version.requirementSetId,
        ursContentHash: version.ursContentHash,
      }),
    });
    return version;
  }

  async listProductVersions(productId: string): Promise<ProductVersion[]> {
    return this.repository.listProductVersions(productId);
  }

  async getProductVersion(id: string): Promise<ProductVersion | null> {
    return this.repository.getProductVersion(id);
  }

  async addProductComponent(
    versionId: string,
    request: CreateProductComponentRequest,
    actor: string,
  ): Promise<ProductComponent> {
    const version = await this.repository.getProductVersion(versionId);
    if (!version) {
      throw new Error(`Product version ${versionId} not found`);
    }
    if (!request.name?.trim()) {
      throw new Error('Component name is required');
    }
    const component: ProductComponent = {
      id: randomUUID(),
      productVersionId: versionId,
      componentType: request.componentType as ProductComponent['componentType'],
      name: request.name,
      description: request.description,
      ref: request.ref,
      interfaceType: request.interfaceType as InterfaceType | undefined,
      sourceSystem: request.sourceSystem,
      targetSystem: request.targetSystem,
      config: request.config,
      createdBy: actor,
      createdAt: new Date(),
      revision: 1,
    };
    await this.repository.createProductComponent(component);
    await this.audit('PRODUCT_COMPONENT', component.id, 'PRODUCT_COMPONENT_CREATED', actor);
    return component;
  }

  async listProductComponents(versionId: string): Promise<ProductComponent[]> {
    return this.repository.listProductComponents(versionId);
  }

  async addDataContract(
    componentId: string,
    request: CreateDataContractRequest,
    actor: string,
  ): Promise<DataContract> {
    if (!request.schemaType?.trim()) {
      throw new Error('Data contract schemaType is required');
    }
    const contract: DataContract = {
      id: randomUUID(),
      productComponentId: componentId,
      schemaType: request.schemaType as DataContract['schemaType'],
      schemaRef: request.schemaRef,
      contractSpec: request.contractSpec,
      status: 'DRAFT',
      version: request.version ?? '1.0',
      createdBy: actor,
      createdAt: new Date(),
      revision: 1,
    };
    await this.repository.createDataContract(contract);
    await this.audit('DATA_CONTRACT', contract.id, 'DATA_CONTRACT_CREATED', actor);
    return contract;
  }

  async createTraceabilityLink(
    request: CreateTraceabilityLinkRequest,
    actor: string,
  ): Promise<TraceabilityLink> {
    const issues = validateTraceabilityLink(request);
    if (issues.length > 0) {
      throw new Error(issues.join('; '));
    }
    const link: TraceabilityLink = {
      id: randomUUID(),
      sourceType: request.sourceType,
      sourceId: request.sourceId,
      sourceRevision: request.sourceRevision,
      relationshipType:
        request.relationshipType as TraceabilityLink['relationshipType'],
      targetType: request.targetType,
      targetId: request.targetId,
      targetRevision: request.targetRevision,
      metadata: request.metadata,
      createdBy: actor,
      createdAt: new Date(),
    };
    await this.repository.createTraceabilityLink(link);
    await this.audit('TRACEABILITY_LINK', link.id, 'TRACEABILITY_LINK_CREATED', actor);
    return link;
  }

  async deleteTraceabilityLink(id: string, actor: string): Promise<void> {
    await this.repository.deleteTraceabilityLink(id);
    await this.audit('TRACEABILITY_LINK', id, 'TRACEABILITY_LINK_DELETED', actor);
  }

  async transitionProductVersionStatus(
    versionId: string,
    request: TransitionProductVersionRequest,
    actor: string,
    credentials?: unknown,
  ): Promise<ProductVersion> {
    const version = await this.repository.getProductVersion(versionId);
    if (!version) {
      throw new Error(`Product version ${versionId} not found`);
    }
    const allowed = VALID_TRANSITIONS[version.status] ?? [];
    if (!allowed.includes(request.targetStatus)) {
      throw new Error(
        `Invalid transition from ${version.status} to ${request.targetStatus}`,
      );
    }
    if (request.targetStatus === 'RELEASED') {
      const gate = await this.checkReleaseGate(
        versionId,
        credentials,
        request.releaseCommitSha,
        true,
      );
      if (!gate.passed) {
        throw new Error(
          `Release gate failed: ${gate.blockers.map(b => b.code).join(', ')}`,
        );
      }
      // Fail-closed: register technical CI evidence BEFORE flipping status
      await this.registerTechnicalCiEvidenceForRelease(
        versionId,
        actor,
        credentials,
      );
    }
    const oldStatus = version.status;
    const updated: ProductVersion = {
      ...version,
      status: request.targetStatus as ProductVersion['status'],
      releaseCommitSha: request.releaseCommitSha ?? version.releaseCommitSha,
      artifactDigest: request.artifactDigest ?? version.artifactDigest,
    };
    if (request.targetStatus === 'APPROVED' || request.targetStatus === 'RELEASED') {
      updated.approvedBy = actor;
      updated.approvedAt = new Date();
    }
    await this.repository.updateProductVersion(updated);
    await this.audit('PRODUCT_VERSION', versionId, 'STATUS_TRANSITION', actor, {
      oldValue: oldStatus,
      newValue: request.targetStatus,
    });

    return updated;
  }

  /**
   * Soft QA readiness (advisory): Release Gate + technical CI evidence + URS pin currency.
   * Does not authorize RELEASED and is not GxP validation.
   */
  async checkQaReadiness(
    versionId: string,
    credentials?: unknown,
  ): Promise<ProductQaReadiness> {
    const version = await this.repository.getProductVersion(versionId);
    if (!version) {
      throw new Error(`Product version ${versionId} not found`);
    }
    const gate = await this.checkReleaseGate(versionId, credentials);
    const releaseGatePassed =
      version.status === 'RELEASED'
        ? true
        : gate.passed;
    const ursPin = await this.resolveUrsPinCurrency(versionId, credentials);
    const ctx = await this.resolveCiEvidenceContext(versionId, credentials);

    const base: Omit<
      ProductQaReadiness,
      'evidenceCompleteness' | 'evidenceId' | 'idempotencyKey' | 'message'
    > & { message?: string } = {
      productVersionId: versionId,
      versionStatus: version.status,
      releaseGatePassed,
      ursPinStatus: ursPin.status,
      ursBaselineId: ursPin.ursBaselineId,
      ursSupersededBy: ursPin.supersededBy,
      ursPinMessage: ursPin.message,
      disclaimer: 'technical-control-not-gxp',
    };

    const withUrsNote = (message: string): string => {
      if (!ursPin.message || ursPin.status === 'APPROVED') {
        return message;
      }
      return `${message} URS pin: ${ursPin.message}`;
    };

    if (!this.technicalEvidenceLookup) {
      return {
        ...base,
        evidenceCompleteness: 'NOT_APPLICABLE',
        message: withUrsNote(
          'Technical evidence lookup is not configured. Soft advisory only — not GxP validation.',
        ),
      };
    }

    if (!ctx) {
      return {
        ...base,
        evidenceCompleteness: 'NOT_APPLICABLE',
        message: withUrsNote(
          'No Catalog entity / CI PASSED context yet — technical CI evidence not applicable until post-scaffold CI passes.',
        ),
      };
    }

    try {
      const items = await this.technicalEvidenceLookup.listTechnicalCiEvidence(
        credentials,
      );
      const found = findTechnicalCiEvidenceByIdempotencyKey(
        items,
        ctx.idempotencyKey,
      );
      if (found) {
        return {
          ...base,
          evidenceCompleteness: 'PRESENT',
          evidenceId: found.id,
          idempotencyKey: ctx.idempotencyKey,
          message: withUrsNote(
            'Technical CI Quality Gate evidence is present in Validation Expert. Soft advisory only — not GxP validation.',
          ),
        };
      }
      return {
        ...base,
        evidenceCompleteness: 'MISSING',
        idempotencyKey: ctx.idempotencyKey,
        message: withUrsNote(
          'Technical CI evidence is not registered yet. It is written fail-closed immediately before RELEASED.',
        ),
      };
    } catch (err) {
      return {
        ...base,
        evidenceCompleteness: 'UNAVAILABLE',
        idempotencyKey: ctx.idempotencyKey,
        message: withUrsNote(
          `Unable to query Validation Expert evidence: ${
            err instanceof Error ? err.message : String(err)
          }`,
        ),
      };
    }
  }

  /**
   * Hydrate-on-read advisory reverse index: soft-match URS CRs → upsert
   * product_change_signals. Not GxP / not a structured FK into URS.
   */
  async listProductChangeSignals(
    versionId: string,
    actor: string,
    credentials?: unknown,
  ): Promise<ProductChangeSignalsResult> {
    const version = await this.repository.getProductVersion(versionId);
    if (!version) {
      throw new Error(`Product version ${versionId} not found`);
    }

    const baselines = await this.repository.listProductBaselines(versionId);
    const baselineIds = [
      ...new Set(
        baselines
          .map(b => b.ursBaselineId?.trim())
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const primaryUrsBaselineId = baselineIds[0];

    if (!this.ursBaselineResolver?.listChangeRequests) {
      const existing =
        await this.repository.listProductChangeSignals(versionId);
      return {
        items: existing,
        scanned: 0,
        ursTotal: 0,
        hydratedCount: 0,
        disclaimer: 'advisory-soft-index-not-gxp',
      };
    }

    const listed = await this.ursBaselineResolver.listChangeRequests(
      credentials,
      100,
      0,
    );
    const now = new Date();
    const views: ProductChangeSignalsResult['items'] = [];

    for (const cr of listed.items) {
      let matchAxis: ProductChangeSignalMatchAxis | null =
        resolveProductSoftRefMatchAxis(cr, {
          productId: version.productId,
          productVersionId: versionId,
          ursBaselineId: primaryUrsBaselineId,
        });
      let matchedUrsBaselineId = primaryUrsBaselineId;

      if (!matchAxis) {
        for (const baselineId of baselineIds.slice(1)) {
          const axis = resolveProductSoftRefMatchAxis(cr, {
            ursBaselineId: baselineId,
          });
          if (axis) {
            matchAxis = axis;
            matchedUrsBaselineId = baselineId;
            break;
          }
        }
      }

      if (!matchAxis) {
        continue;
      }

      const signal = await this.repository.upsertProductChangeSignal({
        id: randomUUID(),
        productId: version.productId,
        productVersionId: versionId,
        ursBaselineId: matchedUrsBaselineId,
        changeRequestId: cr.id,
        source: 'SOFT_HYDRATE',
        matchAxis,
        createdBy: actor,
        createdAt: now,
        lastHydratedAt: now,
      });

      views.push({
        ...signal,
        title: cr.title,
        status: cr.status,
      });
    }

    // Prefer freshly hydrated views; fall back to stored rows if scan found none
    // but prior signals exist (URS list truncated / unavailable phrases).
    if (views.length === 0) {
      const stored = await this.repository.listProductChangeSignals(versionId);
      return {
        items: stored,
        scanned: listed.items.length,
        ursTotal: listed.total,
        hydratedCount: 0,
        disclaimer: 'advisory-soft-index-not-gxp',
      };
    }

    return {
      items: views,
      scanned: listed.items.length,
      ursTotal: listed.total,
      hydratedCount: views.length,
      disclaimer: 'advisory-soft-index-not-gxp',
    };
  }

  private async resolveUrsPinCurrency(
    versionId: string,
    credentials?: unknown,
  ): Promise<{
    status: ProductQaReadiness['ursPinStatus'];
    ursBaselineId?: string;
    supersededBy?: string;
    message?: string;
  }> {
    const baselines = await this.repository.listProductBaselines(versionId);
    const approvedBaseline = baselines.find(b => b.status === 'APPROVED');
    const ursBaselineId = approvedBaseline?.ursBaselineId?.trim();
    if (!ursBaselineId) {
      return {
        status: 'MISSING',
        message: 'No ursBaselineId on approved product baseline.',
      };
    }
    if (!this.ursBaselineResolver) {
      return {
        status: 'NOT_APPLICABLE',
        ursBaselineId,
        message: 'URS baseline resolver is not configured.',
      };
    }
    try {
      const live = await this.ursBaselineResolver.inspectBaseline(
        ursBaselineId,
        credentials,
      );
      const status = String(live.status ?? '').toUpperCase();
      if (status === 'APPROVED') {
        return {
          status: 'APPROVED',
          ursBaselineId,
          message: 'Pinned URS baseline is APPROVED.',
        };
      }
      if (status === 'SUPERSEDED') {
        return {
          status: 'SUPERSEDED',
          ursBaselineId,
          supersededBy: live.supersededBy,
          message: live.supersededBy
            ? `Pinned URS baseline is SUPERSEDED by ${live.supersededBy}; re-baseline recommended.`
            : 'Pinned URS baseline is SUPERSEDED; re-baseline recommended.',
        };
      }
      return {
        status: 'NOT_APPROVED',
        ursBaselineId,
        supersededBy: live.supersededBy,
        message: `Pinned URS baseline status is ${status || 'UNKNOWN'}; expected APPROVED.`,
      };
    } catch (err) {
      return {
        status: 'UNAVAILABLE',
        ursBaselineId,
        message: `Unable to inspect URS baseline: ${
          err instanceof Error ? err.message : String(err)
        }`,
      };
    }
  }

  /**
   * Fail-closed registration + read-back verify of CI Quality Gate metadata
   * into Validation Expert immediately before RELEASED.
   * Skips when registrar/catalog/CI context absent.
   * Technical control only — not GxP validation.
   */
  private async registerTechnicalCiEvidenceForRelease(
    versionId: string,
    actor: string,
    credentials?: unknown,
  ): Promise<void> {
    if (
      !this.technicalEvidenceRegistrar ||
      !this.catalogManifestPinResolver ||
      !this.ciStatusResolver
    ) {
      return;
    }
    const ctx = await this.resolveCiEvidenceContext(versionId, credentials);
    if (!ctx) {
      return;
    }

    try {
      const result =
        await this.technicalEvidenceRegistrar.registerTechnicalCiEvidence(
          {
            evidenceType: 'ci-quality-gate',
            reference: JSON.stringify(ctx.referenceDoc),
            createdBy: actor,
            candidate: ctx.candidate,
            idempotencyKey: ctx.idempotencyKey,
          },
          credentials,
        );

      await this.audit(
        'PRODUCT_VERSION',
        versionId,
        result.created
          ? 'CI_EVIDENCE_REGISTERED'
          : 'CI_EVIDENCE_ALREADY_PRESENT',
        actor,
        {
          newValue: JSON.stringify({
            evidenceId: result.item.id,
            idempotencyKey: ctx.idempotencyKey,
            disclaimer: 'technical-control-not-gxp',
          }),
        },
      );

      // Read-back: RELEASED requires the same PRESENT state QA readiness reports
      if (!this.technicalEvidenceLookup) {
        throw new Error(
          'Technical evidence lookup is not configured; cannot verify PRESENT before RELEASED',
        );
      }
      const items = await this.technicalEvidenceLookup.listTechnicalCiEvidence(
        credentials,
      );
      const found = findTechnicalCiEvidenceByIdempotencyKey(
        items,
        ctx.idempotencyKey,
      );
      if (!found) {
        throw new Error(
          `Technical CI evidence not PRESENT after register (idempotencyKey=${ctx.idempotencyKey})`,
        );
      }
      await this.audit(
        'PRODUCT_VERSION',
        versionId,
        'CI_EVIDENCE_VERIFIED',
        actor,
        {
          newValue: JSON.stringify({
            evidenceId: found.id,
            idempotencyKey: ctx.idempotencyKey,
            disclaimer: 'technical-control-not-gxp',
          }),
        },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Technical CI evidence registration/verify failed for ${versionId}: ${message}`,
      );
      await this.audit(
        'PRODUCT_VERSION',
        versionId,
        'CI_EVIDENCE_REGISTER_FAILED',
        actor,
        { newValue: JSON.stringify({ error: message }) },
      );
      throw new Error(
        `Technical CI evidence registration required before RELEASED: ${message}`,
      );
    }
  }

  private async resolveCiEvidenceContext(
    versionId: string,
    credentials?: unknown,
  ): Promise<{
    idempotencyKey: string;
    candidate: string;
    referenceDoc: ReturnType<typeof buildTechnicalCiEvidenceReference>;
  } | null> {
    if (!this.catalogManifestPinResolver || !this.ciStatusResolver) {
      return null;
    }
    const version = await this.repository.getProductVersion(versionId);
    if (!version) {
      return null;
    }
    const product = await this.repository.getProduct(version.productId);
    if (!product) {
      return null;
    }
    const baselines = await this.repository.listProductBaselines(versionId);
    const approvedBaseline = baselines.find(b => b.status === 'APPROVED');
    const ursBaselineId = approvedBaseline?.ursBaselineId?.trim();
    if (!approvedBaseline || !ursBaselineId) {
      return null;
    }
    const manifest = await this.repository.getProductManifestByBaselineId(
      approvedBaseline.id,
    );
    if (!manifest) {
      return null;
    }
    const slug = slugifyProductName(product.name);
    if (!slug) {
      return null;
    }
    const pins = await this.catalogManifestPinResolver.resolveByName(
      slug,
      credentials,
    );
    if (!pins?.entityRef) {
      return null;
    }
    const ci = await this.ciStatusResolver.resolveByEntityRef(
      pins.entityRef,
      credentials,
    );
    if (ci.status !== 'PASSED') {
      return null;
    }

    const registeredAt = new Date().toISOString();
    const referenceDoc = buildTechnicalCiEvidenceReference({
      productId: version.productId,
      productVersionId: version.id,
      productBaselineId: approvedBaseline.id,
      ursBaselineId,
      manifestContentHash: manifest.contentHash,
      entityRef: pins.entityRef,
      workflowName: ci.workflowName,
      commitSha: ci.commitSha,
      branch: ci.branch,
      htmlUrl: ci.htmlUrl,
      conclusion: ci.conclusion,
      registeredAt,
    });
    const idempotencyKey = buildCiEvidenceIdempotencyKey({
      productVersionId: version.id,
      manifestContentHash: manifest.contentHash,
      commitSha: ci.commitSha,
    });
    return {
      idempotencyKey,
      candidate: product.name,
      referenceDoc,
    };
  }

  async checkReleaseGate(
    versionId: string,
    credentials?: unknown,
    releaseCommitShaOverride?: string,
    requireReleaseCommit = false,
  ): Promise<{
    passed: boolean;
    blockers: ReleaseGateBlocker[];
  }> {
    const blockers: ReleaseGateBlocker[] = [];
    const version = await this.repository.getProductVersion(versionId);
    if (!version) {
      throw new Error(`Product version ${versionId} not found`);
    }
    if (version.status !== 'RELEASE_CANDIDATE') {
      blockers.push({
        code: 'INVALID_STATUS',
        message: `Version must be RELEASE_CANDIDATE, got ${version.status}`,
      });
    }
    if (
      requireReleaseCommit &&
      !String(releaseCommitShaOverride ?? version.releaseCommitSha ?? '').trim()
    ) {
      blockers.push({
        code: 'NO_RELEASE_COMMIT',
        message: 'A Git release-candidate commit SHA is required',
      });
    }
    const components = await this.repository.listProductComponents(versionId);
    if (components.length === 0) {
      blockers.push({
        code: 'NO_COMPONENTS',
        message: 'Version must have at least one component',
      });
    }
    const allLinks = await this.repository.listTraceabilityLinks();
    const componentIds = new Set(components.map(c => c.id));
    const linkedComponentIds = new Set(
      allLinks
        .filter(l => componentIds.has(l.sourceId) || componentIds.has(l.targetId))
        .map(l => (componentIds.has(l.sourceId) ? l.sourceId : l.targetId)),
    );
    for (const comp of components) {
      if (!linkedComponentIds.has(comp.id)) {
        blockers.push({
          code: 'INCOMPLETE_TRACEABILITY',
          message: `Component ${comp.name} (${comp.id}) has no traceability link`,
        });
        break;
      }
    }
    const baselines = await this.repository.listProductBaselines(versionId);
    const approvedBaseline = baselines.find(b => b.status === 'APPROVED');
    if (!approvedBaseline) {
      blockers.push({
        code: 'NO_APPROVED_BASELINE',
        message: 'An approved product baseline is required',
      });
    }

    const openAssessment = await this.repository.getOpenChangeAssessment(
      versionId,
    );
    if (hasOpenRetestRequired(openAssessment)) {
      blockers.push({
        code: 'RETEST_REQUIRED_OPEN',
        message: `Release blocked while RETEST_REQUIRED is open for requirements: ${openAssessment!.retestRequiredRequirementIds.join(
          ', ',
        )}`,
      });
    }

    // Cross-plugin: controlled release always requires a valid APPROVED URS baseline
    const ursBaselineId = approvedBaseline?.ursBaselineId?.trim();
    if (approvedBaseline && !ursBaselineId) {
      blockers.push({
        code: 'NO_APPROVED_URS_BASELINE',
        message:
          'Approved product baseline has no ursBaselineId; a controlled release requires exactly one APPROVED URS baseline',
      });
    } else if (approvedBaseline && ursBaselineId) {
      if (!this.ursBaselineResolver) {
        blockers.push({
          code: 'NO_APPROVED_URS_BASELINE',
          message:
            'URS baseline resolver is not configured; cannot verify APPROVED URS baseline',
        });
      } else {
        try {
          await this.ursBaselineResolver.resolveApprovedBaseline(
            ursBaselineId,
            credentials,
          );
        } catch (err) {
          blockers.push(ursReleaseGateBlockerFromError(ursBaselineId, err));
        }
      }
    }

    // ProductManifest v0.1 integrity — bound to the approved product baseline
    if (approvedBaseline && ursBaselineId) {
      const manifest = await this.repository.getProductManifestByBaselineId(
        approvedBaseline.id,
      );
      if (!manifest) {
        blockers.push({
          code: 'NO_MANIFEST',
          message: `No ProductManifest found for approved product baseline ${approvedBaseline.id}`,
        });
      } else {
        const integrityIssues = verifyPersistedManifestIntegrity({
          document: manifest.document,
          expectedContentHash: manifest.contentHash,
          expectedUrsBaselineId: ursBaselineId,
          expectedProductBaselineId: approvedBaseline.id,
        });
        for (const issue of integrityIssues) {
          blockers.push({
            code: issue.code,
            message: issue.message,
          });
        }

        if (!this.validationDecisionResolver) {
          blockers.push({
            code: 'VALIDATION_DECISION_UNAVAILABLE',
            message:
              'Validation decision resolver is not configured; release is fail-closed',
          });
        } else if (integrityIssues.length === 0) {
          try {
            const decision = await this.validationDecisionResolver.resolve(
              {
                ursBaselineId,
                productId: version.productId,
                productVersionId: version.id,
                productBaselineId: approvedBaseline.id,
                manifestHash: manifest.contentHash,
                commitSha: String(
                  releaseCommitShaOverride ?? version.releaseCommitSha ?? '',
                ).trim(),
              },
              credentials,
            );
            if (decision.status !== 'APPROVED') {
              blockers.push({
                code: 'VALIDATION_DECISION_NOT_APPROVED',
                message:
                  decision.status === 'MISSING'
                    ? 'No Validation Manager context matches the release binding'
                    : `Validation context ${decision.contextId ?? ''} is not APPROVED`,
              });
            }
          } catch (err) {
            blockers.push({
              code: 'VALIDATION_DECISION_UNAVAILABLE',
              message: `Unable to verify Validation Manager decision: ${
                err instanceof Error ? err.message : String(err)
              }`,
            });
          }
        }

        // Catalog pin consistency — only when a Catalog entity exists (post-scaffold)
        if (
          this.catalogManifestPinResolver &&
          integrityIssues.length === 0
        ) {
          const product = await this.repository.getProduct(version.productId);
          const slug = product ? slugifyProductName(product.name) : '';
          if (slug) {
            try {
              const pins = await this.catalogManifestPinResolver.resolveByName(
                slug,
                credentials,
              );
              if (pins) {
                blockers.push(
                  ...evaluateCatalogManifestPins({
                    pins,
                    expected: {
                      contentHash: manifest.contentHash,
                      ursBaselineId,
                      productBaselineId: approvedBaseline.id,
                      productVersionId: version.id,
                      productId: version.productId,
                    },
                  }),
                );

                // Post-scaffold: require CI Quality Gate PASSED (fail-closed on UNKNOWN)
                if (this.ciStatusResolver) {
                  try {
                    const ci = await this.ciStatusResolver.resolveByEntityRef(
                      pins.entityRef,
                      credentials,
                    );
                    blockers.push(...evaluateCiStatusForReleaseGate(ci));
                    const releaseCommitSha = String(
                      releaseCommitShaOverride ?? version.releaseCommitSha ?? '',
                    ).trim();
                    if (ci.status === 'PASSED' && !ci.commitSha?.trim()) {
                      blockers.push({
                        code: 'CI_COMMIT_MISSING',
                        message:
                          'Passed CI evidence has no commit SHA for the release binding',
                      });
                    } else if (
                      ci.status === 'PASSED' &&
                      releaseCommitSha &&
                      ci.commitSha !== releaseCommitSha
                    ) {
                      blockers.push({
                        code: 'CI_COMMIT_MISMATCH',
                        message: `CI commit ${ci.commitSha} does not match release commit ${releaseCommitSha}`,
                      });
                    }
                  } catch (err) {
                    blockers.push({
                      code: 'CI_STATUS_UNAVAILABLE',
                      message: `Unable to verify CI Quality Gate status: ${
                        err instanceof Error ? err.message : String(err)
                      }`,
                    });
                  }
                }
              }
            } catch (err) {
              blockers.push({
                code: 'CATALOG_MANIFEST_PIN_UNAVAILABLE',
                message: `Unable to verify Catalog manifest pins: ${
                  err instanceof Error ? err.message : String(err)
                }`,
              });
            }
          }
        }
      }
    }

    return { passed: blockers.length === 0, blockers };
  }

  async createProductBaseline(
    productVersionId: string,
    request: CreateProductBaselineRequest,
    actor: string,
    credentials?: unknown,
  ): Promise<ProductBaseline> {
    const version = await this.repository.getProductVersion(productVersionId);
    if (!version) {
      throw new Error(`Product version ${productVersionId} not found`);
    }

    const ursBaselineId = resolveUrsBaselineId(request) || version.ursBaselineId;
    if (!ursBaselineId) {
      await this.audit(
        'PRODUCT_BASELINE',
        productVersionId,
        'URS_BASELINE_LINK_REJECTED',
        actor,
        {
          newValue: 'missing ursBaselineId',
        },
      );
      throw new Error(
        'ursBaselineId is required: controlled product baselines must reference exactly one APPROVED URS baseline',
      );
    }

    if (
      version.ursBaselineId &&
      version.ursBaselineId.trim() !== ursBaselineId.trim()
    ) {
      throw new Error(
        `ProductBaseline ursBaselineId must match ProductVersion pin (${version.ursBaselineId})`,
      );
    }

    if (!this.ursBaselineResolver) {
      await this.audit(
        'PRODUCT_BASELINE',
        productVersionId,
        'URS_BASELINE_LINK_REJECTED',
        actor,
        { newValue: `resolver missing for ${ursBaselineId}` },
      );
      throw new Error(
        'URS baseline resolver is not configured; cannot create a controlled product baseline',
      );
    }

    let ursRef: UrsBaselineReference;
    try {
      ursRef = await this.ursBaselineResolver.resolveApprovedBaseline(
        ursBaselineId,
        credentials,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.audit(
        'PRODUCT_BASELINE',
        productVersionId,
        'URS_BASELINE_LINK_REJECTED',
        actor,
        { newValue: `${ursBaselineId}: ${message}` },
      );
      throw new Error(
        `URS baseline ${ursBaselineId} is not valid for product baseline creation: ${message}`,
      );
    }

    const existing = await this.repository.listProductBaselines(productVersionId);
    for (const prev of existing) {
      if (prev.status === 'APPROVED') {
        const superseded: ProductBaseline = {
          ...prev,
          status: 'SUPERSEDED',
          supersededBy: 'pending',
        };
        await this.repository.updateProductBaseline(superseded);
      }
    }
    const components = await this.repository.listProductComponents(productVersionId);
    const contracts: DataContract[] = [];
    for (const comp of components) {
      contracts.push(...(await this.repository.listDataContracts(comp.id)));
    }
    const links = (await this.repository.listTraceabilityLinks()).filter(
      l =>
        components.some(c => c.id === l.sourceId) ||
        components.some(c => c.id === l.targetId),
    );
    const snapshot = {
      version: { id: version.id, version: version.version },
      components: components.map(c => ({
        id: c.id,
        name: c.name,
        componentType: c.componentType,
      })),
      contracts: contracts.map(c => ({
        id: c.id,
        schemaType: c.schemaType,
        version: c.version,
      })),
      traceabilityLinks: links.map(l => ({
        id: l.id,
        sourceId: l.sourceId,
        targetType: l.targetType,
        targetId: l.targetId,
        relationshipType: l.relationshipType,
      })),
      ursBaseline: {
        id: ursRef.id,
        status: ursRef.status,
        baselineVersion: ursRef.baselineVersion,
      },
    };
    const baselineVersion =
      request.baselineVersion ?? `${existing.length + 1}.0`;
    const baseline: ProductBaseline = {
      id: randomUUID(),
      productVersionId,
      baselineVersion,
      status: 'DRAFT',
      snapshot,
      ursBaselineId: ursRef.id,
      requirementSetId:
        ursRef.requirementSetId?.trim() || version.requirementSetId,
      ursVersion: ursRef.baselineVersion || version.ursVersion,
      ursContentHash:
        (ursRef.contentHash || version.ursContentHash).toLowerCase(),
      ursBaselineIds: [ursRef.id],
      createdBy: actor,
      createdAt: new Date(),
      revision: 1,
    };
    await this.repository.createProductBaseline(baseline);

    const product = await this.repository.getProduct(version.productId);
    const document = buildProductManifest({
      productId: version.productId,
      productVersion: version.version,
      productVersionId: version.id,
      productBaselineId: baseline.id,
      ursBaselineId: ursRef.id,
      requirementSetId: baseline.requirementSetId,
      ursVersion: baseline.ursVersion,
      ursContentHash: baseline.ursContentHash,
      components,
      contracts,
      policies: [],
      qualityGates: [
        {
          id: 'release-gate',
          type: 'PRODUCT_RELEASE_GATE',
          description:
            'Technical release gate requiring approved product baseline and APPROVED URS baseline',
        },
      ],
    });
    const persisted: PersistedProductManifest = {
      id: randomUUID(),
      productId: version.productId,
      productVersionId: version.id,
      productBaselineId: baseline.id,
      ursBaselineId: ursRef.id,
      manifestVersion: document.metadata.manifestVersion,
      contentHash: document.metadata.contentHash,
      document,
      createdBy: actor,
      createdAt: new Date(),
      revision: 1,
    };
    await this.repository.createProductManifest(persisted);

    await this.audit('PRODUCT_BASELINE', baseline.id, 'BASELINE_CREATED', actor, {
      newValue: JSON.stringify({
        ursBaselineId: ursRef.id,
        manifestContentHash: document.metadata.contentHash,
        productName: product?.name,
      }),
    });
    await this.audit(
      'PRODUCT_MANIFEST',
      persisted.id,
      'MANIFEST_CREATED',
      actor,
      {
        newValue: document.metadata.contentHash,
      },
    );

    await this.maybeCreateUrsChangeImpact(version, baseline, actor, credentials);

    return baseline;
  }

  /**
   * When a successor ProductVersion pins a new APPROVED/BASELINED URS baseline
   * against a prior released version, open a Change Impact Assessment with
   * RETEST_REQUIRED for ADDED/MODIFIED/REMOVED requirements.
   * Draft-only URS changes never reach resolveApprovedBaseline here.
   */
  private async maybeCreateUrsChangeImpact(
    version: ProductVersion,
    baseline: ProductBaseline,
    actor: string,
    credentials?: unknown,
  ): Promise<ChangeImpactAssessment | null> {
    if (!version.parentVersionId || !this.ursBaselineResolver) {
      return null;
    }
    const parent = await this.repository.getProductVersion(version.parentVersionId);
    if (!parent?.ursBaselineId) {
      return null;
    }
    if (parent.ursBaselineId === baseline.ursBaselineId) {
      return null;
    }

    const toPins = async (baselineId: string): Promise<UrsRequirementPin[]> => {
      const ctx = await this.ursBaselineResolver!.resolveBaselineContext(
        baselineId,
        credentials,
      );
      return ctx.requirements.map(r => ({
        requirementId: r.id,
        versionId: r.versionId ?? r.id,
      }));
    };

    let previous: UrsRequirementPin[] = [];
    let current: UrsRequirementPin[] = [];
    try {
      previous = await toPins(parent.ursBaselineId);
      current = await toPins(baseline.ursBaselineId);
    } catch {
      previous = [];
      current = [];
    }

    const deltas = computeRequirementDeltas(previous, current);
    const assessment = buildChangeImpactAssessment({
      productId: version.productId,
      productVersionId: version.id,
      productBaselineId: baseline.id,
      previousUrsBaselineId: parent.ursBaselineId,
      ursBaselineId: baseline.ursBaselineId,
      requirementSetId: baseline.requirementSetId,
      deltas,
      actor,
      triggerRetest: true,
    });
    if (!assessment) {
      return null;
    }
    await this.repository.createChangeAssessment(assessment);
    await this.audit(
      'PRODUCT_VERSION',
      version.id,
      'URS_CHANGE_IMPACT_CREATED',
      actor,
      { newValue: assessment.id },
    );
    return assessment;
  }

  async getChangeImpactAssessment(
    productVersionId: string,
  ): Promise<ChangeImpactAssessment | null> {
    return this.repository.getOpenChangeAssessment(productVersionId);
  }

  async approveProductBaseline(
    baselineId: string,
    actor: string,
    credentials?: unknown,
  ): Promise<ProductBaseline> {
    const baseline = await this.repository.getProductBaseline(baselineId);
    if (!baseline) {
      throw new Error(`Product baseline ${baselineId} not found`);
    }
    if (baseline.status !== 'DRAFT') {
      throw new Error(`Cannot approve baseline in status ${baseline.status}`);
    }
    if (!baseline.ursBaselineId?.trim()) {
      throw new Error(
        'Cannot approve product baseline without ursBaselineId',
      );
    }
    if (!this.ursBaselineResolver) {
      throw new Error(
        'URS baseline resolver is not configured; cannot approve product baseline',
      );
    }
    try {
      await this.ursBaselineResolver.resolveApprovedBaseline(
        baseline.ursBaselineId,
        credentials,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.audit(
        'PRODUCT_BASELINE',
        baselineId,
        'URS_BASELINE_LINK_REJECTED',
        actor,
        { newValue: message },
      );
      throw new Error(
        `Cannot approve product baseline: URS baseline ${baseline.ursBaselineId} is not APPROVED (${message})`,
      );
    }

    const approved: ProductBaseline = {
      ...baseline,
      status: 'APPROVED',
      approvedBy: actor,
      approvedAt: new Date(),
    };
    await this.repository.updateProductBaseline(approved);

    const version = await this.repository.getProductVersion(
      baseline.productVersionId,
    );
    if (version) {
      await this.repository.updateProductVersion({
        ...version,
        baselineId: baseline.id,
      });
    }

    await this.audit('PRODUCT_BASELINE', baselineId, 'BASELINE_APPROVED', actor, {
      newValue: baseline.ursBaselineId,
    });
    return approved;
  }

  async getProductBaseline(id: string): Promise<ProductBaseline | null> {
    return this.repository.getProductBaseline(id);
  }

  async listProductBaselines(
    productVersionId: string,
  ): Promise<ProductBaseline[]> {
    return this.repository.listProductBaselines(productVersionId);
  }

  async getProductManifestForVersion(
    productVersionId: string,
  ): Promise<PersistedProductManifest | null> {
    return this.repository.getProductManifestByVersionId(productVersionId);
  }

  async getProductManifestForBaseline(
    productBaselineId: string,
  ): Promise<PersistedProductManifest | null> {
    return this.repository.getProductManifestByBaselineId(productBaselineId);
  }

  async listApprovedUrsBaselines(
    credentials?: unknown,
  ): Promise<UrsBaselineReference[]> {
    if (!this.ursBaselineResolver) {
      throw new Error('URS baseline resolver is not configured');
    }
    return this.ursBaselineResolver.listApprovedBaselines(credentials);
  }

  /** Pull-time advisory: current URS status for a pinned baseline id (any status). */
  async inspectUrsBaselinePin(
    ursBaselineId: string,
    credentials?: unknown,
  ): Promise<UrsBaselineReference> {
    if (!this.ursBaselineResolver) {
      throw new Error('URS baseline resolver is not configured');
    }
    const trimmed = ursBaselineId.trim();
    if (!trimmed) {
      throw new Error('ursBaselineId is required');
    }
    return this.ursBaselineResolver.inspectBaseline(trimmed, credentials);
  }

  /**
   * Builds Scaffolder pin values from the approved product baseline's
   * ProductManifest. Fail-closed if baseline/manifest/URS integrity fails.
   */
  async getScaffoldBinding(
    productVersionId: string,
    actor: string,
    credentials?: unknown,
  ): Promise<ProductScaffoldBinding> {
    const version = await this.repository.getProductVersion(productVersionId);
    if (!version) {
      throw new Error(`Product version ${productVersionId} not found`);
    }
    const product = await this.repository.getProduct(version.productId);
    if (!product) {
      throw new Error(`Product ${version.productId} not found`);
    }

    const baselines = await this.repository.listProductBaselines(
      productVersionId,
    );
    const approvedBaseline = baselines.find(b => b.status === 'APPROVED');
    if (!approvedBaseline) {
      throw new Error(
        'An APPROVED product baseline is required before scaffolding from ProductManifest',
      );
    }
    const ursBaselineId = approvedBaseline.ursBaselineId?.trim();
    if (!ursBaselineId) {
      throw new Error(
        'Approved product baseline has no ursBaselineId; cannot scaffold',
      );
    }
    if (!this.ursBaselineResolver) {
      throw new Error(
        'URS baseline resolver is not configured; cannot scaffold',
      );
    }
    await this.ursBaselineResolver.resolveApprovedBaseline(
      ursBaselineId,
      credentials,
    );

    const manifest = await this.repository.getProductManifestByBaselineId(
      approvedBaseline.id,
    );
    if (!manifest) {
      throw new Error(
        `No ProductManifest found for approved product baseline ${approvedBaseline.id}`,
      );
    }
    const integrityIssues = verifyPersistedManifestIntegrity({
      document: manifest.document,
      expectedContentHash: manifest.contentHash,
      expectedUrsBaselineId: ursBaselineId,
      expectedProductBaselineId: approvedBaseline.id,
    });
    if (integrityIssues.length > 0) {
      throw new Error(
        `ProductManifest integrity failed: ${integrityIssues
          .map(i => i.code)
          .join(', ')}`,
      );
    }

    let ursContext;
    try {
      ursContext = await this.ursBaselineResolver.resolveBaselineContext(
        ursBaselineId,
        credentials,
      );
    } catch {
      ursContext = {
        baselineId: ursBaselineId,
        baselineVersion: approvedBaseline.ursVersion || version.ursVersion,
        requirementSetId:
          approvedBaseline.requirementSetId || version.requirementSetId,
        businessCapabilities: [],
        requirements: [],
      };
    }

    const artifacts = buildDigitalThreadScaffoldArtifacts({
      version,
      baseline: approvedBaseline,
      manifest,
      ursContext,
    });

    const productSlug = slugifyProductName(product.name);
    if (!productSlug) {
      throw new Error('Product name cannot be converted to a repository slug');
    }

    const binding: ProductScaffoldBinding = {
      productId: product.id,
      productName: product.name,
      productSlug,
      description: product.description,
      domain: product.domain,
      owner: product.owner,
      productVersionId: version.id,
      productVersion: version.version,
      productBaselineId: approvedBaseline.id,
      ursBaselineId,
      requirementSetId:
        approvedBaseline.requirementSetId || version.requirementSetId,
      ursVersion: approvedBaseline.ursVersion || version.ursVersion,
      ursContentHash:
        approvedBaseline.ursContentHash || version.ursContentHash,
      manifestContentHash: manifest.contentHash,
      manifestVersion: manifest.manifestVersion,
      scaffolderPinValues: {
        productManifestContentHash: manifest.contentHash,
        ursBaselineId,
        productBaselineId: approvedBaseline.id,
        productVersionId: version.id,
        productId: product.id,
        requirementSetId:
          approvedBaseline.requirementSetId || version.requirementSetId,
        ursVersion: approvedBaseline.ursVersion || version.ursVersion,
        ursContentHash:
          approvedBaseline.ursContentHash || version.ursContentHash,
        productManifestYaml: artifacts.productManifestYaml,
        ursBaselineJson: artifacts.ursBaselineJson,
        ursBaselineMd: artifacts.ursBaselineMd,
        traceabilityMatrixYaml: artifacts.traceabilityMatrixYaml,
        agentsMd: artifacts.agentsMd,
      },
      supportedTemplateRefs: [...OFFICIAL_GOLDEN_PATH_TEMPLATE_REFS],
    };

    await this.audit(
      'PRODUCT_VERSION',
      productVersionId,
      'SCAFFOLD_BINDING_ISSUED',
      actor,
      {
        newValue: JSON.stringify({
          productBaselineId: approvedBaseline.id,
          ursBaselineId,
          manifestContentHash: manifest.contentHash,
          digitalThreadManifestFileHash: artifacts.manifestFileHash,
        }),
      },
    );

    return binding;
  }

  async computeProductBaselineDelta(
    baselineId: string,
    actor: string,
  ): Promise<ProductBaselineDelta> {
    const baseline = await this.repository.getProductBaseline(baselineId);
    if (!baseline) {
      throw new Error(`Product baseline ${baselineId} not found`);
    }

    const allBaselines = await this.repository.listProductBaselines(
      baseline.productVersionId,
    );
    const sorted = allBaselines
      .slice()
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const idx = sorted.findIndex(b => b.id === baseline.id);
    const previousBaseline = idx > 0 ? sorted[idx - 1] : undefined;

    const currentSnapshot = (baseline.snapshot ?? {}) as Record<string, unknown[]>;
    const previousSnapshot = (previousBaseline?.snapshot ?? {}) as Record<string, unknown[]>;

    const changes: SnapshotItemChange[] = [
      ...this.diffSnapshotItems(
        (previousSnapshot.components ?? []) as Record<string, unknown>[],
        (currentSnapshot.components ?? []) as Record<string, unknown>[],
        'component',
      ),
      ...this.diffSnapshotItems(
        (previousSnapshot.contracts ?? []) as Record<string, unknown>[],
        (currentSnapshot.contracts ?? []) as Record<string, unknown>[],
        'contract',
      ),
      ...this.diffSnapshotItems(
        (previousSnapshot.traceabilityLinks ?? []) as Record<string, unknown>[],
        (currentSnapshot.traceabilityLinks ?? []) as Record<string, unknown>[],
        'traceabilityLink',
      ),
    ];

    return {
      id: randomUUID(),
      baselineId: baseline.id,
      previousBaselineId: previousBaseline?.id,
      baselineVersion: baseline.baselineVersion,
      previousBaselineVersion: previousBaseline?.baselineVersion,
      changes,
      summary: {
        added: changes.filter(c => c.changeType === 'ADDED').length,
        modified: changes.filter(c => c.changeType === 'MODIFIED').length,
        removed: changes.filter(c => c.changeType === 'REMOVED').length,
        unchanged: changes.filter(c => c.changeType === 'UNCHANGED').length,
      },
      computedAt: new Date(),
      computedBy: actor,
    };
  }

  private diffSnapshotItems(
    previous: Record<string, unknown>[],
    current: Record<string, unknown>[],
    itemType: SnapshotItemChange['itemType'],
  ): SnapshotItemChange[] {
    const prevMap = new Map<string, Record<string, unknown>>();
    const currMap = new Map<string, Record<string, unknown>>();

    for (const item of previous) {
      if (item.id) prevMap.set(String(item.id), item);
    }
    for (const item of current) {
      if (item.id) currMap.set(String(item.id), item);
    }

    const allIds = new Set([...prevMap.keys(), ...currMap.keys()]);
    const changes: SnapshotItemChange[] = [];

    for (const id of allIds) {
      const prev = prevMap.get(id);
      const curr = currMap.get(id);

      if (curr && !prev) {
        changes.push({ itemId: id, itemType, changeType: 'ADDED', current: curr });
      } else if (!curr && prev) {
        changes.push({ itemId: id, itemType, changeType: 'REMOVED', previous: prev });
      } else if (curr && prev) {
        const changedFields = Object.keys(curr).filter(
          key => JSON.stringify(curr[key]) !== JSON.stringify(prev[key]),
        );
        if (changedFields.length > 0) {
          changes.push({
            itemId: id,
            itemType,
            changeType: 'MODIFIED',
            previous: prev,
            current: curr,
            changedFields,
          });
        } else {
          changes.push({ itemId: id, itemType, changeType: 'UNCHANGED', previous: prev, current: curr });
        }
      }
    }

    return changes;
  }

  async getEntityAuditTrail(
    entityType: string,
    entityId: string,
  ): Promise<ComposerAuditEvent[]> {
    return this.repository.getEntityAuditTrail(entityType, entityId);
  }

  async getProductTraceability(productId: string): Promise<{
    productId: string;
    componentCount: number;
    coveredComponentCount: number;
    coverage: number;
    links: TraceabilityLink[];
  }> {
    const versions = await this.repository.listProductVersions(productId);
    const components: ProductComponent[] = [];
    for (const version of versions) {
      components.push(
        ...(await this.repository.listProductComponents(version.id)),
      );
    }
    const componentIds = new Set(components.map(c => c.id));
    const allLinks = await this.repository.listTraceabilityLinks();
    const links = allLinks.filter(
      link =>
        componentIds.has(link.targetId) || componentIds.has(link.sourceId),
    );
    const covered = new Set(
      links.map(link => link.targetId).filter(id => componentIds.has(id)),
    );
    return {
      productId,
      componentCount: components.length,
      coveredComponentCount: covered.size,
      coverage: components.length === 0 ? 0 : covered.size / components.length,
      links,
    };
  }

  async suggestComponents(
    productName: string,
    description: string,
    domain: string,
    existingSelections: string[],
    availableComponents: AvailableComponentSummary[],
    actor: string,
  ) {
    if (!this.llmClient) {
      throw new Error('AI suggestions are not enabled');
    }

    const context = {
      productName,
      description,
      domain,
      existingSelections,
      availableComponents,
    };

    const systemPrompt = buildSystemPrompt();
    const suggestions = await this.llmClient.suggestComponents(
      context,
      systemPrompt,
    );

    await this.audit('composition', 'ai-suggestion', 'AI_SUGGEST_COMPONENTS', actor, {
      newValue: JSON.stringify({ productName, suggestionCount: suggestions.length }),
    });

    return suggestions;
  }

  async generateProductSpec(
    ursBaselineId: string,
    actor: string,
    credentials: unknown,
  ): Promise<AISpecDraft> {
    if (!this.llmClient) {
      throw new Error('AI product spec generation is not enabled');
    }
    if (!this.ursBaselineResolver) {
      throw new Error('URS baseline resolver is not configured');
    }

    const ctx = await this.ursBaselineResolver.resolveBaselineContext(
      ursBaselineId,
      credentials,
    );

    const catalogComponents = await this.loadCatalogComponents();

    const promptContext: ProductSpecContext = {
      businessNeed: ctx.businessNeed ?? ctx.solutionName ?? 'Unknown',
      solutionType: ctx.solutionType ?? 'data-product',
      solutionName: ctx.solutionName ?? 'Unnamed Solution',
      requirements: ctx.requirements,
      businessCapabilities: ctx.businessCapabilities,
      availableComponents: catalogComponents,
    };

    const result = await this.llmClient.generateProductSpec(promptContext);

    const draft: AISpecDraft = {
      id: randomUUID(),
      ursBaselineId,
      status: 'PENDING_REVIEW',
      productName: result.productName,
      description: result.description,
      domain: result.domain,
      suggestedComponents: result.components,
      suggestedContracts: result.contracts,
      generatedBy: actor,
      generatedAt: new Date().toISOString(),
    };

    this.specDrafts.set(draft.id, draft);

    await this.audit('AI_SPEC_DRAFT', draft.id, 'AI_PRODUCT_SPEC_GENERATED', actor, {
      newValue: JSON.stringify({
        ursBaselineId,
        productName: draft.productName,
        componentCount: draft.suggestedComponents.length,
        contractCount: draft.suggestedContracts.length,
      }),
    });

    return draft;
  }

  getSpecDraft(id: string): AISpecDraft | undefined {
    return this.specDrafts.get(id);
  }

  async applySpecDraft(
    draftId: string,
    actor: string,
  ): Promise<Product> {
    const draft = this.specDrafts.get(draftId);
    if (!draft) {
      throw new Error(`AI spec draft ${draftId} not found`);
    }
    if (draft.status !== 'PENDING_REVIEW') {
      throw new Error(`Cannot apply draft in status ${draft.status}`);
    }

    const product = await this.createProduct(
      {
        name: draft.productName,
        description: draft.description,
        productType: 'data-product',
        domain: draft.domain,
      },
      actor,
    );

    if (!this.ursBaselineResolver) {
      throw new Error(
        'URS baseline resolver is required to apply an AI spec draft to a controlled product',
      );
    }
    const ursRef = await this.ursBaselineResolver.resolveApprovedBaseline(
      draft.ursBaselineId,
      undefined,
    );
    if (!ursRef.contentHash || !ursRef.requirementSetId) {
      throw new Error(
        'Resolved URS baseline is missing requirementSetId or contentHash',
      );
    }

    const version = await this.createProductVersion(
      product.id,
      {
        changelog: `Generated from URS baseline ${draft.ursBaselineId} via AI spec draft ${draftId}`,
        requirementSetId: ursRef.requirementSetId,
        ursBaselineId: ursRef.id,
        ursVersion: ursRef.baselineVersion || '1.0',
        ursContentHash: ursRef.contentHash,
      },
      actor,
    );

    for (const comp of draft.suggestedComponents) {
      await this.addProductComponent(
        version.id,
        {
          componentType: 'service',
          name: comp.name,
          description: comp.reason,
        },
        actor,
      );
    }

    draft.status = 'APPLIED';
    draft.appliedBy = actor;
    draft.appliedAt = new Date().toISOString();

    await this.audit('AI_SPEC_DRAFT', draftId, 'AI_SPEC_APPLIED', actor, {
      newValue: JSON.stringify({ productId: product.id, versionId: version.id }),
    });

    return product;
  }

  async rejectSpecDraft(
    draftId: string,
    actor: string,
  ): Promise<void> {
    const draft = this.specDrafts.get(draftId);
    if (!draft) {
      throw new Error(`AI spec draft ${draftId} not found`);
    }
    if (draft.status !== 'PENDING_REVIEW') {
      throw new Error(`Cannot reject draft in status ${draft.status}`);
    }

    draft.status = 'REJECTED';

    await this.audit('AI_SPEC_DRAFT', draftId, 'AI_SPEC_REJECTED', actor);
  }

  private async loadCatalogComponents(): Promise<AvailableComponentSummary[]> {
    // Placeholder — returns empty list when catalog is unavailable.
    // In production, this would call the Backstage Catalog API to fetch
    // platform component entities. The suggestComponents method already
    // receives components from the frontend, so this is a fallback for
    // the AI spec generation path where components aren't passed in.
    return [];
  }

  private async audit(
    entityType: string,
    entityId: string,
    eventType: string,
    actor: string,
    options?: { oldValue?: string; newValue?: string },
  ): Promise<void> {
    this.logger.info(
      `[composer] ${eventType} ${entityType}:${entityId} by ${actor}`,
    );
    const event: ComposerAuditEvent = {
      id: randomUUID(),
      entityType,
      entityId,
      eventType,
      actor,
      timestamp: new Date(),
      oldValue: options?.oldValue,
      newValue: options?.newValue,
    };
    await this.repository.createAuditEvent(event);
  }
}
