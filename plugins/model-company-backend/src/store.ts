import fs from 'fs';
import path from 'path';
import type { UnsMessage } from './types';

export class FileSimulationStore {
  constructor(
    private readonly statePath: string,
    private readonly eventsPath: string,
  ) {}

  ensureDirs() {
    fs.mkdirSync(path.dirname(this.statePath), { recursive: true });
    fs.mkdirSync(path.dirname(this.eventsPath), { recursive: true });
  }

  loadState(): unknown | undefined {
    if (!fs.existsSync(this.statePath)) {
      return undefined;
    }
    return JSON.parse(fs.readFileSync(this.statePath, 'utf8'));
  }

  saveState(state: unknown) {
    this.ensureDirs();
    fs.writeFileSync(this.statePath, JSON.stringify(state, null, 2), 'utf8');
  }

  appendMessages(messages: UnsMessage[]) {
    if (messages.length === 0) {
      return;
    }
    this.ensureDirs();
    const lines = messages.map(m => JSON.stringify(m)).join('\n') + '\n';
    fs.appendFileSync(this.eventsPath, lines, 'utf8');
  }

  readMessages(limit = 100): UnsMessage[] {
    if (!fs.existsSync(this.eventsPath)) {
      return [];
    }
    const content = fs.readFileSync(this.eventsPath, 'utf8').trim();
    if (!content) {
      return [];
    }
    const lines = content.split('\n');
    return lines
      .slice(Math.max(0, lines.length - limit))
      .map(line => JSON.parse(line) as UnsMessage)
      .reverse();
  }

  clearMessages() {
    this.ensureDirs();
    fs.writeFileSync(this.eventsPath, '', 'utf8');
  }
}
