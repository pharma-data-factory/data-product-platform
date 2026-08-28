import { Paper, Typography } from '@material-ui/core';

export function DataProductJsonViewer({ value, title }: { value: unknown; title?: string }) {
  return (
    <Paper variant="outlined" style={{ padding: 12 }}>
      {title && (
        <Typography variant="subtitle2" gutterBottom>
          {title}
        </Typography>
      )}
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 12 }}>
        {JSON.stringify(value, null, 2)}
      </pre>
    </Paper>
  );
}

export function DataProductSchemaViewer({
  name,
  fields,
}: {
  name: string;
  fields: Array<{ name: string; required?: boolean; type?: string }>;
}) {
  return (
    <Paper variant="outlined" style={{ padding: 12, marginBottom: 12 }}>
      <Typography variant="subtitle2">{name}</Typography>
      {fields.length === 0 ? (
        <Typography variant="body2" color="textSecondary">
          Schema detail NOT_AVAILABLE in Control Plane — see product contracts artifact.
        </Typography>
      ) : (
        <ul style={{ margin: '8px 0', paddingLeft: 18 }}>
          {fields.map(f => (
            <li key={f.name}>
              <code>{f.name}</code>
              {f.required ? ' (required)' : ''}
              {f.type ? ` · ${f.type}` : ''}
            </li>
          ))}
        </ul>
      )}
    </Paper>
  );
}
