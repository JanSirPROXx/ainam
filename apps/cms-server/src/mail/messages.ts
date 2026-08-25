import type { MailMessage } from './transport'

/**
 * The two messages AINAM sends.
 *
 * Written the way the rest of the product is: second person, the mechanism
 * before the consequence, and the link on its own line so it survives every
 * mail client that has ever mangled one.
 */
export function invitationMessage(input: {
  to: string
  organizationName: string
  inviterName: string
  roleName: string
  url: string
  expiresAt: Date
}): MailMessage {
  return {
    to: input.to,
    subject: `Edit the content of ${input.organizationName}`,
    text: [
      `${input.inviterName} added you to ${input.organizationName} in AINAM as ${input.roleName}.`,
      '',
      'Open this link to accept:',
      input.url,
      '',
      `The link stops working on ${input.expiresAt.toISOString().slice(0, 10)}.`,
      'If you were not expecting this, ignore it — nothing happens until you open the link.',
    ].join('\n'),
  }
}

export function passwordResetMessage(input: { to: string; url: string }): MailMessage {
  return {
    to: input.to,
    subject: 'Set a new AINAM password',
    text: [
      'Open this link to choose a new password:',
      input.url,
      '',
      'The link works once and expires in an hour.',
      'If you did not ask for it, your password has not changed and nothing else is needed.',
    ].join('\n'),
  }
}
