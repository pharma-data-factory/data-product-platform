/**
 * Create / Edit URS Wizard Pages
 */

import { useCallback, useEffect, useState, type FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApi } from '@backstage/core-plugin-api';
import { Progress } from '@backstage/core-components';
import { Typography } from '@material-ui/core';
import { CreateWizard } from '../components/CreateWizard/CreateWizard';
import { ursComposerApiRef } from '../api/ursComposerApi';
import { fromRequirementSetToWizardState, URSWizardState } from '../components/CreateWizard/wizardState';

export const CreateURSWizardPage: FC = () => {
  const navigate = useNavigate();

  const handleComplete = useCallback(
    (requirementSetId: string) => {
      navigate(`/urs-composer/${requirementSetId}`);
    },
    [navigate],
  );

  const handleCancel = useCallback(() => {
    navigate('/urs-composer');
  }, [navigate]);

  return <CreateWizard onComplete={handleComplete} onCancel={handleCancel} />;
};

export const EditURSWizardPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const api = useApi(ursComposerApiRef);
  const [initialState, setInitialState] = useState<URSWizardState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }
    Promise.all([
      api.getRequirementSet(id),
      api.listRequirements(id),
    ])
      .then(([set, requirements]) => {
        setInitialState(fromRequirementSetToWizardState(set, requirements));
      })
      .catch(err => {
        setError(err.message || 'Failed to load draft');
      });
  }, [id, api]);

  const handleComplete = useCallback(
    (requirementSetId: string) => {
      navigate(`/urs-composer/${requirementSetId}`);
    },
    [navigate],
  );

  const handleCancel = useCallback(() => {
    if (id) {
      navigate(`/urs-composer/${id}`);
      return;
    }
    navigate('/urs-composer/library');
  }, [id, navigate]);

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  if (!initialState) {
    return <Progress />;
  }

  return (
    <CreateWizard
      initialState={initialState}
      editMode
      onComplete={handleComplete}
      onCancel={handleCancel}
    />
  );
};
