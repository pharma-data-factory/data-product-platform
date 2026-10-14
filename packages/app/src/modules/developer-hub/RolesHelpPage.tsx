import { useEffect, useState } from 'react';
import { Content, Link, Page } from '@backstage/core-components';
import { identityApiRef, useApi } from '@backstage/core-plugin-api';
import {
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import {
  DEMO_SEAT_HELP,
  DOMAIN_GROUP_HELP,
  PLATFORM_ROLE_HELP,
  ROLE_LABELS,
  SEGREGATION_OF_DUTIES,
  SIGN_IN_HELP,
  URS_DOMAIN_PERMISSIONS,
  VALIDATION_DOMAIN_PERMISSIONS,
  VALIDATION_EXPERT_GROUP,
  parseGroupName,
  resolvePlatformRole,
} from '@internal/platform-common';
import type { PlatformRole } from '@internal/platform-common';

/** The permissions a domain group adds, straight from the policy's table. */
function domainPermissions(group: string): readonly string[] {
  if (group === VALIDATION_EXPERT_GROUP) {
    return VALIDATION_DOMAIN_PERMISSIONS[VALIDATION_EXPERT_GROUP];
  }
  return (
    (URS_DOMAIN_PERMISSIONS as Record<string, readonly string[]>)[group] ?? []
  );
}

/** A seat's platform role and its approval roles, from its groups. */
export function describeGroups(memberOf: readonly string[]): {
  role: PlatformRole;
  domain: string[];
} {
  const refs = memberOf.map(g => `group:default/${g}`);
  const domain = memberOf
    .map(g => DOMAIN_GROUP_HELP.find(h => h.group === g)?.title)
    .filter((t): t is string => Boolean(t));
  return { role: resolvePlatformRole(refs), domain };
}

// index.html paints the canvas navy and MUI v4 injects above it, so
// CssBaseline's background.default never applies: on the light theme bare
// text would be near-black on navy. The page brings its own surface, from the
// theme, as the Validation Expert pages do (NXD-158).
const useStyles = makeStyles(theme => ({
  surface: {
    background: theme.palette.background.default,
    color: theme.palette.text.primary,
    minHeight: '100%',
  },
}));

function Section(props: {
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <Box component="section" aria-label={props.title} mt={4}>
      <Typography variant="h5" gutterBottom>
        {props.title}
      </Typography>
      {props.intro ? (
        <Typography variant="body2" color="textSecondary" paragraph>
          {props.intro}
        </Typography>
      ) : null}
      {props.children}
    </Box>
  );
}

/**
 * NXD-166. Roles & permissions, under Help & Docs.
 *
 * Two axes and the rules between them: the platform role says what a person
 * may do on the platform, an approval role what they may approve or sign,
 * and segregation of duties which act on a given record is theirs. Groups and
 * permissions are rendered from the policy's own tables; the words around
 * them are in `rolesHelp.ts`, where tests hold them to the code.
 */
export function RolesHelpPage() {
  const classes = useStyles();
  const identityApi = useApi(identityApiRef);
  const [mine, setMine] = useState<{ ref: string; groups: string[] } | null>(
    null,
  );

  useEffect(() => {
    identityApi.getBackstageIdentity().then(identity => {
      setMine({
        ref: identity.userEntityRef,
        groups: identity.ownershipEntityRefs
          .map(parseGroupName)
          .filter((g): g is string => Boolean(g)),
      });
    });
  }, [identityApi]);

  const me = mine ? describeGroups(mine.groups) : null;

  return (
    <Page themeId="documentation">
      <Content className={classes.surface}>
        <Typography variant="h3" component="h1" gutterBottom>
          Roles &amp; permissions
        </Typography>
        <Typography variant="body1" paragraph>
          Every person has a <strong>platform role</strong>, which decides what
          they may do on the platform, and may hold{' '}
          <strong>approval and signature roles</strong>, which decide what they
          may approve or sign. The two are independent. On top of both,{' '}
          <strong>segregation of duties</strong> decides which act on a
          particular record is theirs: no one approves or releases their own
          work.
        </Typography>

        <Section title="Your access">
          {mine && me ? (
            <Box aria-label="Your access summary">
              <Typography variant="body2">
                Signed in as <strong>{mine.ref}</strong> · platform role{' '}
                <strong>{ROLE_LABELS[me.role]}</strong>
                {me.domain.length > 0
                  ? ` · approval roles: ${me.domain.join(', ')}`
                  : ' · no approval or signature role'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Groups: {mine.groups.length ? mine.groups.join(', ') : 'none'}.
                Roles are granted in Admin → Users &amp; Roles.
              </Typography>
            </Box>
          ) : (
            <Typography variant="body2" color="textSecondary">
              Reading your sign-in…
            </Typography>
          )}
        </Section>

        <Section
          title="Platform roles"
          intro="One per person: if someone is in several platform groups, the highest decides, and the others add nothing. Viewer, Developer, Data Product Owner and Platform Admin each include the one before. Business Capability Lead is a side branch: Viewer plus capabilities and URS authoring."
        >
          <Table size="small" aria-label="Platform roles">
            <TableHead>
              <TableRow>
                <TableCell>Role</TableCell>
                <TableCell>Group</TableCell>
                <TableCell>What it is for</TableCell>
                <TableCell>Adds, among others</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {PLATFORM_ROLE_HELP.map(help => (
                <TableRow key={help.role}>
                  <TableCell>
                    <strong>{ROLE_LABELS[help.role]}</strong>
                  </TableCell>
                  <TableCell style={{ fontFamily: 'monospace' }}>
                    {help.group}
                  </TableCell>
                  <TableCell>{help.summary}</TableCell>
                  <TableCell>
                    {help.highlights.length === 0
                      ? '—'
                      : help.highlights.map(h => (
                          <Typography key={h.permission} variant="body2">
                            {h.text}{' '}
                            <span
                              style={{ fontFamily: 'monospace', opacity: 0.7 }}
                            >
                              ({h.permission})
                            </span>
                          </Typography>
                        ))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>

        <Section
          title="Approval and signature roles"
          intro="Added to a platform role, never instead of one. An administrator holds none of them by being an administrator."
        >
          <Table size="small" aria-label="Approval and signature roles">
            <TableHead>
              <TableRow>
                <TableCell>Role</TableCell>
                <TableCell>Group</TableCell>
                <TableCell>May</TableCell>
                <TableCell>Permissions it adds</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {DOMAIN_GROUP_HELP.map(help => (
                <TableRow key={help.group}>
                  <TableCell>
                    <strong>{help.title}</strong>
                  </TableCell>
                  <TableCell style={{ fontFamily: 'monospace' }}>
                    {help.group}
                  </TableCell>
                  <TableCell>{help.acts}</TableCell>
                  <TableCell>
                    <Box display="flex" flexWrap="wrap" style={{ gap: 4 }}>
                      {domainPermissions(help.group).map(p => (
                        <Chip
                          key={p}
                          size="small"
                          variant="outlined"
                          label={p}
                        />
                      ))}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>

        <Section
          title="Segregation of duties"
          intro="Checked by the server on every act, whatever the roles. A refusal names the rule."
        >
          <Table size="small" aria-label="Segregation of duties">
            <TableBody>
              {SEGREGATION_OF_DUTIES.map(rule => (
                <TableRow key={rule.area}>
                  <TableCell style={{ width: 180 }}>
                    <strong>{rule.area}</strong>
                  </TableCell>
                  <TableCell>{rule.rule}</TableCell>
                  <TableCell style={{ width: 160, opacity: 0.7 }}>
                    {rule.record ?? ''}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>

        <Section title="Signing in">
          <Table size="small" aria-label="Signing in">
            <TableHead>
              <TableRow>
                <TableCell>Sign-in</TableCell>
                <TableCell>Where</TableCell>
                <TableCell>Roles</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {SIGN_IN_HELP.map(s => (
                <TableRow key={s.method}>
                  <TableCell>
                    <strong>{s.method}</strong>
                  </TableCell>
                  <TableCell>{s.where}</TableCell>
                  <TableCell>{s.roles}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>

        <Section
          title="Demo seats"
          intro="On a test system each seat holds what one person in a regulated organisation would, so a URS approval, a validation decision and a release each need several sign-ins."
        >
          <Table size="small" aria-label="Demo seats">
            <TableHead>
              <TableRow>
                <TableCell>Seat</TableCell>
                <TableCell>Platform role</TableCell>
                <TableCell>Approval role</TableCell>
                <TableCell>Does in a walkthrough</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {DEMO_SEAT_HELP.map(seat => {
                const d = describeGroups(seat.memberOf);
                return (
                  <TableRow key={seat.name}>
                    <TableCell style={{ fontFamily: 'monospace' }}>
                      {seat.name}
                    </TableCell>
                    <TableCell>{ROLE_LABELS[d.role]}</TableCell>
                    <TableCell>{d.domain.join(', ') || '—'}</TableCell>
                    <TableCell>{seat.does}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Section>

        <Box mt={4}>
          <Link to="/developer">← Developer Hub</Link>
        </Box>
      </Content>
    </Page>
  );
}
