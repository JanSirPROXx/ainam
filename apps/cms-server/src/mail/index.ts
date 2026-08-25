import type { Env } from '../env'
import { createConsoleTransport } from './console'
import { createSmtpTransport } from './smtp'
import type { MailTransport } from './transport'

export type { MailMessage, MailTransport } from './transport'

/**
 * Builds the transport this instance sends through.
 *
 * `loadEnv` has already refused to start if SMTP was selected without a URL, so
 * there is no half-configured state to handle here.
 */
export function createMailer(env: Env): MailTransport {
  if (env.MAIL_TRANSPORT === 'smtp' && env.SMTP_URL) {
    return createSmtpTransport(env.SMTP_URL, env.MAIL_FROM)
  }
  return createConsoleTransport()
}
