# Namespace Convention

Owner: Platform Team  
Last reviewed: 2026-08-20  
Audience: PLATFORM USER  
Version: 1.0.0

Default hierarchy:

```text
{root}/{site}/{area}/{line}/{equipment}/{domain}/{event}
```

Default root: `pharma`. Site names are configuration, not product code.
Do not hard-code Basel or Kaiseraugst.

Examples:

```text
pharma/site-a/packaging/line-01/filler-01/production/cycle
pharma/site-a/packaging/line-01/filler-01/oee/cycle
pharma/site-b/cold-chain/chamber-07/sensor-07/temperature/value
```

Segments must be lowercase letters, digits, and dashes. Configure fields
with `UNS_TOPIC_FIELDS` and the root with `UNS_ROOT_TOPIC`.
