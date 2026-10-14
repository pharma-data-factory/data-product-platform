/**
 * The pure half of the Install dialog (NXD-141): from what a person typed to
 * the configuration the installations store validates.
 *
 * An empty field means "not set", so the manifest's default applies; a
 * secret field holds the name of a secret on the target, never its value,
 * and is sent as `{ secretRef }`. The store validates again and decides; this
 * only lets the dialog name every problem before anyone signs.
 */

import {
  validateInstallationConfig,
  type ConfigKeySchema,
  type InstallationConfig,
} from '@internal/platform-common';

export function installConfigFromForm(
  schema: readonly ConfigKeySchema[],
  values: Readonly<Record<string, string>>,
): { config: InstallationConfig; issues: string[] } {
  const input: Record<string, unknown> = {};
  for (const entry of schema) {
    const value = (values[entry.key] ?? '').trim();
    if (!value) {
      continue;
    }
    input[entry.key] = entry.type === 'secret' ? { secretRef: value } : value;
  }
  return validateInstallationConfig(schema, input);
}

/** Why an act will be signed, in the words the dialog shows (NXD-140). */
export function signatureReason(source: string | undefined): string {
  switch (source) {
    case 'PRODUCT':
      return 'The Nexora product that governs it is GMP-relevant.';
    case 'NO_PRODUCT':
      return 'No Nexora product governs it, so nobody has answered whether it is GMP-relevant; it is treated as GMP-relevant.';
    default:
      return 'Its GMP classification could not be read, so it is treated as GMP-relevant.';
  }
}
