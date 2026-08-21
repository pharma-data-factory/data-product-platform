# Certification Checklist

Owner: Platform Team  
Last reviewed: 2026-08-20  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

A Platform Component may be marked `certificationStatus = CERTIFIED`
only when every item below is demonstrably true. CERTIFIED is technical
conformance only. Do not claim GxP validation or regulatory approval.

- [x] Semantic version present
- [x] Catalog entity exists
- [x] `spec.type = platform-component`
- [x] Owner defined
- [x] Category defined
- [x] Compatible Data Product Standard declared
- [x] Configuration contract documented
- [x] Security configuration documented
- [x] Error behavior documented
- [x] Tests pass
- [x] TechDocs / README exists
- [x] Release notes exist
- [x] Health behavior where applicable
- [x] Observability integration where applicable
- [x] Example usage exists
- [x] No hard-coded secrets
- [x] No site/customer-specific values
- [x] No domain-specific logic

Do not promote a failing component. Placeholders (Kafka, intelligence)
stay PLANNED or DEVELOPMENT until they meet this list.

See [Wave 1 Conformance Matrix](wave-1-conformance.md) for the scored
result and [Security Limitations](security.md) for remaining production
gaps that are not certification blockers.
