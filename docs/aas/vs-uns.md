# AAS vs Unified Namespace

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

Do not merge AAS and UNS.

| | AAS | UNS |
| --- | --- | --- |
| Question | What does this property mean? | Where does the event flow? |
| Stores | identity, unit, semanticId, mapping | topics, contracts, transport |
| Does not store | current/historical values | asset master data |

AAS stores a **reference** such as:

`pharma/basel/packaging/line-01/filler-01/speed/value`

UNS remains responsible for topic governance and MQTT transport. AAS
does not re-implement topic rules.

Kafka is documented as a future protocol value only. OPC UA and Kafka
runtimes are not implemented.
