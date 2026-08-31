# Hosted GitHub login

Owner: Platform Team  
Documentation Version: 1.0  
Applicable Platform: Data Product Standard 1.0.x  
Last Reviewed: 2026-08-21  
Audience: PLATFORM ADMIN / PLATFORM USER

Hosted Control Plane login is **GitHub OAuth only**. Guest is local
development. Unknown GitHub users are denied.

## Two GitHub credentials

| Mechanism | Purpose | Variables | Client ID prefix |
| --- | --- | --- | --- |
| OAuth App “Nexora Login” | Human sign-in | `AUTH_GITHUB_*` | `Ov23` |
| GitHub App | Create Golden Path repositories | `GITHUB_APP_*` / `GITHUB_CLIENT_*` / `GITHUB_PRIVATE_KEY` | `Iv23` |

Do not reuse GitHub App client values for login.

## Hosted OAuth App

1. GitHub → Settings → Developer settings → OAuth Apps → the existing
   **Nexora Login** app (or create one).
2. Homepage URL: `https://<domain>`
3. Authorization callback URL:
   `https://<domain>/api/auth/github/handler/frame`
4. Keep the localhost callback as an additional URL if you still develop
   locally.
5. Set in Portainer:

   - `AUTH_GITHUB_CLIENT_ID`
   - `AUTH_GITHUB_CLIENT_SECRET`
   - `AUTH_GITHUB_CALLBACK_URL` = the HTTPS callback **exactly**

Production resolver: `usernameMatchingUserEntityName` **without**
`dangerouslyAllowSignInWithoutUserInCatalog`.

```text
GitHub OAuth
  → Catalog User (metadata.name = github login, lowercase)
  → spec.memberOf group
  → RBAC
```

Unauthenticated visitors see the public landing. Sign In shows
**Continue with GitHub** only. There is no Guest button.

Authenticated GitHub users who are missing from Catalog, or who have no
platform group, see **Access not granted**. They do not receive Viewer.

## Onboard a developer

Add a User to `catalog/org.yaml`, rebuild/redeploy the Control Plane
image (the file is copied into the image), then ask the user to sign in
again.

```yaml
apiVersion: backstage.io/v1alpha1
kind: User
metadata:
  name: github-login
  annotations:
    github.com/user-login: github-login
spec:
  profile:
    displayName: Example Developer
  memberOf: [data-product-developers]
```

`metadata.name` and `github.com/user-login` must match the GitHub login
in lowercase.

| Group | Role |
| --- | --- |
| `platform-viewers` | Viewer |
| `data-product-developers` | Developer |
| `data-product-owners` | Data Product Owner |
| `platform-admins` | Platform Admin |

Assign **one** platform role group. Do not auto-grant Developer from
OAuth scopes.

Local Guest remains `guests` + `data-product-developers` and is not a
hosted identity.

Related: [Identity and RBAC](../identity-and-rbac.md),
[GitHub setup](../github-setup.md).
