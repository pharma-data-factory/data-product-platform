# Validation package migration plan

**Target:** `data-product-platform/validation/`  
**Source (do not destroy):** `IDP/validation/` (sibling of the product repo)  
**Date:** 2026-08-22  

The RC1 git object/tag cannot uniquely bind protocols and reviews until this package lives in the product repository. `.gitignore` does **not** ignore `validation/`.

## Safety

| Rule | Action |
| --- | --- |
| Do not destroy source | **Copy first.** Keep `IDP/validation/` until a human confirms the in-repo copy is complete. |
| Do not commit in this phase | Copy may be prepared later; this document is the plan only. |
| Secrets | Validation tree has no `.env`. Do not copy `data-product-platform/.env`. |
| Path meaning | After copy, paths such as `packages/backend/...` remain correct from the product repo root. |

## Sequence (later phase — not executed now)

1. Confirm product worktree include/exclude decisions (`RC1-Change-Inventory.md`).
2. `robocopy` / `Copy-Item -Recurse` from `IDP/validation` to `data-product-platform/validation`.
3. Diff file counts and hashes between source and copy.
4. Add `validation/` in the same candidate commit as approved Core sources (or immediately after on the same tag).
5. Update `RC1-Manifest.yaml` `validation_package_git` from `NOT_ESTABLISHED` to the candidate commit.
6. Keep the sibling copy as a backup until the tag exists.
7. Only then optionally stop maintaining the sibling (human decision).

## Risks

| Risk | Mitigation |
| --- | --- |
| Copy drift if both trees are edited | Freeze edits to one location after copy |
| Large unrelated product files in the same commit | Separate Core commit from OEE/Nexora per inventory |
| Windows OneDrive path | Use a verified recursive copy; confirm no skipped files |

## Readiness

**Safe to copy:** YES  
**Safe to delete source:** NO until tag exists  
**Migration executed:** NO
