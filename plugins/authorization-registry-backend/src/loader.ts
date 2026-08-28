import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import * as YAML from 'yaml';
import { Logger } from 'winston';
import { AuthorizationProfile, ValidationError } from './types';
import { AuthorizationProfileValidator } from './validator';

export class AuthorizationProfileLoader {
  private validator: AuthorizationProfileValidator;

  constructor(private logger: Logger) {
    this.validator = new AuthorizationProfileValidator();
  }

  async loadProfiles(
    baseDir: string,
    pattern: string = 'templates/*/authorization.yaml',
  ): Promise<{
    profiles: AuthorizationProfile[];
    errors: ValidationError[];
  }> {
    this.logger.info(`Loading authorization profiles from ${baseDir}/${pattern}`);

    const profiles: AuthorizationProfile[] = [];
    const errors: ValidationError[] = [];

    try {
      const matches = await glob(pattern, {
        cwd: baseDir,
        absolute: true,
      });

      this.logger.info(`Found ${matches.length} authorization profile files`);

      for (const filePath of matches) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const profile = YAML.parse(content) as AuthorizationProfile;

          if (!profile) {
            errors.push({
              profile: 'unknown',
              error: 'Profile YAML is empty',
              path: filePath,
            });
            continue;
          }

          const validation = this.validator.validate(profile, filePath);

          if (!validation.valid) {
            errors.push(...validation.errors);
            continue;
          }

          profiles.push(profile);
          this.logger.debug(`Loaded profile: ${profile.metadata.name} from ${filePath}`);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          errors.push({
            profile: 'unknown',
            error: `Failed to parse: ${errorMsg}`,
            path: filePath,
          });
        }
      }

      if (errors.length > 0) {
        this.logger.warn(
          `Loaded ${profiles.length} valid profiles with ${errors.length} errors`,
        );
      } else {
        this.logger.info(`Successfully loaded ${profiles.length} authorization profiles`);
      }

      return { profiles, errors };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to load authorization profiles: ${errorMsg}`);
      throw err;
    }
  }
}
