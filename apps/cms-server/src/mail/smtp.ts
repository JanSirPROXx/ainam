import { createTransport } from 'nodemailer'
import type { MailMessage, MailTransport } from './transport'

/**
 * Sends through an SMTP server.
 *
 * Configured by URL — `smtps://user:pass@host:465` — so any provider is an
 * environment change rather than a code change, and no AINAM-specific account
 * is ever required.
 */
export function createSmtpTransport(url: string, from: string): MailTransport {
  const transport = createTransport(url)

  return {
    name: 'smtp',
    async send(message: MailMessage): Promise<void> {
      await transport.sendMail({
        from,
        to: message.to,
        subject: message.subject,
        text: message.text,
      })
    },
  }
}
