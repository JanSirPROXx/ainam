/**
 * How AINAM sends mail.
 *
 * A port rather than a direct nodemailer call, because the self-hosted default
 * must be "no SMTP required": a clean `docker compose up` has no mail server,
 * and requiring one would break the no-external-accounts rule. The console
 * transport satisfies the same interface, so nothing above this layer knows
 * whether a message was delivered or printed.
 */
export interface MailMessage {
  to: string
  subject: string
  /** Plain text. Nothing AINAM sends needs layout, and HTML mail needs testing. */
  text: string
}

export interface MailTransport {
  readonly name: 'console' | 'smtp'
  send(message: MailMessage): Promise<void>
}
