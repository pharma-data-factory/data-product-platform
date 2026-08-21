/**
 * In-memory Marketplace organization-link table.
 *
 * Seeded from server-side config. Admin approve/disable mutates the store.
 * Organization ids are never taken from untrusted Marketplace POSTs.
 * This is not multi-tenancy: links may only target the configured organization.
 */

import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { resolveOrganizationId } from '@internal/platform-common';
import {
  linkHasIdentity,
  type MarketplaceOrganizationLink,
} from './organizationMapping';

export const MARKETPLACE_LINK_STATUSES = [
  'PENDING',
  'APPROVED',
  'DISABLED',
  'CONFLICT',
] as const;

export type MarketplaceLinkStatus = (typeof MARKETPLACE_LINK_STATUSES)[number];

export interface StoredMarketplaceLink {
  id: string;
  organizationId?: string;
  awsAccountId?: string;
  licenseArn?: string;
  productCode?: string;
  createdAt: string;
  updatedAt: string;
  status: MarketplaceLinkStatus;
}

export interface MarketplaceLinkView {
  id: string;
  organizationId?: string;
  awsAccountId?: string;
  licenseArn?: string;
  productCode?: string;
  createdAt: string;
  updatedAt: string;
  status: MarketplaceLinkStatus;
}

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  return `link-${randomBytes(8).toString('hex')}`;
}

export function redactAwsAccount(accountId?: string): string | undefined {
  if (!accountId) {
    return undefined;
  }
  if (accountId.length < 4) {
    return '****';
  }
  return `****${accountId.slice(-4)}`;
}

export function toPublicLinkView(link: StoredMarketplaceLink): MarketplaceLinkView {
  return {
    ...link,
    awsAccountId: redactAwsAccount(link.awsAccountId),
  };
}

export function toIdentityLink(
  link: StoredMarketplaceLink,
): MarketplaceOrganizationLink {
  return {
    organizationId: link.organizationId ?? '',
    customerAwsAccountId: link.awsAccountId,
    licenseArn: link.licenseArn,
    productCode: link.productCode,
  };
}

export class MarketplaceLinkStore {
  private readonly links = new Map<string, StoredMarketplaceLink>();

  constructor(
    private readonly allowedOrganizationId: string,
    seed: readonly MarketplaceOrganizationLink[] = [],
    private readonly filePath?: string,
  ) {
    for (const item of seed) {
      if (!linkHasIdentity(item)) {
        continue;
      }
      const at = nowIso();
      const stored: StoredMarketplaceLink = {
        id: newId(),
        organizationId: resolveOrganizationId(item.organizationId),
        awsAccountId: item.customerAwsAccountId,
        licenseArn: item.licenseArn,
        productCode: item.productCode,
        createdAt: at,
        updatedAt: at,
        status: 'APPROVED',
      };
      this.links.set(stored.id, stored);
    }
    this.loadFromDisk();
  }

  private loadFromDisk() {
    if (!this.filePath || !existsSync(this.filePath)) {
      return;
    }
    const parsed = JSON.parse(readFileSync(this.filePath, 'utf8')) as StoredMarketplaceLink[];
    for (const row of parsed) {
      this.links.set(row.id, row);
    }
  }

