import { Link } from '@backstage/core-components';
import { Typography } from '@material-ui/core';
import { classifyTechDocsResult } from '@internal/platform-common';

export function DocumentationSearchKind({
  location,
  title,
}: {
  location?: string;
  title?: string;
}) {
  return (
    <Typography variant="caption" color="textSecondary">
      {classifyTechDocsResult({ location, title })}
    </Typography>
  );
}

export function DocumentationKindLink({
  label,
  to,
}: {
  label: string;
  to: string;
}) {
  return (
    <Typography variant="body2">
      <Link to={to}>{label}</Link>
    </Typography>
  );
}
