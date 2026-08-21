import fs from 'fs';
import path from 'path';
import {
  AssetAdministrationShell,
  AssetCreate,
  AuditRecord,
  PropertyDefinition,
  ResolvedProperty,
} from './types';

const DEFAULT_SUBMODELS = [
  'Identification',
  'TechnicalData',
  'OperationalDataDefinition',
  'Sensors',
  'Connectivity',
];

export class AasConflictError extends Error {}
export class AasNotFoundError extends Error {}
export class AasValidationError extends Error {}

type Store = {
  assets: Map<string, AssetAdministrationShell>;
  audit: AuditRecord[];
};

export class MemoryAasRepository {
  private readonly store: Store = { assets: new Map(), audit: [] };
  private auditId = 1;

  constructor(private readonly seedPath: string) {}

  seed(): void {
    const filler = JSON.parse(
      fs.readFileSync(this.seedPath, 'utf8'),
    ) as AssetAdministrationShell;
    const parents: AssetCreate[] = [
      { id: 'basel', displayName: 'Basel', assetType: 'Site' },
      {
        id: 'packaging',
        displayName: 'Packaging',
        assetType: 'Area',
        site: 'basel',
      },
      {
        id: 'line-01',
        displayName: 'Line 01',
        assetType: 'Line',
        site: 'basel',
        area: 'packaging',
      },
    ];
    for (const parent of parents) {
      if (!this.store.assets.has(parent.id)) {
        this.createAsset(parent, 'system', false);
      }
    }
    if (!this.store.assets.has(filler.id)) {
      this.store.assets.set(filler.id, filler);
      this.record('system', 'asset.seeded', filler.id, filler.displayName);
    }
  }

  listAssets(): AssetAdministrationShell[] {
    return [...this.store.assets.values()].filter(item => item.active);
  }

  getAsset(assetId: string): AssetAdministrationShell {
    const asset = this.store.assets.get(assetId);
    if (!asset) {
      throw new AasNotFoundError(`Asset ${assetId} was not found`);
    }
    return asset;
  }

  createAsset(payload: AssetCreate, actor: string, audit = true): AssetAdministrationShell {
    if (!payload.id?.trim() || !payload.displayName?.trim()) {
      throw new AasValidationError('id and displayName are required');
    }
    if (this.store.assets.has(payload.id)) {
      throw new AasConflictError(`Asset ${payload.id} already exists`);
    }
    const specifics = [
      payload.manufacturer && { name: 'manufacturer', value: payload.manufacturer },
      payload.model && { name: 'model', value: payload.model },
      payload.serialNumber && { name: 'serialNumber', value: payload.serialNumber },
    ].filter(Boolean) as Array<{ name: string; value: string }>;
    const shell: AssetAdministrationShell = {
      id: payload.id,
      idShort: payload.id.replace(/-/g, ''),
      displayName: payload.displayName,
      description: payload.description,
      revision: 1,
      active: true,
      assetInformation: {
        assetKind: 'Instance',
        globalAssetId: payload.globalAssetId || `urn:pdf:asset:${payload.id}`,
        assetType: payload.assetType,
        specificAssetIds: specifics,
      },
      context: {
        site: payload.site,
        area: payload.area,
        line: payload.line,
      },
      submodels: DEFAULT_SUBMODELS.map(idShort => ({
        id: `urn:pdf:submodel:${payload.id}:${idShort.toLowerCase()}`,
        idShort,
        semanticId: null,
        submodelElements: [],
      })),
      properties: [],
      relationships: [],
    };
    this.store.assets.set(shell.id, shell);
    if (audit) {
      this.record(actor, 'asset.created', shell.id, shell.displayName);
    }
    return shell;
  }

