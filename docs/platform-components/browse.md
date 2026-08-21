# Browse the Component Library

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

Open the Component Library at `/platform-components`.

The page is Catalog-backed. Search and filters run in the browser over
Catalog results. There is no second component database and no extra
search backend.

Use cards to inspect:

- category
- technical status (CERTIFIED, TESTED, DEVELOPMENT, PLANNED)
- version
- runtime availability
- Data Product Standard 1.x compatibility
- Used By derived from validated compositions

CERTIFIED Wave 1 runtimes are Health, Observability, REST API, REST
Source, MQTT Consumer, and Time-Series Storage.

Catalog-only entities such as Kafka Consumer, Kafka Producer,
PostgreSQL, Object Storage, and Audit are labelled **Catalog only · No
runtime**. Version `1.0.0` on those entities is not a runtime proof.

Open `/compose` to build a composition YAML from this library. Composer
is not a second Catalog.
