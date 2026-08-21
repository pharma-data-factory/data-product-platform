# Golden Path release checklist

Owner: Platform Team  
Documentation Version: 1.0  
Applicable Platform: Data Product Standard 1.0.x  
Last Reviewed: 2026-08  
Audience: INTERNAL ENGINEERING

Use before requesting Platform Admin approval.

1. Template source, tests, Dockerfile, CI, TechDocs, and catalog-info match the Data Product Standard.
2. Unit tests and Golden Path tests pass.
3. Conformance / quality gates pass.
4. Certification status is CERTIFIED for the template version.
5. SemVer bump matches [versioning-policy.md](../versioning-policy.md) (PATCH / MINOR / MAJOR).
6. Release notes exist under `docs/releases/`.
7. Manifest lists standard, SDK, distribution, and changelog.
8. Developer requests approval. Owner has reviewed certification.
9. Platform Admin sets lifecycle to RELEASED.
10. Verify Marketplace shows the current RELEASED version.

How-to: [Release a Golden Path](../how-to/release-golden-path.md).