  updateAsset(
    assetId: string,
    payload: Partial<AssetCreate> & { active?: boolean; description?: string },
    actor: string,
  ): AssetAdministrationShell {
    const current = this.getAsset(assetId);
    const specifics = [...current.assetInformation.specificAssetIds];
    const upsert = (name: string, value?: string) => {
      if (value === undefined) {
        return;
      }
      const next = specifics.filter(item => item.name !== name);
      if (value) {
        next.push({ name, value });
      }
      specifics.splice(0, specifics.length, ...next);
    };
    upsert('manufacturer', payload.manufacturer);
    upsert('model', payload.model);
    upsert('serialNumber', payload.serialNumber);
    const updated: AssetAdministrationShell = {
      ...current,
      displayName: payload.displayName || current.displayName,
      description:
        payload.description !== undefined ? payload.description : current.description,
      revision: current.revision + 1,
      active: payload.active ?? current.active,
      assetInformation: {
        ...current.assetInformation,
        globalAssetId: payload.globalAssetId || current.assetInformation.globalAssetId,
        assetType:
          payload.assetType !== undefined
            ? payload.assetType
            : current.assetInformation.assetType,
        specificAssetIds: specifics,
      },
      context: {
        site: payload.site !== undefined ? payload.site : current.context.site,
        area: payload.area !== undefined ? payload.area : current.context.area,
        line: payload.line !== undefined ? payload.line : current.context.line,
      },
    };
    this.store.assets.set(assetId, updated);
    this.record(actor, payload.active === false ? 'asset.deactivated' : 'asset.updated', assetId);
    return updated;
  }

  addProperty(assetId: string, prop: PropertyDefinition, actor: string): PropertyDefinition {
    const asset = this.getAsset(assetId);
    if (asset.properties.some(item => item.id === prop.id)) {
      throw new AasConflictError(`Property ${prop.id} already exists on ${assetId}`);
    }
    const blob = JSON.stringify(prop.connectivity ?? {});
    if (/password|token|secret|apikey|begin /i.test(blob)) {
      throw new AasValidationError('Connectivity metadata must not contain secrets');
    }
    const updated = {
      ...asset,
      revision: asset.revision + 1,
      properties: [...asset.properties, prop],
    };
    this.store.assets.set(assetId, updated);
    this.record(actor, 'property.added', assetId, prop.id);
    if (prop.connectivity) {
      this.record(actor, 'endpoint.changed', assetId, prop.id);
    }
    return prop;
  }

  getProperty(assetId: string, propertyId: string): PropertyDefinition {
    const prop = this.getAsset(assetId).properties.find(item => item.id === propertyId);
    if (!prop) {
      throw new AasNotFoundError(`Property ${propertyId} was not found on ${assetId}`);
    }
    return prop;
  }

  resolveProperty(assetId: string, propertyId: string): ResolvedProperty {
    const prop = this.getProperty(assetId, propertyId);
    return {
      assetId,
      propertyId: prop.id,
      semanticId: prop.semanticId?.keys[0]?.value,
      dataType: prop.dataType,
      unit: prop.unit,
      connectivity: prop.connectivity,
    };
  }

  listAudit(assetId?: string): AuditRecord[] {
    return this.store.audit.filter(item => !assetId || item.assetId === assetId);
  }

  private record(actor: string, action: string, assetId?: string, detail?: string) {
    this.store.audit.push({
      id: this.auditId,
      at: new Date().toISOString(),
      actor,
      action,
      assetId,
      detail,
    });
    this.auditId += 1;
  }
}

export function defaultSeedPath(): string {
  const relative = 'platform-components/asset-semantic/aas-foundation/src/pdf_aas/data/filler-01.json';
  const candidates = [
    path.resolve(process.cwd(), relative),
    path.resolve(process.cwd(), '..', relative),
    path.resolve(process.cwd(), '../..', relative),
    path.resolve(__dirname, '../../../../', relative),
    path.resolve(__dirname, '../../../../../', relative),
  ];
  const match = candidates.find(item => fs.existsSync(item));
  if (!match) {
    throw new Error('AAS seed file filler-01.json was not found');
  }
  return match;
}
