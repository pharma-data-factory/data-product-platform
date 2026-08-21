from fastapi.testclient import TestClient


def test_platform_metadata_reports_standard_versions(client: TestClient) -> None:
    response = client.get("/api/v1/platform-metadata")
    assert response.status_code == 200
    assert response.json() == {
        "dataProductStandardVersion": "1.0.0",
        "sdkVersion": "1.0.0",
        "template": "${{ values.templateName }}",
        "templateVersion": "${{ values.templateVersion }}",
        "contractVersion": "1.0.0",
    }
