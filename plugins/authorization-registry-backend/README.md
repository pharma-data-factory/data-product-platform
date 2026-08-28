# Authorization Registry Backend Plugin

Backstage backend plugin that discovers, validates, and exposes authorization profiles from data product templates.

## Features

- **Profile Discovery**: Automatically discovers authorization profiles from `templates/*/authorization.yaml`
- **Validation**: Validates profile structure, permissions, and role definitions
- **Registry API**: Exposes REST endpoints to query profiles and permissions
- **Diagnostics**: Provides visibility into discovered profiles, permissions, and any errors
- **No Auto-Registration**: Discovered permissions are queryable but not auto-granted to preserve control

## Installation

This plugin is part of the Pharma Data Factory platform.

### Adding to Your Backend

In your backend's `packages/backend/src/index.ts`:

```typescript
import { authorizationRegistryPlugin } from '@internal/plugin-authorization-registry-backend';

// Add to plugins
const backends = createBackend({
  defaultConfig: createDefaultConfig(),
  plugins: [
    authorizationRegistryPlugin(),
    // ... other plugins
  ],
});
```

## Configuration

The plugin discovers profiles from the current working directory with the pattern:

```
templates/*/authorization.yaml
```

No additional configuration is required for basic operation.

## API Endpoints

All endpoints are prefixed with `/api/authorization`:

### Profiles

- `GET /profiles` - List all discovered profiles (summary)
- `GET /profiles/:domain` - Get full profile for a domain
- `GET /roles` - List all suggested roles across domains
- `GET /roles/:domain` - List roles for a specific domain

### Permissions

- `GET /permissions` - List all discovered permissions
- `GET /permissions/:domain` - List permissions for a domain

### Diagnostics

- `GET /diagnostics` - Registry status and diagnostics

### Health

- `GET /health` - Health check (unauthenticated)

## Example Responses

### GET /profiles

```json
[
  {
    "name": "oee",
    "domain": "oee",
    "title": "OEE Authorization Profile",
    "permissions": 4,
    "suggestedRoles": 4
  }
]
```

### GET /profiles/oee

```json
{
  "name": "oee",
  "domain": "oee",
  "title": "OEE (Overall Equipment Effectiveness) Authorization Profile",
  "description": "Authorization profile for the OEE Data Product Golden Path...",
  "permissions": [
    {
      "name": "oee.read",
      "title": "Read OEE Data",
      "description": "View OEE results, metrics..."
    }
  ]
}
```

### GET /diagnostics

```json
{
  "profilesDiscovered": 6,
  "profilesValid": 6,
  "profilesInvalid": 0,
  "permissionsDiscovered": 24,
  "permissionsByDomain": {
    "aas": 4,
    "equipment": 4,
    "machine-state": 4,
    "mqtt": 4,
    "oee": 4,
    "uns": 4
  },
  "domainsDiscovered": ["aas", "equipment", "machine-state", "mqtt", "oee", "uns"],
  "lastLoaded": "2026-08-26T20:30:00Z",
  "sourcePaths": ["templates/oee-data-product/authorization.yaml", ...],
  "errors": []
}
```

## Profile Format

Authorization profiles follow the standard format:

```yaml
apiVersion: platform.nexora.io/v1alpha1
kind: AuthorizationProfile
metadata:
  name: domain-name
  title: Display Title
spec:
  domain: domain-name
  title: Domain Authorization Profile
  description: Profile description
  permissions:
    - name: domain-name.read
      title: Read Permission
      description: Permission description
      category: read
      runtimeEnforcement: IMPLEMENTED
      enforcement:
        location: runtime
        mechanism: api-check
        description: How enforcement works
  suggestedRoles:
    - name: domain-name-viewer
      title: Viewer Role
      description: Role description
      permissions:
        - domain-name.read
      principalType: user
```

## Testing

Run tests for the registry:

```bash
cd plugins/authorization-registry-backend
npm test
```

Tests cover:

- Profile discovery from filesystem
- Profile validation
- Permission indexing
- API endpoint responses
- Diagnostics accuracy
- Error handling

## Architecture

### Components

1. **Loader** (`loader.ts`): Discovers and parses authorization.yaml files
2. **Validator** (`validator.ts`): Validates profile structure and references
3. **Registry** (`registry.ts`): In-memory registry with query methods
4. **Router** (`router.ts`): Express router with REST endpoints

### Design Principles

- **No Auto-Registration**: Permissions are discovered but not auto-granted
- **Immutable at Runtime**: Profiles are loaded at startup; runtime products don't modify them
- **Single Registry**: One instance per backend; profiles are shared
- **No Breaking Changes**: Existing permission framework unaffected
- **Backstage-Independent Generated Code**: Runtime products see authorization.yaml as static metadata

## Integration with Permission Catalog

Discovered permissions are available via:

```typescript
import { AuthorizationProfileRegistry } from '@internal/plugin-authorization-registry-backend';

// In backend service
const registry = // get from context
const allPermissions = registry.getAllPermissions();
const oeePerm = registry.getPermissionsByDomain('oee');
```

Permissions are **not** auto-registered to Backstage's permission system; admins retain control over grants.

## Troubleshooting

### No profiles discovered

1. Verify profiles exist at `templates/*/authorization.yaml`
2. Check plugin logs for glob pattern matches
3. Check `/diagnostics` endpoint for error details

### Profile validation failures

1. Check that profiles have valid YAML syntax
2. Verify apiVersion: `platform.nexora.io/v1alpha1`
3. Verify kind: `AuthorizationProfile`
4. Check that all permission names start with `{domain}.`
5. Check that suggested roles reference existing permissions

### API errors

Check backend logs for detailed error messages:

```bash
grep "Authorization Registry" backend.log
```

## Links

- [Architecture Documentation](../../docs/architecture/authorization-profile-registry.md)
- [Authorization Profiles](../../docs/authorization-profiles.md)
- [Authorization Profile Registry Implementation Plan](../../AUTHORIZATION_REGISTRY_IMPLEMENTATION_PLAN.md)
