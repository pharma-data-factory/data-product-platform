# Generated file placeholders (counsel-gated)

Owner: Platform Team  
Documentation Version: 1.0  
Applicable Platform: Data Product Standard 1.0.x  
Last Reviewed: 2026-08  
Audience: INTERNAL ENGINEERING

**Not legal advice.** Do not copy license text into these paths until
`LEGAL-READINESS-PHASE-0.md` records an APPROVED counsel decision.

Default operational flag:

```yaml
commercial:
  legalDistributionStatus: BLOCKED
```

## REST Equipment locations to fill after approval

After G2 (and related third-party notice gates) are APPROVED, engineering
will add real files at:

| Generated path | Purpose |
| --- | --- |
| `templates/rest-equipment-product/content/LICENSE` | Outbound license for the generated Data Product |
| `templates/rest-equipment-product/content/NOTICE` | Copyright / attribution for original PDF template code |
| `templates/rest-equipment-product/content/THIRD_PARTY_NOTICES.md` | FastAPI, Pydantic, httpx, jsonschema, and other declared dependencies |
| `templates/rest-equipment-product/content/dataprod/LICENSE` | License that travels with the vendored SDK |

MQTT Temperature will need the same set plus Paho notices (G5). That is
not the first test SKU.

## Template comments (not license text)

Each placeholder, once added, must start with a machine-readable line:

```text
LEGAL DISTRIBUTION STATUS: BLOCKED
```

or, only after counsel + config `APPROVED`:

```text
LEGAL DISTRIBUTION STATUS: APPROVED
```

Until then those files must not exist in `content/` so Create cannot
accidentally ship invented legal text.
