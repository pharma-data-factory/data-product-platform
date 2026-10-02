/**
 * Runs the GitHub team reconciler (NXD-108) on the Backstage scheduler and
 * answers the admin page's status questions.
 *
 * **Scheduled, with a lock.** One task, `scope: 'global'`: across several
 * backend instances the scheduler's database lock lets exactly one run at a
 * time, so two reconcilers never race on the same team.
 *
 * **Immediately after a change.** `trigger()` asks the scheduler to run the
 * same task now (`triggerTask`), through the same lock. If a run is already
 * in progress the scheduler refuses with a ConflictError; the request is then
 * remembered and the task is triggered again when the current run ends, so a
 * change made mid-run is not left waiting for the next interval. That memory
 * is per instance — a run on another instance is caught by the interval.
 */

import {
  LoggerService,
  RootConfigService,
  SchedulerService,
  SchedulerServiceTaskScheduleDefinition,
  readSchedulerServiceTaskScheduleDefinitionFromConfig,
} from '@backstage/backend-plugin-api';
import type { GithubTeamSyncConfig } from './githubTeamSync';
import type { GithubTeamsClient } from './githubTeams';
import type { TeamSyncStateRecord, UsersRepository } from './repository';
import { reconcile, ReconcileSummary } from './teamReconciler';

export const TEAM_SYNC_TASK_ID = 'users-github-team-sync';

const DEFAULT_SCHEDULE: SchedulerServiceTaskScheduleDefinition = {
  frequency: { minutes: 15 },
  timeout: { minutes: 5 },
};

export type TriggerResult = 'triggered' | 'queued';

export interface TeamSyncStatus {
  enabled: boolean;
  organization?: string;
  /** Platform group → team slug. */
  teams?: Record<string, string>;
  /** The last run this instance performed; null before the first. */
  lastRun?: ReconcileSummary | null;
  states?: TeamSyncStateRecord[];
}

export interface TeamSyncController {
  readonly enabled: boolean;
  /** Fire-and-forget from the mutation routes; never throws. */
  trigger(): Promise<TriggerResult>;
  status(): Promise<TeamSyncStatus>;
}

/** Installed when the sync is off: reports so, and does nothing. */
export const disabledTeamSync: TeamSyncController = {
  enabled: false,
  trigger: async () => 'queued',
  status: async () => ({ enabled: false }),
};

function isConflict(error: unknown): boolean {
  return (error as { name?: string } | undefined)?.name === 'ConflictError';
}

export async function startTeamSync(options: {
  config: GithubTeamSyncConfig;
  rootConfig: RootConfigService;
  scheduler: SchedulerService;
  client: GithubTeamsClient;
  repository: UsersRepository;
  logger: LoggerService;
}): Promise<TeamSyncController> {
  const { config, scheduler, logger, repository } = options;
  const scheduleConfig = options.rootConfig.getOptionalConfig(
    'users.githubTeamSync.schedule',
  );
  const schedule = scheduleConfig
    ? readSchedulerServiceTaskScheduleDefinitionFromConfig(scheduleConfig)
    : DEFAULT_SCHEDULE;

  let lastRun: ReconcileSummary | null = null;
  let rerunRequested = false;

  const trigger = async (): Promise<TriggerResult> => {
    try {
      await scheduler.triggerTask(TEAM_SYNC_TASK_ID);
      return 'triggered';
    } catch (error) {
      if (isConflict(error)) {
        rerunRequested = true;
        return 'queued';
      }
      logger.warn(
        `GitHub team sync could not be triggered: ${(error as Error).message}`,
      );
      return 'queued';
    }
  };

  await scheduler.scheduleTask({
    id: TEAM_SYNC_TASK_ID,
    scope: 'global',
    ...schedule,
    fn: async () => {
      try {
        lastRun = await reconcile({
          organization: config.organization,
          teams: config.teams,
          client: options.client,
          repository,
          log: message => logger.info(message),
        });
      } catch (error) {
        // Reading the user table failed, or similar. Logged, not rethrown:
        // the scheduler keeps the interval either way.
        logger.error(`GitHub team sync failed: ${(error as Error).message}`);
      }
      // Read and cleared at the end, not the start: the scheduler reports
      // the task as running from the moment it is claimed, so a refusal can
      // arrive before this function body begins. Clearing it then would lose
      // that change. At worst this costs one redundant run.
      if (rerunRequested) {
        rerunRequested = false;
        setImmediate(() => void trigger());
      }
    },
  });

  logger.info(
    `GitHub team sync scheduled for ${config.organization} ` +
      `(${Object.keys(config.teams).length} group mapping(s)).`,
  );

  return {
    enabled: true,
    trigger,
    status: async () => ({
      enabled: true,
      organization: config.organization,
      teams: config.teams,
      lastRun,
      states: await repository.listTeamSyncState(),
    }),
  };
}
