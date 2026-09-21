/**
 * Scaffolder form field for choosing the URS baseline a data product is built
 * against.
 *
 * Without it the template parameter is a free-text box expecting a UUID, which
 * in practice means the binding gets skipped or typed wrong — and a binding
 * nobody sets is a governance rule that only exists on paper.
 *
 * It offers approved baselines only. A product cannot be built against a draft,
 * and the scaffolder action re-checks that server-side: this field is
 * convenience, not the control.
 *
 * Leaving it empty is allowed. The agreed rule is free to create, bound to
 * release — the release gate refuses an unbound product later.
 */

import { useEffect, useState } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import type { FieldExtensionComponentProps } from '@backstage/plugin-scaffolder-react';
import {
  ursComposerApiRef,
  type ApprovedBaselineOption,
} from '@internal/plugin-urs-composer';
import {
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
} from '@material-ui/core';

/** Value written into the template parameter when nothing is chosen. */
const NONE = '';

export function UrsBaselinePicker(props: FieldExtensionComponentProps<string>) {
  const { formData, onChange, rawErrors, required, schema } = props;
  const api = useApi(ursComposerApiRef);

  const [options, setOptions] = useState<ApprovedBaselineOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    api
      .listApprovedBaselines()
      .then(items => {
        if (mounted) {
          setOptions(items);
        }
      })
      .catch(() => {
        // The field must not block the form when the URS Composer is
        // unreachable: the product can still be created unbound, and the
        // release gate is what insists on a binding.
        if (mounted) {
          setFailed(true);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [api]);

  const helperText = () => {
    if (loading) {
      return 'Loading approved baselines…';
    }
    if (failed) {
      return 'Could not reach the URS Composer. The product can be created unbound, but not released.';
    }
    if (options.length === 0) {
      return 'No approved URS baseline exists yet. Approve one in the URS Composer, or create this product unbound.';
    }
    return (
      schema.description ??
      'Only approved baselines are listed. Leave empty to create the product unbound.'
    );
  };

  return (
    <FormControl
      margin="normal"
      fullWidth
      required={required}
      error={Boolean(rawErrors?.length)}
      disabled={loading || failed || options.length === 0}
    >
      <InputLabel id="urs-baseline-picker-label">
        {schema.title ?? 'URS Baseline'}
      </InputLabel>
      <Select
        labelId="urs-baseline-picker-label"
        value={formData ?? NONE}
        onChange={event => onChange(String(event.target.value ?? NONE))}
      >
        <MenuItem value={NONE}>
          <em>None — create unbound</em>
        </MenuItem>
        {options.map(option => (
          <MenuItem key={option.baselineId} value={option.baselineId}>
            {option.requirementSetKey} v{option.baselineVersion}
            {option.solutionName ? ` — ${option.solutionName}` : ''}
            {` (${option.requirementCount} requirement${
              option.requirementCount === 1 ? '' : 's'
            })`}
          </MenuItem>
        ))}
      </Select>
      <FormHelperText>{helperText()}</FormHelperText>
    </FormControl>
  );
}
