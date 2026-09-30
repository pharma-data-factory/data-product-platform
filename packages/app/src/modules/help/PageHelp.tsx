import type { ReactNode } from 'react';
import { Link } from '@backstage/core-components';
import { Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';
import { withAlpha } from '@internal/plugin-nexora-common';

/**
 * NXD-103. Where a page sits in the journey, what it does, and where to go
 * next — on the page, not only in a docs site nobody could find.
 *
 * Build, Compose and Products were three peers in one menu and read as three
 * alternatives. They are two ways to build and one step after it; the strip
 * says so on each of them.
 */

export type JourneyStep = 'build' | 'release' | 'operate';

const STEPS: Array<{ id: JourneyStep; label: string; to: string }> = [
  { id: 'build', label: 'Build', to: '/build' },
  { id: 'release', label: 'Release', to: '/products' },
  { id: 'operate', label: 'Operate', to: '/my-products' },
];

const useStyles = makeStyles(theme => ({
  // A card surface of its own: Nexora pages sit on a dark background while
  // the theme's text colour is dark, and a translucent box inherited both —
  // dark on near-black, found by looking at the first render.
  root: {
    background: theme.palette.background.paper,
    border: `1px solid ${withAlpha(theme.palette.primary.main, 0.25)}`,
    color: theme.palette.text.primary,
    borderRadius: 12,
    marginBottom: 16,
    padding: '12px 16px',
  },
  journey: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    listStyle: 'none',
    margin: '0 0 8px',
    padding: 0,
  },
  step: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    padding: '2px 10px',
  },
  current: {
    background: theme.palette.primary.main,
    borderColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
  },
  arrow: { color: theme.palette.text.secondary, fontSize: 12 },
  summary: { alignItems: 'flex-start', display: 'flex', gap: 8 },
  icon: { color: theme.palette.text.secondary, marginTop: 1 },
  text: { fontSize: 14 },
  links: { display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 6 },
  link: { fontSize: 13, fontWeight: 600 },
}));

export function PageHelp({
  step,
  children,
  links,
}: {
  step: JourneyStep;
  /** One or two sentences: what this page does. */
  children: ReactNode;
  links: Array<{ label: string; to: string }>;
}) {
  const classes = useStyles();
  return (
    <section className={classes.root} aria-label="About this page">
      <ol className={classes.journey} aria-label="Where this page fits">
        {STEPS.map((item, index) => (
          <li key={item.id} style={{ display: 'contents' }}>
            {index > 0 && (
              <span className={classes.arrow} aria-hidden>
                →
              </span>
            )}
            {item.id === step ? (
              <span className={`${classes.step} ${classes.current}`} aria-current="step">
                {item.label}
              </span>
            ) : (
              <Link className={classes.step} to={item.to}>
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
      <div className={classes.summary}>
        <HelpOutlineIcon fontSize="small" className={classes.icon} aria-hidden />
        <div>
          <Typography className={classes.text}>{children}</Typography>
          <div className={classes.links}>
            {links.map(link => (
              <Link key={link.to} className={classes.link} to={link.to}>
                {link.label} →
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
