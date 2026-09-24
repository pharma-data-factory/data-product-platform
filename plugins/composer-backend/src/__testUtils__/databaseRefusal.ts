/**
 * Asserting that the *database* refused a write, not the service.
 *
 * Deliberately not `expect(...).rejects.toThrow()`. better-sqlite3 is a native
 * module: the binding is loaded once per worker process, and the `SqliteError`
 * it raises carries the `Error` intrinsic of whichever jest module realm
 * loaded it first. When another suite in the same worker got there first,
 * `error instanceof Error` is false inside the asserting file, and jest's
 * `toThrow` then reports "Received function did not throw" — even though the
 * constraint fired and the message is right there. That is the residue of the
 * flake in NXD-011, and it is why such a suite passes in isolation and fails
 * in full runs. Matching the message is realm-blind. See NXD-016.
 *
 * Lives here rather than inside one suite because the mistake is easy to make
 * again: `productRequirements.test.ts` reintroduced it in Slice 1a with a bare
 * `.rejects.toThrow()` on a unique-index violation, and the suite then failed
 * roughly two runs in five.
 */
export async function expectRefusedByDatabase(
  write: Promise<unknown>,
  pattern: RegExp,
): Promise<void> {
  let raised: unknown;
  let succeeded = false;
  try {
    await write;
    succeeded = true;
  } catch (error) {
    raised = error;
  }
  if (succeeded) {
    throw new Error(
      `Expected the database to refuse this write with ${pattern}, but it ` +
        `was accepted — the constraint is missing.`,
    );
  }
  expect(String((raised as { message?: unknown })?.message ?? raised)).toMatch(
    pattern,
  );
}
