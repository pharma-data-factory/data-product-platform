/**
 * URS Composer Home Page
 */

import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, Page, Content, ContentHeader } from '@backstage/core-components';
import {
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Typography,
  Box,
} from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import SearchIcon from '@material-ui/icons/Search';

export const URSComposerPage: FC = () => {
  const navigate = useNavigate();

  return (
    <Page themeId="tool">
      <Header title="URS Composer" subtitle="User Requirements Specification" />
      <Content>
        <ContentHeader title="From Business Need to Controlled Requirements" />

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
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
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent style={{ flexGrow: 1 }}>
                <Typography variant="h5" gutterBottom>
                  Create URS
                </Typography>
                <Typography color="textSecondary">
                  Start a new User Requirements Specification from a Business
                  Capability using the 8-step guided wizard.
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/urs-composer/new')}
                >
                  Create New
                </Button>
              </CardActions>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent style={{ flexGrow: 1 }}>
                <Typography variant="h5" gutterBottom>
                  Browse Requirement Sets
                </Typography>
                <Typography color="textSecondary">
                  View persisted requirement sets across different solutions.
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  color="primary"
                  startIcon={<SearchIcon />}
                  onClick={() => navigate('/urs-composer/library')}
                >
                  View All
                </Button>
              </CardActions>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  What is URS Composer?
                </Typography>
                <Box marginTop={2}>
                  <Typography paragraph>
                    URS Composer anchors engineering work to business capabilities,
                    captures controlled user requirements, and supports draft,
                    baseline creation, role-based approval, and downstream validation planning.
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Content>
    </Page>
  );
};
