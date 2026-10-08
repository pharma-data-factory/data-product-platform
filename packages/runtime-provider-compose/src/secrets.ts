/**
 * The target's secret store, for this provider: one file per reference
 * under a directory, as Docker and Kubernetes mount secrets. `mqtt/password`
 * is `<dir>/mqtt/password`; a trailing newline is dropped. Nexora never sees
 * the value (NXD-139); it holds only the reference.
 */

import { readFile } from 'fs/promises';
import { resolve, sep } from 'path';
import { isValidSecretRef } from '@internal/platform-common';
import type { SecretResolver } from './compose';

export function createFileSecretResolver(dir: string | undefined): SecretResolver {
  return async secretRef => {
    if (!dir || !isValidSecretRef(secretRef)) return undefined;
    const root = resolve(dir);
    const path = resolve(root, secretRef);
    if (!path.startsWith(root + sep)) return undefined;
    try {
      return (await readFile(path, 'utf8')).replace(/\r?\n$/, '');
    } catch {
      return undefined;
    }
  };
}
