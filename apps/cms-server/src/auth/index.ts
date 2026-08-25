import { ROLE_DESCRIPTIONS, isAinamRole } from '@ainam/schema'
import { accessControl, roles } from '@ainam/schema/access'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { organization } from 'better-auth/plugins'
import type { Database } from '../db/client'
import type { Env } from '../env'
import type { MailTransport } from '../mail'
import { invitationMessage, passwordResetMessage } from '../mail/messages'
import { refuseUninvitedSignUp } from './signup'

/** Long enough for someone to notice the mail, short enough to expire a stale one. */
const INVITATION_TTL_SECONDS = 7 * 24 * 60 * 60

/**
 * Builds the auth instance.
 *
 * A factory rather than a module-level singleton so tests can point it at a
 * throwaway database, and so nothing connects as a side effect of an import.
 *
 * `usePlural` matches the table naming the rest of our schema already uses.
 * `camelCase` stays at its default, which produces snake_case columns — also
 * ours. Both settings shape the generated tables, so changing either after the
 * first migration ships is a data migration on a customer's database.
 */
export function createAuth(env: Env, db: Database, mailer: MailTransport) {
  return betterAuth({
    appName: 'AINAM',
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [env.DASHBOARD_ORIGIN],
    database: drizzleAdapter(db, {
      provider: 'pg',
      usePlural: true,
      transaction: true,
    }),
    emailAndPassword: {
      enabled: true,
      sendResetPassword: async ({ user, url }) => {
        await mailer.send(passwordResetMessage({ to: user.email, url }))
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            if (env.SIGNUP_MODE === 'invite-only') await refuseUninvitedSignUp(db, user.email)
          },
        },
      },
    },
    session: {
      // Signed cookie cache: an admin request reads the session from the cookie
      // instead of Postgres. Short-lived, so a revoked session dies quickly.
      cookieCache: { enabled: true, maxAge: 60 },
    },
    // Stated rather than relied upon: CLAUDE.md forbids telemetry without an
    // explicit opt-in, and a self-hoster should see the answer in our config
    // rather than have to check the library's defaults.
    telemetry: { enabled: false },
    plugins: [
      organization({
        // Our own roles replace the plugin's owner/admin/member set, so a role
        // an invitation can carry is always a role our routes recognise.
        ac: accessControl,
        roles,
        creatorRole: 'owner',
        invitationExpiresIn: INVITATION_TTL_SECONDS,
        sendInvitationEmail: async (data) => {
          await mailer.send(
            invitationMessage({
              to: data.email,
              organizationName: data.organization.name,
              inviterName: data.inviter.user.name || data.inviter.user.email,
              roleName: isAinamRole(data.role)
                ? ROLE_DESCRIPTIONS[data.role].name.toLowerCase()
                : data.role,
              url: `${env.DASHBOARD_ORIGIN}/accept-invitation/${data.id}`,
              expiresAt: data.invitation.expiresAt,
            }),
          )
        },
      }),
    ],
  })
}

export type Auth = ReturnType<typeof createAuth>
