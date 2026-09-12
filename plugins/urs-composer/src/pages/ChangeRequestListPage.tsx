/**
 * Change Request list — browse and open controlled change requests.
 */

import { useEffect, useMemo, useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '@backstage/core-plugin-api';
import {
  Header,
  Page,
  Content,
  ContentHeader,
  Table,
  TableColumn,
  Progress,
  Link,
  ErrorPanel,
} from '@backstage/core-components';
import { Button, Chip, Box } from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import { NEXORA_STATUS } from '@internal/plugin-nexora-common';
import { ursComposerApiRef } from '../api/ursComposerApi';
import { ChangeRequest, ChangeRequestStatus } from '../api/types';

const STATUS_COLORS: Record<ChangeRequestStatus, string> = {
  [ChangeRequestStatus.DRAFT]: NEXORA_STATUS.pending,
  [ChangeRequestStatus.ASSESSED]: NEXORA_STATUS.warning,
  [ChangeRequestStatus.APPROVED]: NEXORA_STATUS.success,
  [ChangeRequestStatus.REJECTED]: NEXORA_STATUS.error,
};

export const ChangeRequestListPage: FC = () => {
  const navigate = useNavigate();
  const api = useApi(ursComposerApiRef);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [items, setItems] = useState<ChangeRequest[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api
      .listChangeRequests()
      .then(result => {
        if (!mounted) return;
        setItems(result.items ?? []);
        setTotal(result.total ?? result.items?.length ?? 0);
      })
      .catch(err => {
        if (mounted) setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [api]);

  const columns: TableColumn<ChangeRequest>[] = useMemo(
    () => [
      {
        title: 'ID',
        field: 'id',
        render: (row: ChangeRequest) => (
          <Link to={`/urs-composer/change-requests/${row.id}`}>{row.id}</Link>
        ),
        width: '18%',
      },
      {
        title: 'Title',
        field: 'title',
        width: '28%',
      },
      {
        title: 'Status',
        render: (row: ChangeRequest) => (
          <Chip
            label={row.status}
            size="small"
            style={{
              backgroundColor: STATUS_COLORS[row.status] ?? NEXORA_STATUS.pending,
              color: NEXORA_STATUS.onAccent,
              fontWeight: 600,
            }}
          />
        ),
        width: '12%',
      },
      {
        title: 'Requested by',
        field: 'requestedBy',
        width: '22%',
      },
      {
        title: 'Requested at',
        render: (row: ChangeRequest) =>
          row.requestedAt ? new Date(row.requestedAt).toLocaleString() : '—',
        width: '20%',
      },
    ],
    [],
  );

  return (
    <Page themeId="tool">
      <Header
        title="Change Requests"
        subtitle="Controlled change workflow for requirement updates"
      />
      <Content>
        <ContentHeader title={`${total} change request${total === 1 ? '' : 's'}`}>
          <Button
            color="primary"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/urs-composer/change-requests/new')}
          >
            Create
          </Button>
        </ContentHeader>

        {loading && <Progress />}
        {error && (
          <Box marginBottom={2}>
            <ErrorPanel error={error} />
          </Box>
        )}
        {!loading && !error && (
          <Table
            data={items}
            columns={columns}
            options={{ paging: true, pageSize: 25, search: true }}
          />
        )}
      </Content>
    </Page>
  );
};
