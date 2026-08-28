import { Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@material-ui/core';
import type { QueryResult } from '../types';

export function DataProductTable({ result }: { result: QueryResult | null }) {
  if (!result) {
    return <Typography color="textSecondary">No data loaded.</Typography>;
  }
  if (result.source === 'unavailable') {
    return (
      <Typography color="textSecondary">
        INTERFACE_UNAVAILABLE — {result.detail ?? 'Query interface not reachable.'}
      </Typography>
    );
  }
  return (
    <Paper variant="outlined">
      <Typography variant="caption" style={{ padding: 8, display: 'block' }}>
        Source: {result.source}
        {result.detail ? ` · ${result.detail}` : ''}
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            {result.columns.map(c => (
              <TableCell key={c.id}>
                {c.id}
                {c.unit ? ` (${c.unit})` : ''}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {result.rows.map((row, idx) => (
            <TableRow key={idx}>
              {result.columns.map(c => (
                <TableCell key={c.id}>{formatCell(row[c.id], c.semanticType)}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}

function formatCell(value: unknown, semantic?: string): string {
  if (value === null || value === undefined) return '—';
  if (semantic === 'percentage' && typeof value === 'number') {
    return `${(value * 100).toFixed(1)}%`;
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
