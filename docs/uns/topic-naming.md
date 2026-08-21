# UNS Topic Naming

Owner: Platform Team  
Last reviewed: 2026-08-20  
Audience: PLATFORM USER  
Version: 1.0.0

Topic names are the public identity of a Unified Namespace stream.
They must parse as the configured hierarchy and match a registered
Topic Contract.

## Rules

1. Lowercase letters, digits, and dashes only.
2. Exactly the configured number of segments.
3. First segment is `UNS_ROOT_TOPIC` (default `pharma`).
4. Site, area, line, and equipment are configuration, not product code.
5. Domain and event identify the contract, not a site.
6. Do not encode Basel, Kaiseraugst, or any other plant name in software.

## Mapping

| Segment | Example | Meaning |
| --- | --- | --- |
| root | `pharma` | Enterprise / namespace root |
| site | `site-a` | Plant or campus |
| area | `packaging` | Functional area |
| line | `line-01` | Line, cell, or chamber group |
| equipment | `filler-01` | Machine or sensor |
| domain | `production` | Data domain |
| event | `cycle` | Event name |

Demonstration topics:

```text
{root}/site-a/packaging/line-01/filler-01/production/cycle
{root}/site-a/packaging/line-01/filler-01/production/state
{root}/site-b/cold-chain/chamber-07/sensor-07/temperature/value
{root}/site-a/packaging/line-01/filler-01/equipment/status
```

Unknown topics are rejected. Producers must not invent ad-hoc paths.
