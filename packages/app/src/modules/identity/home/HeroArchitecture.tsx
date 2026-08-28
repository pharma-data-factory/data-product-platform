import { useState } from 'react';
import { useLandingI18n } from '../landingI18n';
import { ConnectionLines } from './ConnectionLines';
import { PlatformCore } from './PlatformCore';
import { PlatformDashboard } from './PlatformDashboard';
import { ProtocolNode, SystemNode } from './SystemNode';
import type { NxIconName } from './icons';

const SYSTEMS: readonly {
  id: 'erp' | 'mes' | 'lims' | 'ewm' | 'historian' | 'cdmo';
  icon: NxIconName;
  optional?: boolean;
}[] = [
  { id: 'erp', icon: 'erp' },
  { id: 'mes', icon: 'mes' },
  { id: 'lims', icon: 'lims', optional: true },
  { id: 'ewm', icon: 'ewm' },
  { id: 'historian', icon: 'historian', optional: true },
  { id: 'cdmo', icon: 'cmo', optional: true },
];

const PROTOCOLS: readonly {
  id: 'apis' | 'events' | 'mqtt' | 'rest' | 'files';
  icon: NxIconName;
  optional?: boolean;
}[] = [
  { id: 'apis', icon: 'apis' },
  { id: 'events', icon: 'events', optional: true },
  { id: 'mqtt', icon: 'mqtt' },
  { id: 'rest', icon: 'rest', optional: true },
  { id: 'files', icon: 'files', optional: true },
];

export function HeroArchitecture() {
  const { t } = useLandingI18n();
  const [active, setActive] = useState<string | null>(null);
  const left = SYSTEMS.slice(0, 3);
  const right = SYSTEMS.slice(3);
  const activate = (id: string) => setActive(id);
  const clear = () => setActive(null);

  return (
    <div className="nx-arch" aria-label={t.hero.sceneLabel}>
      <ConnectionLines active={active} />
      <div className="nx-arch-left">
        {left.map(node => (
          <SystemNode
            key={node.id}
            id={node.id}
            icon={node.icon}
            optional={node.optional}
            label={t.hero.orbit[node.id]}
            active={active === node.id}
            onActivate={activate}
            onClear={clear}
          />
        ))}
      </div>
      <div className="nx-arch-stage">
        <div className="nx-dash-wrap nx-optional">
          <PlatformDashboard
            label={t.hero.overlayTitle}
            nav={t.hero.dashboardNav}
            metrics={t.hero.metrics}
          />
        </div>
        <PlatformCore
          active={active === 'mqtt' || active === 'core'}
          label={t.hero.coreLabel}
          layers={t.hero.coreLayers}
        />
      </div>
      <div className="nx-arch-right">
        {right.map(node => (
          <SystemNode
            key={node.id}
            id={node.id}
            icon={node.icon}
            optional={node.optional}
            label={t.hero.orbit[node.id]}
            active={active === node.id}
            onActivate={activate}
            onClear={clear}
          />
        ))}
      </div>
      <div className="nx-protocols" aria-label={t.hero.protocolLabel}>
        {PROTOCOLS.map(item => (
          <ProtocolNode
            key={item.id}
            id={item.id}
            icon={item.icon}
            optional={item.optional}
            label={t.hero.orbit[item.id]}
            active={active === item.id}
            onActivate={activate}
            onClear={clear}
          />
        ))}
      </div>
    </div>
  );
}
