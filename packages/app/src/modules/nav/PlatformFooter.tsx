import { useEffect, useState } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { discoveryApiRef } from '@backstage/core-plugin-api';
import Tooltip from '@material-ui/core/Tooltip';

interface ServiceStatus {
  name: string;
  pluginId: string;
  healthPath: string;
  llmField?: string;
}

const SERVICES: ServiceStatus[] = [
  { name: 'Backend', pluginId: 'composer', healthPath: '/health' },
  { name: 'AI / LLM', pluginId: 'composer', healthPath: '/health', llmField: 'llmEnabled' },
  { name: 'URS Composer', pluginId: 'urs-composer', healthPath: '/health' },
];

function statusDotColor(ok: boolean | null): string {
  if (ok === null) {
    return '#94A3B8';
  }
  if (ok) {
    return '#22C55E';
  }
  return '#EF4444';
}

function statusDotText(label: string, ok: boolean | null): string {
  if (ok === null) {
    return `${label}: checking…`;
  }
  if (ok) {
    return `${label}: OK`;
  }
  return `${label}: Down`;
}

function StatusDot({ label, ok }: { label: string; ok: boolean | null }) {
  const color = statusDotColor(ok);
  const text = statusDotText(label, ok);

  return (
    <Tooltip title={text} placement="top">
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'default' }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: color,
            display: 'inline-block',
            boxShadow: `0 0 3px ${color}`,
          }}
        />
        <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}>
          {label}
        </span>
      </div>
    </Tooltip>
  );
}

export function PlatformFooter() {
  const discoveryApi = useApi(discoveryApiRef);
  const [statuses, setStatuses] = useState<Record<string, boolean | null>>({});

  useEffect(() => {
    let active = true;

    const check = async () => {
      const next: Record<string, boolean | null> = {};
      for (const svc of SERVICES) {
        const key = svc.llmField ? `${svc.name}` : svc.name;
        try {
          const baseUrl = await discoveryApi.getBaseUrl(svc.pluginId);
          const res = await fetch(`${baseUrl}${svc.healthPath}`);
          if (!active) return;
          if (res.ok && svc.llmField) {
            const data = (await res.json()) as Record<string, unknown>;
            next[key] = data[svc.llmField] === true;
          } else {
            next[key] = res.ok;
          }
        } catch {
          if (active) next[key] = false;
        }
      }
      if (active) setStatuses(next);
    };

    check();
    const interval = setInterval(check, 60_000);
    return () => { active = false; clearInterval(interval); };
  }, [discoveryApi]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 28,
        background: '#0F172A',
        borderTop: '1px solid #1E293B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 16,
        padding: '0 16px',
        zIndex: 1200,
      }}
    >
      {SERVICES.map(svc => {
        const key = svc.llmField ? svc.name : svc.name;
        return <StatusDot key={key} label={svc.name} ok={statuses[key] ?? null} />;
      })}
      <span style={{ fontSize: 10, color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}>
        Nexora v0.1
      </span>
    </div>
  );
}
