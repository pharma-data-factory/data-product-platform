import {
  Content,
  Header,
  Page,
} from '@backstage/core-components';

export function PlatformGovernanceOverviewPage() {
  return (
    <Page themeId="service">
      <Header title="Platform Architecture & Governance" subtitle="How the platform is organized and governed" />
      <Content>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px' }}>
          {/* Intro */}
          <section style={{ marginBottom: 48 }}>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: '#475569', maxWidth: 800 }}>
              Pharma Data Factory provides a layered architecture for governing industrial Data Products.
              Use this overview to understand relationships between components, Golden Paths, Data Products,
              and how validation and governance fit together.
            </p>
          </section>

          {/* Architecture Layers */}
          <section style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 24, fontWeight: 600, color: '#0B1F3A', marginBottom: 24 }}>
              Platform Layers
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
              <div style={{
                border: '1px solid #E2E8F0',
                borderRadius: 12,
                padding: 20,
                background: '#F8FAFC',
              }}>
                <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: '#0B1F3A' }}>
                  Backstage Foundation
                </h3>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: '#475569' }}>
                  Open-source Control Plane: Catalog, Scaffolder, TechDocs, Search, Plugin architecture, Identity & RBAC.
                </p>
                <p style={{ margin: '12px 0 0', fontSize: 13, color: '#64748B' }}>
                  <a href="https://backstage.io" style={{ color: '#0D9488', textDecoration: 'none' }}>
                    Learn about Backstage →
                  </a>
                </p>
              </div>

              <div style={{
                border: '2px solid #0D9488',
                borderRadius: 12,
                padding: 20,
                background: 'rgba(13, 148, 136, 0.05)',
              }}>
                <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: '#0B1F3A' }}>
                  Pharma Data Factory
                </h3>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: '#475569' }}>
                  Industrial Data Product platform layer: Standard, SDK, Components, Contracts, Quality,
                  Compatibility, Golden Paths, Validation & Trust.
                </p>
              </div>

              <div style={{
                border: '1px solid #E2E8F0',
                borderRadius: 12,
                padding: 20,
                background: '#F8FAFC',
              }}>
                <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: '#0B1F3A' }}>
                  Governance & Validation
                </h3>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: '#475569' }}>
                  Traceability, evidence collection, change impact analysis, and formal validation readiness.
                </p>
              </div>
            </div>
          </section>

          {/* Key Workspaces */}
          <section style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 24, fontWeight: 600, color: '#0B1F3A', marginBottom: 24 }}>
              Key Workspaces & Functions
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              {[
                { label: 'Component Library', href: '/platform-components', desc: 'Reusable technical building blocks' },
                { label: 'Catalog', href: '/catalog', desc: 'System of record for products and relationships' },
                { label: 'Marketplace', href: '/marketplace', desc: 'Discover Golden Paths and templates' },
                { label: 'Create', href: '/create', desc: 'Generate new Data Products from templates' },
                { label: 'Data Products', href: '/data-products', desc: 'View all products, owners, and APIs' },
                { label: 'Validation Expert', href: '/validation-expert', desc: 'Evidence, traceability, and validation' },
              ].map(item => (
                <a
                  key={item.label}
                  href={item.href}
                  style={{
                    display: 'block',
                    padding: 20,
                    border: '1px solid #E2E8F0',
                    borderRadius: 12,
                    background: '#FFFFFF',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#0D9488';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0';
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#0D9488' }}>
                    {item.label}
                  </h3>
                  <p style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.5, color: '#475569' }}>
                    {item.desc}
                  </p>
                </a>
              ))}
            </div>
          </section>

          {/* Understanding Concepts */}
          <section style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 24, fontWeight: 600, color: '#0B1F3A', marginBottom: 24 }}>
              Key Concepts
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
              {[
                {
                  title: 'Platform Components',
                  desc: 'Reusable technical building blocks like REST API, MQTT Consumer, Health, Observability. Wave 1 components are CERTIFIED 1.0.0.'
                },
                {
                  title: 'Golden Paths',
                  desc: 'Certified compositions like MQTT Temperature, REST Equipment, OEE. Official templates for building Data Products.'
                },
                {
                  title: 'Data Products',
                  desc: 'Independent services generated from Golden Paths. Each has owner, contract, quality gates, API, and lifecycle.'
                },
                {
                  title: 'Composition',
                  desc: 'Declares which Platform Components a Data Product uses. Composition manifest is version-controlled.'
                },
                {
                  title: 'Technical Certification',
                  desc: 'DEVELOPMENT → TESTED → CERTIFIED. Means platform conformance only. Not GxP validation.'
                },
                {
                  title: 'Validation & Evidence',
                  desc: 'Technical evidence (tests, CI results, contracts) is created during delivery. Validation Expert connects evidence to requirements.'
                },
              ].map(item => (
                <div
                  key={item.title}
                  style={{
                    padding: 20,
                    border: '1px solid #E2E8F0',
                    borderRadius: 12,
                    background: '#F8FAFC',
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#0B1F3A' }}>
                    {item.title}
                  </h3>
                  <p style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.6, color: '#475569' }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Responsibility Model */}
          <section style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 24, fontWeight: 600, color: '#0B1F3A', marginBottom: 24 }}>
              Responsibility Model
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
              <div style={{
                padding: 24,
                border: '1px solid #E2E8F0',
                borderRadius: 12,
                background: '#FFFFFF',
              }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: '#0B1F3A' }}>
                  Pharma Data Factory Standardizes
                </h3>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.8, color: '#475569' }}>
                  <li>Reusable technical components</li>
                  <li>Golden Path structure and CI/CD</li>
                  <li>Contracts and quality conventions</li>
                  <li>Compatibility validation</li>
                  <li>Version metadata</li>
                  <li>Composition patterns</li>
                </ul>
              </div>

              <div style={{
                padding: 24,
                border: '1px solid #E2E8F0',
                borderRadius: 12,
                background: '#FFFFFF',
              }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: '#0B1F3A' }}>
                  Product Team Owns
                </h3>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.8, color: '#475569' }}>
                  <li>Intended use and business purpose</li>
                  <li>Domain-specific requirements</li>
                  <li>Business logic implementation</li>
                  <li>Plant and source-system integration</li>
                  <li>Infrastructure and security</li>
                  <li>Risk assessment</li>
                  <li>Validation acceptance</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Governance Dashboard */}
          <section style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 24, fontWeight: 600, color: '#0B1F3A', marginBottom: 24 }}>
              Admin Dashboard & Monitoring
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
              <div style={{
                padding: 24,
                border: '1px solid #E2E8F0',
                borderRadius: 12,
                background: '#FFFFFF',
              }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600, color: '#0B1F3A' }}>
                  Component Lifecycle
                </h3>
                <p style={{ margin: '0 0 12px', fontSize: 13, lineHeight: 1.6, color: '#475569' }}>
                  Track platform components from DEVELOPMENT → TESTED → CERTIFIED. Monitor status changes and compatibility impacts.
                </p>
                <p style={{ margin: 0 }}>
                  <a href="/platform-components" style={{ color: '#0D9488', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                    Open Component Library →
                  </a>
                </p>
              </div>

              <div style={{
                padding: 24,
                border: '1px solid #E2E8F0',
                borderRadius: 12,
                background: '#FFFFFF',
              }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600, color: '#0B1F3A' }}>
                  Data Product Status
                </h3>
                <p style={{ margin: '0 0 12px', fontSize: 13, lineHeight: 1.6, color: '#475569' }}>
                  Monitor all Data Products: Implementation status, Release status, Validation readiness. View composition dependencies.
                </p>
                <p style={{ margin: 0 }}>
                  <a href="/data-products" style={{ color: '#0D9488', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                    Open Data Products →
                  </a>
                </p>
              </div>

              <div style={{
                padding: 24,
                border: '1px solid #E2E8F0',
                borderRadius: 12,
                background: '#FFFFFF',
              }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600, color: '#0B1F3A' }}>
                  Validation Evidence
                </h3>
                <p style={{ margin: '0 0 12px', fontSize: 13, lineHeight: 1.6, color: '#475569' }}>
                  Central place for traceability, test results, requirements verification, and formal validation sign-off.
                </p>
                <p style={{ margin: 0 }}>
                  <a href="/validation-expert" style={{ color: '#0D9488', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                    Open Validation Expert →
                  </a>
                </p>
              </div>
            </div>
          </section>

          {/* Status Model */}
          <section style={{ marginBottom: 48, padding: '24px', background: 'rgba(13, 148, 136, 0.08)', border: '1px solid #0D9488', borderRadius: 12 }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600, color: '#0B1F3A' }}>
              Status Model: Four Independent Dimensions
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              {[
                { title: 'Implementation', values: 'DEVELOPMENT → TESTED → CERTIFIED' },
                { title: 'Release', values: 'DRAFT → TESTING → RELEASED → RETIRED' },
                { title: 'Commercial', values: 'AVAILABLE, PLANNED, FUTURE, BLOCKED' },
                { title: 'Validation', values: 'NOT VALIDATED → GxP VALIDATED' },
              ].map(item => (
                <div key={item.title} style={{
                  padding: 16,
                  background: '#FFFFFF',
                  borderRadius: 8,
                  border: '1px solid #E2E8F0',
                }}>
                  <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: '#0D9488', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                    {item.title}
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                    {item.values}
                  </p>
                </div>
              ))}
            </div>
            <p style={{ margin: '16px 0 0', fontSize: 12, color: '#64748B', lineHeight: 1.6 }}>
              <strong>Important:</strong> These dimensions must never be collapsed. A CERTIFIED component is not GxP VALIDATED. 
              A RELEASED product may be PLANNED for commercial availability. Status model clarity prevents validation confusion.
            </p>
          </section>

          {/* More Info */}
          <section style={{ marginBottom: 48, padding: '32px', background: '#F8FAFC', borderRadius: 12 }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600, color: '#0B1F3A' }}>
              Learn More
            </h2>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: '#475569' }}>
              <a href="/platform/architecture" style={{ color: '#0D9488', textDecoration: 'none', fontWeight: 600 }}>
                View the full public architecture story →
              </a>
            </p>
            <p style={{ margin: '12px 0 0', fontSize: 14, lineHeight: 1.6, color: '#475569' }}>
              <a href="/platform/architecture/developer" style={{ color: '#0D9488', textDecoration: 'none', fontWeight: 600 }}>
                Developer technical architecture →
              </a>
            </p>
            <p style={{ margin: '12px 0 0', fontSize: 14, lineHeight: 1.6, color: '#475569' }}>
              <a href="/developer" style={{ color: '#0D9488', textDecoration: 'none', fontWeight: 600 }}>
                Developer Hub (authenticated) →
              </a>
            </p>
          </section>
        </div>
      </Content>
    </Page>
  );
}
