# Platform GitHub repository

Owner: Platform Team  
Documentation Version: 1.0  
Applicable Platform: Data Product Standard 1.0.x  
Last Reviewed: 2026-08-21  
Audience: PLATFORM ADMIN

The Control Plane source repository for the hosted image and GHCR publish.

## Organization

Preferred GitHub organization: **`pharma-data-factory`**.

If the organization does not exist:

1. GitHub → New organization (free org is enough for a private repo).
2. Name: `pharma-data-factory`.
3. Add owners. Do not make the org public-by-default for this product.

If a different org already owns the product, use that org consistently
in GHCR (`ghcr.io/<org>/data-product-platform`) and in Golden Path
`publish:github` owner (`pharma-data-factory` in templates today).

## Repository

Suggested name: **`data-product-platform`**.

Initial visibility: **PRIVATE** until legal/OSS distribution is decided.
Do not create a public repository automatically.

`.env`, PEM keys, OAuth secrets, GitHub App secrets, AWS keys, and
runtime link-store files must never be committed. See `.gitignore` and
`.dockerignore`.

## Default branch

**`main`**.

Local rename from `master` (history preserved):

```bash
git branch -M main
```

## First push (after a local baseline commit)

Confirm org ownership and `gh` login first. Then:

```bash
cd data-product-platform
git remote add origin git@github.com:pharma-data-factory/data-product-platform.git
git branch -M main
git push -u origin main
```

HTTPS remote:

```bash
git remote add origin https://github.com/pharma-data-factory/data-product-platform.git
```

Create the empty **private** repo in the org in the GitHub UI before
`git push` if it does not exist. Do not `--force` to `main`.

## GHCR

After the first successful `main` CI run, the package appears under the
org Packages. Grant Portainer a read token (`read:packages`) if the
package is private.

Related: [Portainer](../deployment/portainer.md),
[Control Plane hosting](../operations/control-plane-hosting.md).
