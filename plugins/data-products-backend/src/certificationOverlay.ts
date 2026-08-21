import fs from 'fs';
import path from 'path';
import { parseEntityRef, stringifyEntityRef } from '@backstage/catalog-model';
import { Config } from '@backstage/config';

import { CERTIFICATION_STATUSES, CertificationStatus } from './certification';

export const CERTIFICATION_STATUS_ANNOTATION =
  'dataprod.platform/certification-status';

export interface CertificationOverride {
  status: CertificationStatus;
  updatedAt: string;
}

export interface CertificationOverlayDocument {
  version: 1;
  overrides: Record<string, CertificationOverride>;
}

export function normalizeEntityRef(entityRef: string): string {
  return stringifyEntityRef(parseEntityRef(entityRef));
}

export function certificationOverlayPath(
  config: Config,
  cwd = process.cwd(),
): string {
  const relative =
    config.getOptionalString('dataProducts.certification.overlayPath') ??
    'catalog/certification-overrides.json';
  return path.isAbsolute(relative) ? relative : path.join(cwd, relative);
}

export class FileCertificationOverlay {
  constructor(private readonly filePath: string) {}

  getStatus(entityRef: string): CertificationStatus | undefined {
    return this.read().overrides[normalizeEntityRef(entityRef)]?.status;
  }

  setStatus(entityRef: string, status: CertificationStatus): CertificationOverride {
    if (!CERTIFICATION_STATUSES.includes(status)) {
      throw new Error(`Unsupported certification status: ${status}`);
    }
    const document = this.read();
    const override: CertificationOverride = {
      status,
      updatedAt: new Date().toISOString(),
    };
    document.overrides[normalizeEntityRef(entityRef)] = override;
    this.write(document);
    return override;
  }

  private read(): CertificationOverlayDocument {
    if (!fs.existsSync(this.filePath)) {
      return { version: 1, overrides: {} };
    }
    try {
      const parsed = JSON.parse(
        fs.readFileSync(this.filePath, 'utf8'),
      ) as Partial<CertificationOverlayDocument>;
      return {
        version: 1,
        overrides:
          parsed.overrides && typeof parsed.overrides === 'object'
            ? parsed.overrides
            : {},
      };
    } catch {
      return { version: 1, overrides: {} };
    }
  }

  private write(document: CertificationOverlayDocument) {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
    fs.renameSync(tmp, this.filePath);
  }
}
