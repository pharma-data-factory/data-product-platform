# Publish TechDocs

Owner: Platform Team  
Last reviewed: 2026-08-19  
Audience: PLATFORM USER  
Version: MVP 1.1

TechDocs is the documentation platform. There is no second wiki.

1. Keep docs in `docs/` with `mkdocs.yml` in the repository.
2. Set `backstage.io/techdocs-ref: dir:.` on the Component.
3. Open **Documentation** on the Data Product Discover card.

Control Plane docs use `dir:.` on `component:default/data-product-platform`.
Generated products use the same annotation in their own repo.

Missing docs usually means the annotation or `mkdocs.yml` is absent.
Search indexes TechDocs through the existing collator.
