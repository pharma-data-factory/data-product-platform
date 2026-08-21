# Semantic IDs

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

AAS `semanticId` is stored as an ExternalReference with GlobalReference
keys. Example for rotational speed:

`https://example.org/semantics/rotational-speed`

Machine state uses the existing contract identity:

`https://dataprod.platform/contracts/machine-state-event`

Concept Descriptions are optional. The MVP does not run a full concept
dictionary or ECLASS dictionary. Callers should treat `semanticId.keys[0].value`
as the stable meaning string.
