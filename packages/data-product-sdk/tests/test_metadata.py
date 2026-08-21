from dataprod.metadata import (
    DATA_PRODUCT_SDK_VERSION,
    DATA_PRODUCT_STANDARD_VERSION,
    contract_api_entity_name,
    platform_metadata,
)


def test_platform_versions_are_semver() -> None:
    assert DATA_PRODUCT_STANDARD_VERSION == "1.0.0"
    assert DATA_PRODUCT_SDK_VERSION == "1.0.0"


def test_platform_metadata_is_generic() -> None:
    payload = platform_metadata("example-template", "1.0.0", "2.0.0")
    assert payload == {
        "dataProductStandardVersion": "1.0.0",
        "sdkVersion": "1.0.0",
        "template": "example-template",
        "templateVersion": "1.0.0",
        "contractVersion": "2.0.0",
    }


def test_contract_api_entity_name_is_unique_per_product() -> None:
    first = contract_api_entity_name("cold-room-product", "sample-event")
    second = contract_api_entity_name("warehouse-product", "sample-event")
    assert first == "cold-room-product--sample-event"
    assert second == "warehouse-product--sample-event"
    assert first != second

