import { Button, Snackbar } from '@material-ui/core';

/**
 * NXD-096. A delete in the wizard was immediate and final: one click on a
 * trash icon removed a requirement with its statement and every acceptance
 * criterion, with no confirmation and no way back short of retyping it.
 *
 * Undo rather than a confirmation dialog: deleting is usually intended, and
 * a dialog on every delete trains people to click through it. The snackbar
 * stays until dismissed, replaced by a newer delete, or eight seconds pass;
 * a click elsewhere on the page does not dismiss it.
 */
export function UndoSnackbar({
  message,
  onUndo,
  onClose,
}: {
  /** `null` hides the snackbar. */
  message: string | null;
  onUndo: () => void;
  onClose: () => void;
}) {
  return (
    <Snackbar
      open={message !== null}
      message={message ?? ''}
      autoHideDuration={8000}
      onClose={(_event, reason) => {
        if (reason !== 'clickaway') onClose();
      }}
      action={
        <Button color="secondary" size="small" onClick={onUndo}>
          Undo
        </Button>
      }
    />
  );
}
