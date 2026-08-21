"""Catalog annotation names, platform versions, and metadata helpers.

These are conventions for generated catalog-info.yaml. They are not a
Catalog client and do not require Backstage at runtime.
"""

from typing import TypedDict

DATA_PRODUCT_STANDARD_VERSION = "1.0.0"
DATA_PRODUCT_SDK_VERSION = "1.0.0"

CONTRACT_ANNOTATION = "dataprod.platform/contract"
CONTRACT_VERSION_ANNOTATION = "dataprod.platform/contract-version"
QUALITY_STATUS_ANNOTATION = "dataprod.platform/qualityStatus"
CERTIFICATION_STATUS_ANNOTATION = "dataprod.platform/certification-status"
COMPATIBLE_VERSIONS_ANNOTATION = "dataprod.platform/compatibleVersions"
STANDARD_VERSION_ANNOTATION = "dataprod.platform/dataProductStandardVersion"
SDK_VERSION_ANNOTATION = "dataprod.platform/dataProductSdkVersion"
TEMPLATE_ANNOTATION = "dataprod.platform/template"
TEMPLATE_VERSION_ANNOTATION = "dataprod.platform/templateVersion"

QUALITY_STATUSES = ("DEVELOPMENT", "TESTED", "CERTIFIED")
CERTIFICATION_STATUSES = ("DEVELOPMENT", "TESTED", "CERTIFIED")
COMPATIBILITY_STATUSES = ("COMPATIBLE", "BREAKING_CHANGE", "UNKNOWN")
QUALITY_REPORT_STATUSES = ("PASS", "FAIL")


class PlatformMetadata(TypedDict):
    dataProductStandardVersion: str
    sdkVersion: str
    template: str
    templateVersion: str
    contractVersion: str


def platform_metadata(
    template: str,
    template_version: str,
    contract_version: str,
) -> PlatformMetadata:
    """Build the standard GET /api/v1/platform-metadata payload."""
    return {
        "dataProductStandardVersion": DATA_PRODUCT_STANDARD_VERSION,
        "sdkVersion": DATA_PRODUCT_SDK_VERSION,
        "template": template,
        "templateVersion": template_version,
        "contractVersion": contract_version,
    }


def contract_api_entity_name(product_name: str, contract: str) -> str:
    """Return the unique Catalog API entity name for a logical contract."""
    return f"{product_name}--{contract}"
