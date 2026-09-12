import { NX } from './icons';
import { C, PHARMA_NAVY } from '../landingTokens';

export const HomeStyles = () => (
  <style>{`
    /* Hero chrome stays navy+cyan; scoped under .pdf-root / .nx-hero (not global :root). */
    .pdf-root, .nx-hero {
      --nx-bg: ${NX.bg};
      --nx-bg-deep: ${NX.bgDeep};
      --nx-surface: ${NX.surface};
      --nx-surface-2: ${NX.surface2};
      --nx-cyan: ${NX.cyan};
      --nx-cyan-bright: ${NX.cyanBright};
      --nx-cyan-soft: ${NX.cyanSoft};
      --nx-text: ${NX.text};
      --nx-text-muted: ${NX.muted};
      --nx-border: ${NX.border};
      --nx-border-strong: ${NX.borderStrong};
    }
    .nx-hero {
      position: relative;
      min-height: 720px;
      padding: 132px 24px 72px;
      overflow: hidden;
      color: var(--nx-text);
    }
    .nx-hero-grid {
      position: absolute;
      inset: 0;
      opacity: 0.55;
      pointer-events: none;
    }
    .nx-hero-glow {
      position: absolute;
      border-radius: 50%;
      filter: blur(90px);
      opacity: .22;
      pointer-events: none;
    }
    .nx-hero-glow-a { width: 420px; height: 420px; top: 40px; left: -80px; background: var(--nx-cyan); }
    .nx-hero-glow-b { width: 360px; height: 360px; top: 180px; right: -60px; background: #1E3A5F; }
    .nx-hero-layout {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: minmax(0, 0.85fr) minmax(620px, 1.15fr);
      gap: 40px;
      align-items: center;
      max-width: 1280px;
      margin: 0 auto;
    }
    .nx-eyebrow {
      color: var(--nx-cyan);
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      margin: 0 0 20px;
    }
    .nx-hero-title {
      font-size: clamp(38px, 4.6vw, 64px);
      font-weight: 700;
      line-height: 1.08;
      margin: 0;
      max-width: 14ch;
      color: var(--nx-text);
    }
    .nx-hero-accent { color: var(--nx-cyan); }
    .nx-hero-body {
      margin: 24px 0 0;
      font-size: 18px;
      line-height: 1.7;
      max-width: 540px;
      color: var(--nx-text-muted);
    }
    .nx-hero-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin-top: 36px;
    }
    .nx-hero-more {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 20px;
      color: var(--nx-cyan);
      font-weight: 600;
      text-decoration: none;
      font-size: 15px;
    }
    .nx-arch {
      position: relative;
      display: grid;
      grid-template-columns: 104px minmax(0, 1fr) 104px;
      grid-template-rows: auto minmax(220px, 1fr) auto;
      gap: 12px 8px;
      min-height: 560px;
      isolation: isolate;
    }
    .nx-lines {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 0;
    }
    .nx-flow-base {
      filter: drop-shadow(0 0 3px rgba(26,196,182,.2));
    }
    .nx-flow-dash {
      stroke-dasharray: 7 18;
      filter: drop-shadow(0 0 4px rgba(34,211,238,.45));
    }
    .nx-flow-packet {
      filter: drop-shadow(0 0 6px rgba(128,234,214,.9));
    }
    .nx-flow-off .nx-flow-packet {
      opacity: 0;
    }
    .nx-flow-strong .nx-flow-dash {
      filter: drop-shadow(0 0 7px rgba(34,211,238,.7));
    }
    .nx-arch-left, .nx-arch-right {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      gap: 18px;
      z-index: 2;
      padding: 48px 0 8px;
    }
    .nx-arch-left { grid-column: 1; grid-row: 1 / 3; }
    .nx-arch-right { grid-column: 3; grid-row: 1 / 3; }
    .nx-arch-stage {
      grid-column: 2;
      grid-row: 1 / 3;
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      min-height: 420px;
      z-index: 2;
      padding-top: 8px;
      gap: 16px;
    }
    .nx-dash-wrap {
      width: min(100%, 360px);
      margin-bottom: 0;
      z-index: 1;
      flex: 0 0 auto;
    }
    .nx-dashboard {
      display: grid;
      grid-template-columns: 108px minmax(0, 1fr);
      background: linear-gradient(180deg, #122033 0%, #0b1726 100%);
      border: 1px solid var(--nx-border-strong);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 18px 40px rgba(0,0,0,0.38);
      color: var(--nx-text);
    }
    .nx-dash-nav {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 14px 10px;
      background: rgba(4, 16, 28, 0.72);
      border-right: 1px solid var(--nx-border);
      font-size: 10px;
      letter-spacing: 0.02em;
      color: var(--nx-text-muted);
    }
    .nx-dash-nav-active { color: var(--nx-cyan-bright); font-weight: 700; }
    .nx-dash-main { padding: 12px 12px 10px; }
    .nx-dash-kicker {
      margin: 0 0 8px;
      font-size: 10px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--nx-cyan);
      font-weight: 700;
    }
    .nx-dash-metrics {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .nx-dash-metric {
      background: rgba(19, 38, 58, 0.7);
      border: 1px solid var(--nx-border);
      border-radius: 10px;
      padding: 8px;
    }
    .nx-dash-metric-label, .nx-dash-metric-hint {
      display: block;
      font-size: 10px;
      color: var(--nx-text-muted);
    }
    .nx-dash-metric strong {
      display: block;
      font-size: 18px;
      line-height: 1.2;
      margin: 2px 0;
    }
    .nx-dash-chart { width: 100%; height: 48px; margin-top: 8px; display: block; }
    .nx-core {
      position: relative;
      width: min(100%, 360px);
      margin: 0 auto 8px;
      z-index: 4;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .nx-core-stack {
      position: relative;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .nx-slab {
      position: relative;
      width: 100%;
      min-height: 44px;
      padding: 12px 16px;
      border-radius: 14px;
      border: 1px solid var(--nx-border-strong);
      background: linear-gradient(180deg, #1b3552 0%, #0c1d30 100%);
      box-shadow: 0 10px 22px rgba(0,0,0,0.28), inset 0 1px 0 rgba(94,234,212,0.18);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .nx-slab-label {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: rgba(248, 250, 252, 0.96);
      pointer-events: none;
      text-align: center;
      line-height: 1.35;
    }
    .nx-slab-1 { z-index: 3; }
    .nx-slab-2 { z-index: 2; opacity: 0.96; }
    .nx-slab-3 { z-index: 1; opacity: 0.9; }
    .nx-core-lockup {
      position: relative;
      z-index: 6;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
      padding: 10px 22px 10px 12px;
      border-radius: 18px;
      background: rgba(5, 16, 28, 0.96);
      border: 1px solid rgba(94, 228, 240, 0.65);
      box-shadow: 0 12px 28px rgba(0,0,0,0.45), 0 0 22px rgba(34,211,238,0.28);
    }
    .nx-core-wordmark {
      color: #F8FAFC;
      font-family: 'Space Grotesk', Inter, sans-serif;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 0.16em;
      line-height: 1;
    }
    .nx-core-label {
      color: var(--nx-text-muted);
      font-size: 11px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      font-weight: 700;
    }
    .nx-core-active .nx-slab {
      box-shadow: 0 16px 30px rgba(0,0,0,0.32), 0 0 24px rgba(34,211,238,0.28), inset 0 1px 0 rgba(94,234,212,0.3);
    }
    .nx-protocols {
      grid-column: 1 / 4;
      grid-row: 3;
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 10px;
      z-index: 2;
    }
    .nx-system-btn, .nx-protocol {
      transition: transform .25s ease, border-color .25s ease, box-shadow .25s ease;
    }
    .nx-system-btn:hover, .nx-protocol:hover {
      transform: translateY(-2px);
      border-color: var(--nx-border-strong) !important;
    }
    .nx-why {
      padding: 96px 24px;
      background: ${C.section};
    }
    .nx-why-inner {
      max-width: 1280px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: minmax(0, 0.38fr) minmax(0, 0.62fr);
      gap: 48px;
      align-items: start;
    }
    .nx-why-eyebrow {
      color: ${NX.cyan};
      font-size: 12px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      margin: 0 0 16px;
    }
    .nx-why-title {
      margin: 0;
      font-size: clamp(28px, 4vw, 40px);
      font-weight: 600;
      line-height: 1.2;
      color: ${PHARMA_NAVY};
    }
    .nx-why-body {
      margin: 16px 0 0;
      font-size: 17px;
      line-height: 1.7;
      color: #475569;
    }
    .nx-why-cards {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .nx-benefit {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 8px 24px rgba(11,31,58,0.04);
      transition: transform .3s ease, box-shadow .3s ease;
    }
    .nx-benefit:hover {
      transform: translateY(-3px);
      box-shadow: 0 14px 28px rgba(11,31,58,0.08);
    }
    .nx-benefit-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${NX.cyan};
      background: rgba(0,194,217,0.1);
      border: 1px solid rgba(0,194,217,0.22);
    }
    @media (prefers-reduced-motion: no-preference) {
      .nx-dash-wrap { animation: nx-float 7s ease-in-out infinite; }
      .nx-core .nx-slab-1 { animation: nx-glow 6s ease-in-out infinite; }
      .nx-flow-on .nx-flow-dash {
        animation: nx-dataflow var(--nx-flow-dur, 2.4s) linear infinite;
        animation-delay: var(--nx-flow-delay, 0s);
      }
    }
    @keyframes nx-float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
    @keyframes nx-glow {
      0%, 100% { box-shadow: 0 16px 30px rgba(0,0,0,0.32), inset 0 1px 0 rgba(94,234,212,0.18); }
      50% { box-shadow: 0 16px 30px rgba(0,0,0,0.32), 0 0 18px rgba(34,211,238,0.22), inset 0 1px 0 rgba(94,234,212,0.28); }
    }
    @keyframes nx-dataflow {
      to { stroke-dashoffset: -25; }
    }
    @media (max-width: 1199px) {
      .nx-hero { min-height: 0; }
      .nx-hero-layout { grid-template-columns: 1fr; }
      .nx-hero-title { max-width: none; font-size: clamp(38px, 6vw, 52px); }
      .nx-arch { min-height: 480px; }
    }
    @media (max-width: 767px) {
      .nx-hero { padding: 112px 20px 48px; }
      .nx-hero-title { font-size: clamp(38px, 9vw, 44px); }
      .nx-arch {
        grid-template-columns: 84px minmax(0, 1fr) 84px;
        min-height: 360px;
      }
      .nx-optional { display: none !important; }
      .nx-lines .lims, .nx-lines .historian, .nx-lines .cdmo,
      .nx-lines .events, .nx-lines .rest, .nx-lines .files { display: none; }
      .nx-arch-left, .nx-arch-right { padding-top: 8px; }
      .nx-protocols { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .nx-why-inner { grid-template-columns: 1fr; gap: 32px; }
      .nx-why-cards { grid-template-columns: 1fr; }
      .nx-core-label { display: none; }
      .nx-core-wordmark { font-size: 18px; letter-spacing: 0.12em; }
    }
    @media (prefers-reduced-motion: reduce) {
      .nx-dash-wrap, .nx-core .nx-slab-1, .nx-flow-dash { animation: none !important; }
      .nx-flow-dash { stroke-dasharray: none; }
      .nx-flow-packet { display: none; }
      .nx-benefit, .nx-system-btn, .nx-protocol { transition: none; }
    }
  `}</style>
);
