from fastapi.testclient import TestClient

from dataprod.metadata import platform_metadata


def test_platform_metadata_reports_standard_versions(client: TestClient) -> None:
    response = client.get("/api/v1/platform-metadata")
    assert response.status_code == 200
    assert response.json() == platform_metadata(
        "${{ values.templateName }}",
        "${{ values.templateVersion }}",
        "1.0.0",
    )
