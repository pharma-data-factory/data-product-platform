import fs from 'fs';
import path from 'path';
import {
  GoldenPathLifecycle,
  GoldenPathRelease,
  applyReleaseOverrides,
  canTransitionLifecycle,
  loadGoldenPathReleaseCatalog,
  loadGoldenPathReleases,
  releaseKey,
  validateGoldenPathReleaseCatalog,
} from '@internal/platform-common';
import { Config } from '@backstage/config';

export interface ReleaseOverride {
  status: GoldenPathLifecycle;
  updatedAt: string;
}

export interface ReleaseOverlayDocument {
  version: 1;
  overrides: Record<string, ReleaseOverride>;
}

export function releaseOverlayPath(config: Config, cwd = process.cwd()): string {
  const relative =
    config.getOptionalString('dataProducts.releases.overlayPath') ??
    'catalog/releases/release-overrides.json';
  return path.isAbsolute(relative) ? relative : path.join(cwd, relative);
}

export class FileReleaseOverlay {
  constructor(private readonly filePath: string) {}

  getStatus(template: string, version: string): GoldenPathLifecycle | undefined {
    return this.read().overrides[releaseKey(template, version)]?.status;
  }

  setStatus(
    template: string,
    version: string,
    status: GoldenPathLifecycle,
  ): ReleaseOverride {
    const document = this.read();
    const override: ReleaseOverride = {
      status,
      updatedAt: new Date().toISOString(),
    };
    document.overrides[releaseKey(template, version)] = override;
    this.write(document);
    return override;
  }

  mergedReleases(): GoldenPathRelease[] {
    const document = this.read();
    const overrides: Record<string, { status: GoldenPathLifecycle }> = {};
    for (const [key, value] of Object.entries(document.overrides)) {
      overrides[key] = { status: value.status };
    }
    return applyReleaseOverrides(loadGoldenPathReleases(), overrides);
  }

  private read(): ReleaseOverlayDocument {
    if (!fs.existsSync(this.filePath)) {
      return { version: 1, overrides: {} };
    }
    try {
      const parsed = JSON.parse(
        fs.readFileSync(this.filePath, 'utf8'),
      ) as Partial<ReleaseOverlayDocument>;
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

  private write(document: ReleaseOverlayDocument) {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
    fs.renameSync(tmp, this.filePath);
  }
}

export function catalogIssues(): string[] {
  return validateGoldenPathReleaseCatalog(loadGoldenPathReleaseCatalog()).map(
    issue => `${issue.path}: ${issue.message}`,
  );
}

export { canTransitionLifecycle };
