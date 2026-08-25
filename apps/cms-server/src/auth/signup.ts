import { APIError } from 'better-auth/api'
import { and, eq, gt, sql } from 'drizzle-orm'
import type { Database } from '../db/client'
import { invitations, users } from '../db/schema'

/**
 * Refuses an account nobody asked for, when the instance is invite-only.
 *
 * Better Auth exposes sign-up publicly whenever email and password are enabled,
 * which is right for AINAM Cloud and wrong for a self-hosted server on the open
 * internet: anyone could register, and while they would reach no project, they
 * would sit in the customer's user table forever.
 *
 * The first account on an empty instance is always allowed. Requiring an
 * invitation for it would lock out the person who just installed the server,
 * since there is nobody to send one.
 */
export async function refuseUninvitedSignUp(db: Database, email: string): Promise<void> {
  const [existing] = await db.select({ id: users.id }).from(users).limit(1)
  if (!existing) return

  const [invited] = await db
    .select({ id: invitations.id })
    .from(invitations)
    .where(
      and(
        // Case-insensitive: an invitation sent to Ada@example.com has to match
        // the account the invited person then creates as ada@example.com.
        eq(sql`lower(${invitations.email})`, email.toLowerCase()),
        eq(invitations.status, 'pending'),
        gt(invitations.expiresAt, new Date()),
      ),
    )
    .limit(1)
  if (invited) return

  throw new APIError('FORBIDDEN', {
    message:
      'This AINAM server only creates accounts for invited people. Ask an owner to invite this ' +
      'address, then open the link they send you.',
  })
}
