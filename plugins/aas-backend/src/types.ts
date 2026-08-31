export type AasProtocol = 'MQTT' | 'REST' | 'OPC_UA' | 'FILE_STREAM' | 'KAFKA';

export interface SemanticId {
  type: 'ExternalReference' | 'ModelReference';
  keys: Array<{ type: string; value: string }>;
}

export interface ConnectivityMapping {
  protocol: AasProtocol;
  topic?: string | null;
  endpoint?: string | null;
  contract?: string | null;
  contractVersion?: string | null;
}

export interface PropertyDefinition {
  id: string;
  idShort: string;
  name: string;
  description?: string | null;
  semanticId?: SemanticId | null;
  dataType: 'number' | 'integer' | 'string' | 'boolean';
  unit?: string | null;
  minValue?: number | null;
  maxValue?: number | null;
  connectivity?: ConnectivityMapping | null;
}

export interface AssetRelationship {
  id: string;
  idShort: string;
  semanticId: string;
  firstAssetId: string;
  secondAssetId: string;
}

export interface AssetAdministrationShell {
  id: string;
  idShort: string;
  displayName: string;
  description?: string | null;
  revision: number;
  active: boolean;
  assetInformation: {
    assetKind: 'Type' | 'Instance';
    globalAssetId?: string | null;
    assetType?: string | null;
    specificAssetIds: Array<{ name: string; value: string }>;
  };
  context: {
    site?: string | null;
    area?: string | null;
    line?: string | null;
  };
  submodels: Array<{
    id: string;
    idShort: string;
    semanticId?: SemanticId | null;
    submodelElements: unknown[];
  }>;
  properties: PropertyDefinition[];
  relationships: AssetRelationship[];
}

export interface AuditRecord {
  id: number;
  at: string;
  actor: string;
  action: string;
  assetId?: string | null;
  detail?: string | null;
}

export interface AssetCreate {
  id: string;
  displayName: string;
  description?: string;
  globalAssetId?: string;
  assetType?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  site?: string;
  area?: string;
  line?: string;
}

export interface ResolvedProperty {
  assetId: string;
  propertyId: string;
  semanticId?: string | null;
  dataType: string;
  unit?: string | null;
  connectivity?: ConnectivityMapping | null;
}
