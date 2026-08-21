# Data Product SDK

Owner: Platform Team  
Last reviewed: 2026-08-19  
Audience: INTERNAL ENGINEERING  
Version: MVP 1.1 / SDK 1.x

Generic quality, contract, compatibility, and metadata helpers live in
`packages/data-product-sdk` and are vendored into generated products as
`dataprod/`.

Do not change SDK semantics from Developer Hub documentation. Generated
services must keep working without Backstage.

Products report SDK version at `GET /api/v1/platform-metadata`.
