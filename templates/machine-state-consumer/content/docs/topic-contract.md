# Topic Contract

Logical topic:

```text
{root}/{site}/{area}/{line}/{equipment}/machine/state
```

Default subscription: `${{ values.topicPattern }}`

Site and equipment names come from the event `source` metadata. They are
not hard-coded in product logic.

Contract: `machine-state-event` `1.0.0`
