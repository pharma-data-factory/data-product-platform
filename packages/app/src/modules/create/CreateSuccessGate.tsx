import { type ReactNode, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTaskEventStream } from '@backstage/plugin-scaffolder-react';
import { formatJourneyError } from '@internal/platform-common';
import { CreationFailurePage, CreationSuccessPage } from './CreationSuccessPage';
import { creationSuccessActions } from './creationSuccess';

export function CreateSuccessGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const taskId = location.pathname.match(/^\/create\/tasks\/([^/]+)/)?.[1];

  if (!taskId) {
    return <>{children}</>;
  }

  return <CreateSuccessOverlay taskId={taskId}>{children}</CreateSuccessOverlay>;
}

function CreateSuccessOverlay({
  taskId,
  children,
}: {
  taskId: string;
  children: ReactNode;
}) {
  const stream = useTaskEventStream(taskId);
  const [showLog, setShowLog] = useState(false);

  const result = useMemo(() => {
    const parameters = stream.task?.spec.parameters as
      | { name?: unknown }
      | undefined;
    const links = (stream.output?.links ?? []).map(link => ({
      title: link.title ?? '',
      url: link.url,
      entityRef: link.entityRef,
    }));
    return creationSuccessActions({
      productName:
        typeof parameters?.name === 'string' ? parameters.name : undefined,
      links,
    });
  }, [stream.output?.links, stream.task?.spec.parameters]);

  if (!showLog && stream.error) {
    return (
      <CreationFailurePage
        message={formatJourneyError(stream.error)}
        onDismiss={() => setShowLog(true)}
      />
    );
  }

  if (
    !showLog &&
    stream.completed &&
    !stream.error &&
    !stream.cancelled &&
    (result.productName || result.repository)
  ) {
    return (
      <CreationSuccessPage
        productName={result.productName || 'Data Product'}
        repository={result.repository}
        actions={result.actions}
        onDismiss={() => setShowLog(true)}
      />
    );
  }

  return <>{children}</>;
}
