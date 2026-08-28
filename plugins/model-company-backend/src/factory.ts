import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import type {
  FactoryArea,
  FactoryEquipment,
  FactoryLine,
  FactoryModel,
  FactorySite,
  UnsFactoryConfig,
} from './types';
import { AREA_SLUG_DEFAULTS, DEFAULT_UNS_ROOT } from './uns/topics';

interface RawFactoryYaml {
  company: FactoryModel['company'];
  uns?: Partial<UnsFactoryConfig>;
  sites: Array<{
    id: string;
    name: string;
    displayName?: string;
    areas: Array<{
      id: string;
      name: string;
      lines: Array<{
        id: string;
        name: string;
        equipment: Array<{
          id: string;
          type: string;
          capabilities?: string[];
        }>;
      }>;
    }>;
  }>;
  dataProducts?: FactoryModel['dataProducts'];
  mqtt?: FactoryModel['mqtt'];
}

export function resolveFactoryPath(configured?: string): string {
  const relative =
    configured ?? 'model-company/factories/model-pharma.yaml';
  if (path.isAbsolute(relative)) {
    return relative;
  }

  // Backend package start uses cwd=packages/backend; yarn start from repo root
  // uses cwd=repo root. Prefer the first existing candidate.
  let dir = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    const candidate = path.resolve(dir, relative);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return path.resolve(process.cwd(), relative);
}

export function loadFactoryModel(factoryPath: string): FactoryModel {
  const rawText = fs.readFileSync(factoryPath, 'utf8');
  const raw = yaml.parse(rawText) as RawFactoryYaml;
  if (!raw?.company?.id || !Array.isArray(raw.sites) || raw.sites.length === 0) {
    throw new Error(`Invalid factory model at ${factoryPath}`);
  }

  const lines: FactoryLine[] = [];
  const equipment: FactoryEquipment[] = [];

  const sites: FactorySite[] = raw.sites.map(site => {
    const areas: FactoryArea[] = (site.areas ?? []).map(area => {
      const areaLines: FactoryLine[] = (area.lines ?? []).map(line => {
        const lineEquipment: FactoryEquipment[] = (line.equipment ?? []).map(eq => {
          const item: FactoryEquipment = {
            id: eq.id,
            type: eq.type,
            capabilities: eq.capabilities ?? [],
            lineId: line.id,
            areaId: area.id,
            siteId: site.id,
          };
          equipment.push(item);
          return item;
        });
        const factoryLine: FactoryLine = {
          id: line.id,
          name: line.name,
          areaId: area.id,
          siteId: site.id,
          equipment: lineEquipment,
        };
        lines.push(factoryLine);
        return factoryLine;
      });
      return {
        id: area.id,
        name: area.name,
        siteId: site.id,
        lines: areaLines,
      };
    });
    return {
      id: site.id,
      name: site.name,
      displayName: site.displayName ?? site.name,
      areas,
    };
  });

  const uns: UnsFactoryConfig = {
    root: raw.uns?.root ?? DEFAULT_UNS_ROOT,
    enterpriseId: raw.uns?.enterpriseId ?? raw.company.id,
    sourceSystem: raw.uns?.sourceSystem ?? 'model-factory',
    areaSlugs: { ...AREA_SLUG_DEFAULTS, ...(raw.uns?.areaSlugs ?? {}) },
  };

  return {
    company: raw.company,
    uns,
    sites,
    dataProducts: raw.dataProducts ?? [],
    mqtt: raw.mqtt ?? {
      topicPrefix: uns.root,
      patterns: {},
    },
    lines,
    equipment,
  };
}

export function validateFactoryModel(model: FactoryModel): string[] {
  const errors: string[] = [];
  if (model.lines.length < 1) {
    errors.push(`Expected at least 1 line, found ${model.lines.length}`);
  }
  if (model.equipment.length < 1) {
    errors.push(`Expected at least 1 equipment, found ${model.equipment.length}`);
  }
  if (!model.uns?.root) {
    errors.push('UNS root missing');
  }
  const ids = new Set<string>();
  for (const eq of model.equipment) {
    if (ids.has(eq.id)) {
      errors.push(`Duplicate equipment id ${eq.id}`);
    }
    ids.add(eq.id);
  }
  return errors;
}
