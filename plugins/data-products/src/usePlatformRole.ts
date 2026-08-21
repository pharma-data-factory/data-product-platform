import { useEffect, useState } from 'react';
import { identityApiRef, useApi } from '@backstage/core-plugin-api';
import {
  PlatformRole,
  resolvePlatformRole,
} from '@internal/platform-common';

export function usePlatformRole(): {
  role: PlatformRole;
  ownershipEntityRefs: string[];
} {
  const identityApi = useApi(identityApiRef);
  const [role, setRole] = useState<PlatformRole>('VIEWER');
  const [ownershipEntityRefs, setOwnershipEntityRefs] = useState<string[]>([]);

  useEffect(() => {
    identityApi.getBackstageIdentity().then(identity => {
      setOwnershipEntityRefs(identity.ownershipEntityRefs);
      setRole(resolvePlatformRole(identity.ownershipEntityRefs));
    });
  }, [identityApi]);

  return { role, ownershipEntityRefs };
}
