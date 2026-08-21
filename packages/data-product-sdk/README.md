# Data Product SDK

Small Python helpers for official Data Product Golden Paths.

This package is the Control Plane source of truth for generic quality,
contract, compatibility, and platform-metadata behavior. Generated Data
Products vendor the `dataprod` package so they run independently of
Backstage.

Current versions:

- `DATA_PRODUCT_STANDARD_VERSION = 1.0.0`
- `DATA_PRODUCT_SDK_VERSION = 1.0.0`

Do not put product-specific fields, source ingestion, or storage here.
