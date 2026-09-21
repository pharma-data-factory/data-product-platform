/**
 * Scaffolder extensions owned by the app.
 *
 * The URS baseline picker has to be registered where the Scaffolder form runs,
 * which is the app — the form itself comes from @backstage/plugin-scaffolder,
 * discovered automatically from packages/app dependencies rather than listed
 * in App.tsx.
 */

import { createFrontendModule } from '@backstage/frontend-plugin-api';
import {
  createFormField,
  FormFieldBlueprint,
} from '@backstage/plugin-scaffolder-react/alpha';

const ursBaselineField = FormFieldBlueprint.make({
  name: 'urs-baseline-picker',
  params: {
    field: () =>
      import('./UrsBaselinePicker').then(m =>
        createFormField({
          name: 'UrsBaselinePicker',
          component: m.UrsBaselinePicker,
        }),
      ),
  },
});

export const scaffolderFieldsModule = createFrontendModule({
  pluginId: 'scaffolder',
  extensions: [ursBaselineField],
});