  private persist() {
    if (!this.filePath) {
      return;
    }
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, `${JSON.stringify(this.list(), null, 2)}\n`);
  }

  list(): readonly StoredMarketplaceLink[] {
    return [...this.links.values()];
  }

  publicList(): readonly MarketplaceLinkView[] {
    return this.list().map(toPublicLinkView);
  }

  get(id: string): StoredMarketplaceLink | undefined {
    return this.links.get(id);
  }

  approvedForOrganization(
    organizationId: string,
  ): readonly StoredMarketplaceLink[] {
    return this.list().filter(
      link =>
        link.status === 'APPROVED' &&
        link.organizationId === organizationId &&
        linkHasIdentity(toIdentityLink(link)),
    );
  }

  findMatching(input: {
    awsAccountId?: string;
    licenseArn?: string;
    productCode?: string;
  }): StoredMarketplaceLink[] {
    const account = input.awsAccountId?.trim();
    const licenseArn = input.licenseArn?.trim();
    return this.list().filter(link => {
      const productMatch =
        !input.productCode ||
        !link.productCode ||
        link.productCode === input.productCode;
      if (!productMatch) {
        return false;
      }
      const accountMatch = Boolean(account && link.awsAccountId === account);
      const licenseMatch = Boolean(licenseArn && link.licenseArn === licenseArn);
      return accountMatch || licenseMatch;
    });
  }

  recordPending(input: {
    awsAccountId?: string;
    licenseArn?: string;
    productCode?: string;
  }): StoredMarketplaceLink {
    const existing = this.findMatching(input).find(
      link => link.status === 'PENDING' || link.status === 'APPROVED',
    );
    if (existing) {
      return existing;
    }
    const at = nowIso();
    const stored: StoredMarketplaceLink = {
      id: newId(),
      awsAccountId: input.awsAccountId,
      licenseArn: input.licenseArn,
      productCode: input.productCode,
      createdAt: at,
      updatedAt: at,
      status: 'PENDING',
    };
    this.links.set(stored.id, stored);
    this.persist();
    return stored;
  }

  approve(
    id: string,
    requestedOrganizationId: string,
    actor: string,
  ):
    | { ok: true; link: StoredMarketplaceLink }
    | { ok: false; reason: 'NOT_FOUND' | 'DISABLED' | 'CONFLICT' | 'UNTRUSTED_ORG' } {
    void actor;
    const link = this.links.get(id);
    if (!link) {
      return { ok: false, reason: 'NOT_FOUND' };
    }
    if (link.status === 'DISABLED') {
      return { ok: false, reason: 'DISABLED' };
    }
    const organizationId = resolveOrganizationId(requestedOrganizationId);
    if (organizationId !== this.allowedOrganizationId) {
      return { ok: false, reason: 'UNTRUSTED_ORG' };
    }
    if (
      link.status === 'APPROVED' &&
      link.organizationId &&
      link.organizationId !== organizationId
    ) {
      link.status = 'CONFLICT';
      link.updatedAt = nowIso();
      this.persist();
      return { ok: false, reason: 'CONFLICT' };
    }
    const others = this.findMatching({
      awsAccountId: link.awsAccountId,
      licenseArn: link.licenseArn,
      productCode: link.productCode,
    }).filter(
      item =>
        item.id !== link.id &&
        item.status === 'APPROVED' &&
        item.organizationId &&
        item.organizationId !== organizationId,
    );
    if (others.length > 0) {
      link.status = 'CONFLICT';
      link.updatedAt = nowIso();
      this.persist();
      return { ok: false, reason: 'CONFLICT' };
    }
    link.organizationId = organizationId;
    link.status = 'APPROVED';
    link.updatedAt = nowIso();
    this.persist();
    return { ok: true, link };
  }

  disable(id: string, actor: string): StoredMarketplaceLink | undefined {
    void actor;
    const link = this.links.get(id);
    if (!link) {
      return undefined;
    }
    link.status = 'DISABLED';
    link.updatedAt = nowIso();
    this.persist();
    return link;
  }

  accessStateForOrganization(
    organizationId: string,
  ): 'ENTITLED' | 'NOT_ENTITLED' | 'PENDING_ACCESS' {
    const related = this.list().filter(
      link =>
        !link.organizationId || link.organizationId === organizationId,
    );
    if (related.some(link => link.status === 'APPROVED')) {
      return 'ENTITLED';
    }
    if (related.some(link => link.status === 'PENDING')) {
      return 'PENDING_ACCESS';
    }
    return 'NOT_ENTITLED';
  }
}
