import { InfoCard } from '@backstage/core-components';
import { Typography } from '@material-ui/core';

export function JourneyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <InfoCard title={title}>
      <Typography variant="body2">{message}</Typography>
    </InfoCard>
  );
}
