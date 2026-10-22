import { randomBytes } from 'node:crypto'
import { eq } from 'drizzle-orm'
import type { Auth } from '../auth'
import type { Database } from '../db/client'
import { users } from '../db/schema'

export interface BootstrapOwner {
  userId: string
  /** Set only when this call created the account. Shown once; Better Auth stores a hash. */
  password?: string | undefined
}

/**
 * Finds the person who will own the bootstrapped project, or creates their account.
 *
 * Both outcomes are legitimate on a fresh install. Someone who already opened
 * the dashboard and signed up has an account and needs only the membership; an
 * operator running the command first has neither. Creating the account through
 * Better Auth rather than inserting a row keeps password hashing and the
 * sign-up rules in one place.
 */
export async function resolveBootstrapOwner(
  db: Database,
  auth: Auth,
  email: string,
): Promise<BootstrapOwner> {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1)
  if (existing) return { userId: existing.id }

  // Generated rather than read from the command line: an argument lands in shell
  // history and in `ps`, and 18 random bytes is not something to type anyway.
  const password = randomBytes(18).toString('base64url')
  const created = await auth.api.signUpEmail({
    body: { email, password, name: email.split('@')[0] ?? email },
  })
  return { userId: created.user.id, password }
}
