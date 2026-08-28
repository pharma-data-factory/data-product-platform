import {
  buildSummary,
  discoverPlugins,
  filterPlugins,
} from './inventory';
import type {
  NexoraPluginDescriptor,
  PluginDirectoryListResponse,
  PluginDirectorySummary,
} from './types';

export class PluginDirectoryService {
  constructor(
    private readonly workspaceRoot: string,
    private readonly logger?: { warn: (message: string) => void },
  ) {}

  list(query: {
    q?: string;
    type?: string;
    lifecycle?: string;
    validationStatus?: string;
  } = {}): PluginDirectoryListResponse {
    const all = discoverPlugins({
      workspaceRoot: this.workspaceRoot,
      logger: this.logger,
    });
    const items = filterPlugins(all, query);
    const core = all.find(item => item.id === 'backstage-core');
    return {
      items,
      summary: buildSummary(all, core?.version),
    };
  }

  get(id: string): NexoraPluginDescriptor | undefined {
    return discoverPlugins({
      workspaceRoot: this.workspaceRoot,
      logger: this.logger,
    }).find(item => item.id === id);
  }

  summary(): PluginDirectorySummary {
    return this.list().summary;
  }
}
