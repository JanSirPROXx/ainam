import { createAccessControl } from 'better-auth/plugins/access'
import { defaultStatements, memberAc, ownerAc } from 'better-auth/plugins/organization/access'
import { AINAM_STATEMENTS, ROLE_STATEMENTS } from './roles'

/**
 * The permission model in the shape Better Auth wants it.
 *
 * Built once here rather than in each app: the server enforces these roles on
 * the organisation endpoints, and the dashboard's auth client needs the same
 * definitions or it types `inviteMember` against Better Auth's built-in roles
 * and refuses to send an invitation for one of ours.
 *
 * Merged with the plugin's own statements, not substituted for them. The
 * organisation plugin authorises its endpoints against `invitation:create`,
 * `member:delete` and the rest of its own set, so an access control carrying
 * only AINAM's resources leaves an owner unable to invite anyone — with a 403
 * from inside the library that points at nothing in our code.
 *
 * Imported through `@ainam/schema/access`, which is the only entry point that
 * pulls in Better Auth — the published SDK reads `@ainam/schema/types` and
 * never reaches this file.
 */
export const accessControl = createAccessControl({ ...defaultStatements, ...AINAM_STATEMENTS })

export const roles = {
  // Everything the plugin's own owner can do, plus everything AINAM defines.
  owner: accessControl.newRole({ ...ownerAc.statements, ...ROLE_STATEMENTS.owner }),
  // The plugin's plain member — no invitations, no removals — plus editing and
  // publishing content. That split is the agency handover.
  editor: accessControl.newRole({ ...memberAc.statements, ...ROLE_STATEMENTS.editor }),
}
