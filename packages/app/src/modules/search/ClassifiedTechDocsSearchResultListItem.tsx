import { Link } from '@backstage/core-components';
import { ListItem, ListItemText, Typography } from '@material-ui/core';
import { classifyTechDocsResult } from '@internal/platform-common';

export interface ClassifiedSearchDocument {
  location?: string;
  title?: string;
  text?: string;
  documentTitle?: string;
}

export function ClassifiedTechDocsSearchResultListItem({
  result,
}: {
  result?: ClassifiedSearchDocument;
  rank?: number;
}) {
  if (!result?.location) {
    return null;
  }

  const kind = classifyTechDocsResult({
    location: result.location,
    title: result.title,
    documentTitle: result.documentTitle,
  });

  return (
    <ListItem alignItems="flex-start">
      <ListItemText
        primary={<Link to={result.location}>{result.title || result.location}</Link>}
        secondary={
          <>
            <Typography variant="caption" color="textSecondary" display="block">
              {kind}
            </Typography>
            {result.text}
          </>
        }
      />
    </ListItem>
  );
}
