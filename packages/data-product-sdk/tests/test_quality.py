from dataprod.quality import quality_report, run_check, unique_field_check


def test_quality_report_fails_on_mandatory_check() -> None:
    checks = [
        run_check("id_not_empty", [{"id": ""}], lambda item: bool(item.get("id")), "id required"),
    ]
    report = quality_report(checks, "1.0.0")
    assert report.status == "FAIL"
    assert report.contractVersion == "1.0.0"
    assert report.checks[0].failedCount == 1


def test_unique_field_check_counts_duplicates() -> None:
    check = unique_field_check(
        [{"id": "a"}, {"id": "a"}, {"id": "b"}],
        "id",
    )
    assert check.name == "id_unique"
    assert check.passed is False
    assert check.failedCount == 1
