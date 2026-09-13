/**
 * URS Composer Home Page
 */

import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  CardContent,
  CardActions,
  Button,
  Typography,
  Box,
  useTheme,
} from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import SearchIcon from '@material-ui/icons/Search';
import {
  NexoraSection,
  NexoraToolPage,
  primaryButtonSx,
} from '@internal/plugin-nexora-common';

export const URSComposerPage: FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const primarySx = primaryButtonSx(theme);

  return (
    <NexoraToolPage
      eyebrow="Governance"
      title="URS Composer"
      principle="From Business Need to Controlled Requirements"
      copy="Anchor engineering work to Business Capabilities, capture reviewable User Requirements, and run role-based baseline approval."
    >
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <NexoraSection title="Intent">
            <Typography variant="h6" gutterBottom>
              WHY
            </Typography>
            <Typography color="textSecondary" gutterBottom>
              Connect engineering work to Business Capabilities.
            </Typography>
            <Typography variant="h6" gutterBottom style={{ marginTop: 16 }}>
              WHAT
            </Typography>
            <Typography color="textSecondary" gutterBottom>
              Create structured and reviewable User Requirements.
            </Typography>
            <Typography variant="h6" gutterBottom style={{ marginTop: 16 }}>
              HOW
            </Typography>
            <Typography color="textSecondary" gutterBottom>
              Link requirements to solutions and engineering architecture.
            </Typography>
            <Typography variant="h6" gutterBottom style={{ marginTop: 16 }}>
              ASSURANCE
            </Typography>
            <Typography color="textSecondary">
              Create baselines from approved requirements and submit them for
              role-based approval. Approved baselines can be forwarded to
              Validation Expert for execution tracking.
            </Typography>
          </NexoraSection>
        </Grid>

        <Grid item xs={12} sm={6}>
          <NexoraSection title="Create">
            <CardContent style={{ padding: 0 }}>
              <Typography variant="h5" gutterBottom>
                Create URS
              </Typography>
              <Typography color="textSecondary">
                Start a new User Requirements Specification from a Business
                Capability using the guided create wizard.
              </Typography>
            </CardContent>
            <CardActions style={{ paddingLeft: 0 }}>
              <Button
                startIcon={<AddIcon />}
                onClick={() => navigate('/urs-composer/new')}
                style={primarySx}
              >
                Create New
              </Button>
            </CardActions>
          </NexoraSection>
        </Grid>

        <Grid item xs={12} sm={6}>
          <NexoraSection title="Library">
            <CardContent style={{ padding: 0 }}>
              <Typography variant="h5" gutterBottom>
                Browse Requirement Sets
              </Typography>
              <Typography color="textSecondary">
                View requirement sets, raise change requests, and review
                capability portfolio coverage. Approvals use a signing PIN as a
                technical workflow control (not a Part 11 claim).
              </Typography>
            </CardContent>
            <CardActions style={{ paddingLeft: 0, flexWrap: 'wrap', gap: 8 }}>
              <Button
                startIcon={<SearchIcon />}
                onClick={() => navigate('/urs-composer/library')}
                style={primarySx}
              >
                View All
              </Button>
              <Button onClick={() => navigate('/urs-composer/change-requests')}>
                Change Requests
              </Button>
              <Button onClick={() => navigate('/urs-composer/portfolio')}>
                Portfolio
              </Button>
            </CardActions>
          </NexoraSection>
        </Grid>

        <Grid item xs={12}>
          <NexoraSection title="About">
            <Box>
              <Typography paragraph>
                URS Composer anchors engineering work to business capabilities,
                captures controlled user requirements, and supports draft,
                baseline creation, role-based approval, and downstream validation
                planning.
              </Typography>
            </Box>
          </NexoraSection>
        </Grid>
      </Grid>
    </NexoraToolPage>
  );
};
