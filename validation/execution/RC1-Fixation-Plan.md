# RC1 fixation plan

**Candidate label:** Platform Core 1.0-RC1  
**Proposed tag:** `platform-core-v1.0-rc1`  
**This phase:** plan only. **No commit. No tag.**  
**Date:** 2026-08-22  

## Required end state

| Outcome | Current |
| --- | --- |
| Clean git worktree | DIRTY (240 paths) |
| Exact candidate commit | HEAD `d96ab0cb…` is **not** the candidate |
| Validation package bound | Sibling `IDP/validation/` only |
| Exact lockfile | Mixed / dirty `yarn.lock` |
| Manifest updated | Commit/worktree still DIRTY / NOT_ESTABLISHED |
| Tag `platform-core-v1.0-rc1` | Does not exist |

## Preconditions (human)

1. Decide **minimal Core** vs **product snapshot** (`RC1-Change-Inventory.md`).
2. Resolve every **REVIEW_REQUIRED** path (YES/NO).
3. Approve copy of `validation/` into `data-product-platform/validation/` (keep source).
4. Confirm `.env` and other secrets stay untracked.

## Recommended sequence (minimal Core)

1. Branch from `main` (do not rewrite published history).
2. Copy `IDP/validation` → `data-product-platform/validation` (migration plan). Verify hashes.
3. Stage **only** YES paths (P0/P1/required config + validation package).
4. Leave UNRELATED paths unstaged (or move them to another branch). Do **not** discard unless a human explicitly orders it.
5. If lockfile cannot represent a Core-only workspace, either:
   - regenerate lockfile after removing unstaged workspaces (change record), or
   - keep mixed lockfile and document that the candidate includes those workspaces (not minimal Core).
6. Update `validation/execution/RC1-Manifest.yaml`:
   - `git.commit` = new SHA
   - `worktree_status` = CLEAN
   - `validation_package_git` = same SHA
   - lockfile hash
7. Human-authored commit (this plan does not create it).
8. Confirm `git status` empty.
9. Tag `platform-core-v1.0-rc1` on that commit (this plan does not create it).
10. Push commit+tag only when a human requests it.

## After tag

Feature development on this candidate is forbidden (documented freeze, not hook-enforced). Product-code changes need a change record and a new candidate ID.

## Creating this plan does not freeze the repository.
