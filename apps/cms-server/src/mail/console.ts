import type { MailMessage, MailTransport } from './transport'

/**
 * Prints the message to stdout instead of sending it.
 *
 * The default, so a fresh self-hosted instance can invite someone and reset a
 * password with nothing configured. Framed and unmistakable in a log stream:
 * whoever runs the server is now the delivery mechanism, and has to be able to
 * find the link.
 */
export function createConsoleTransport(): MailTransport {
  return {
    name: 'console',
    async send(message: MailMessage): Promise<void> {
      const rule = '-'.repeat(72)
      console.info(
        [
          rule,
          `[ainam] Mail not sent — MAIL_TRANSPORT is "console". Copy the link below.`,
          `To:      ${message.to}`,
          `Subject: ${message.subject}`,
          '',
          message.text,
          rule,
        ].join('\n'),
      )
    },
  }
}
