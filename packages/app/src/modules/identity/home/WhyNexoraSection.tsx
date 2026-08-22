import { useLandingI18n } from '../landingI18n';
import { BenefitCard } from './SystemNode';
import type { NxIconName } from './icons';

const ICONS: readonly NxIconName[] = ['shield', 'puzzle', 'trend', 'lock'];

export function WhyNexoraSection() {
  const { t } = useLandingI18n();
  return (
    <section className="nx-why" aria-label={t.why.eyebrow}>
      <div className="nx-why-inner">
        <div className="nx-why-copy">
          <p className="pdf-mono nx-why-eyebrow">{t.why.eyebrow}</p>
          <h2 className="pdf-display nx-why-title">{t.why.title}</h2>
          <p className="nx-why-body">{t.why.body}</p>
          <p className="nx-why-body">{t.why.forWhom}</p>
        </div>
        <div className="nx-why-cards">
          {t.why.pillars.map((pillar, index) => (
            <BenefitCard
              key={pillar.title}
              title={pillar.title}
              body={pillar.body}
              icon={ICONS[index] ?? 'shield'}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
