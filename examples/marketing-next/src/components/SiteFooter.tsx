import { Badge, Wordmark } from '@ainam/ui'
import { groupFooterLinks } from '@/lib/footer-groups'
import type { FooterLink } from '@/lib/footer-groups'

export interface SiteFooterProps {
  tagline: string
  status: { visible: boolean; label: string }
  links: FooterLink[]
}

export function SiteFooter({ tagline, status, links }: SiteFooterProps) {
  return (
    <footer className="footer">
      <div className="shell footer__grid">
        <div className="footer__brand">
          <Wordmark size={16} />
          <p className="footer__tagline">{tagline}</p>
          {status.visible ? (
            <div>
              <Badge tone="success" dot>
                {status.label}
              </Badge>
            </div>
          ) : null}
        </div>

        {groupFooterLinks(links).map(([group, entries]) => (
          <div key={group} className="footer__col">
            <span className="footer__heading">{group}</span>
            {entries.map((link) => (
              <a key={link.label + link.href} className="link" href={link.href}>
                {link.label}
              </a>
            ))}
          </div>
        ))}
      </div>

      <div className="shell footer__bottom">
        <span>© {new Date().getFullYear()} AINAM</span>
        <span>Open source — AGPL-3.0 and MIT</span>
      </div>
    </footer>
  )
}
