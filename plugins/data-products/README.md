# Data Products plugin

Frontend plugin that lists Software Catalog entities modeled as Data Products.

The list shows name, owner, lifecycle, version, data contract version, quality
status, certification status, compatibility, repository, and documentation.
Dependency topology is read from Catalog relations first, with custom
annotations as fallback. The contract API entity is the topology identity
for a data contract. Authoritative contract version is
`dataprod.platform/contract-version` on that API.

Quality badges are `DEVELOPMENT`, `TESTED`, and `CERTIFIED`. Compatibility
badges are `COMPATIBLE`, `BREAKING_CHANGE`, and `UNKNOWN`. The detail page
includes **Discover**, **Quality & Contract**, and **Dependencies**. Discover
links to the contract API, repository, TechDocs, and Catalog Graph. These
badges are technical platform status only and are not GxP or regulatory
validation.
