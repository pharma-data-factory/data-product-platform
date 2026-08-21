# Troubleshooting

Owner: Platform Team  
Last reviewed: 2026-08-19  
Audience: PLATFORM USER  
Version: MVP 1.1

| Symptom | Likely cause | What to do |
| --- | --- | --- |
| Guest missing in production | Guest is development-only | Use GitHub login |
| Access denied after GitHub login | No Catalog User | Platform Admin adds the User and group |
| Create hidden | Viewer role | Add `data-product-developers` |
| `No token available for host: github.com` | GitHub App not installed | [GitHub setup](../github-setup.md) |
| CI Quality Gate UNKNOWN | Actions: Read-only missing or GitHub down | Not a product failure. See [CI failures](../how-to/ci-failure.md) |
| CI FAILED | Lint, tests, or Docker | Open failed stages, then [CI failures](../how-to/ci-failure.md) |
| Documentation missing | No `backstage.io/techdocs-ref` | Add TechDocs annotation and mkdocs.yml |
| Contract not registered | API entity missing | Check `providesApis` in catalog-info.yaml |
| Upgrade required | Standard/SDK/template drift | [Versioning](../engineering/versioning.md) |

Do not disable quality gates to make a demo pass.
