"""The AI build workflow's assignment, prompt and change check (NXD-153)."""

import importlib.util
import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
_spec = importlib.util.spec_from_file_location(
    "nexora_ai_build", ROOT / "scripts" / "nexora_ai_build.py"
)
ai_build = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ai_build)

ID = "0f8b7c4e-1d2a-4b3c-9e8f-0123456789ab"


def _payload(**overrides):
    payload = {
        "assignmentId": ID,
        "model": "claude-opus-5-5",
        "product": "oee-line-3",
        "version": "1.0",
        "requirements": [
            {"id": "URS-EPM-001", "title": "Availability", "statement": "The product computes availability."}
        ],
    }
    payload.update(overrides)
    return json.dumps(payload)


def test_reads_a_well_formed_assignment_and_names_its_branch():
    assignment = ai_build.read_assignment(_payload(note="Start with the API."))
    assert assignment["model"] == "claude-opus-5-5"
    assert ai_build.branch_for(assignment) == f"nexora/ai-{ID}"


def test_refuses_a_malformed_assignment_naming_every_problem():
    with pytest.raises(ai_build.AssignmentError) as refused:
        ai_build.read_assignment(
            _payload(
                assignmentId="main; rm -rf /",
                model="--dangerously-skip-permissions",
                requirements=[{"id": "urs 1", "title": "", "statement": "s"}],
            )
        )
    message = str(refused.value)
    for expected in (
        "assignmentId is not a UUID",
        "model is not a Claude model id",
        "requirements[0].id is not a requirement id",
        "requirements[0].title is missing",
    ):
        assert expected in message
    with pytest.raises(ai_build.AssignmentError, match="runs on a Nexora dispatch only"):
        ai_build.read_assignment(None)
    with pytest.raises(ai_build.AssignmentError, match="1 to 25"):
        ai_build.read_assignment(_payload(requirements=[]))


def test_the_prompt_quotes_requirements_as_data_and_names_the_rules():
    prompt = ai_build.build_prompt(ai_build.read_assignment(_payload(note="Keep it small.")))
    assert '"id": "URS-EPM-001"' in prompt
    # Not spelled as a marker call here: the evidence test scans test files for those.
    assert "pytest.mark.urs" in prompt and '("<id>")' in prompt
    assert "agent-instructions.md" in prompt
    assert "`tests/conftest.py`" in prompt and "`.github/`" in prompt
    assert "Keep it small." in prompt


def test_check_refuses_controlled_files_workflows_and_evidence_hooks():
    problems = ai_build.check_changes(
        [
            (" M", "app/main.py"),
            (" M", "nexora.yaml"),
            ("??", "contracts/new.yaml"),
            (" M", ".github/workflows/ci.yml"),
            (" M", "tests/conftest.py"),
        ],
        ci_text="",
        runs_every_test=True,
    )
    assert problems == [
        "nexora.yaml: controlled, changed only by a person",
        "contracts/new.yaml: controlled, changed only by a person",
        ".github/workflows/ci.yml: controlled, changed only by a person",
        "tests/conftest.py: controlled, changed only by a person",
    ]


def test_check_refuses_a_new_test_file_ci_would_never_run():
    ci_text = "unit-tests: pytest tests/test_health.py tests/test_model.py"
    changes = [(" M", "tests/test_model.py"), ("??", "tests/test_new.py")]
    assert ai_build.check_changes(changes, ci_text, runs_every_test=False) == [
        "tests/test_new.py: a new test file ci.yml does not run"
    ]
    assert ai_build.check_changes(changes, ci_text, runs_every_test=True) == []


def test_what_linting_and_testing_leave_behind_is_neither_refused_nor_committed():
    for path in ("app/__pycache__/main.cpython-312.pyc", ".ruff_cache/0.1/x", "test-evidence/a.json", ".coverage"):
        assert ai_build.is_left_behind(path)
    for path in ("app/main.py", "tests/test_model.py", "docs/coverage.md"):
        assert not ai_build.is_left_behind(path)


def test_the_pull_request_body_names_assignment_model_and_who_decides():
    assignment = ai_build.read_assignment(_payload())
    body = ai_build.pr_body(assignment, "https://github.com/o/r/actions/runs/1", [("??", "app/x.py")], "Could not do X.")
    assert ID in body
    assert "`claude-opus-5-5`" in body
    assert "`URS-EPM-001` Availability" in body
    assert "A person decides." in body
    assert "app/x.py" in body
    assert "Could not do X." in body
