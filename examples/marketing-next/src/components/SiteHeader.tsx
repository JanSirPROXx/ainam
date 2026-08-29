import { Button, Wordmark } from '@ainam/ui'
import { DASHBOARD_URL } from '@/lib/links'

export interface SiteHeaderProps {
  links: Array<{ label: string; href: string }>
  cta: string
}

/** Sticky top bar: wordmark, section links, sign-in, and the one call to action. */
export function SiteHeader({ links, cta }: SiteHeaderProps) {
  return (
    <header className="topbar">
      <div className="shell topbar__inner">
        <Wordmark size={16} />
        <nav className="topbar__nav">
          {links.map((link) => (
            <a key={link.href + link.label} className="link" href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        <div className="topbar__actions">
          <a className="link" href={DASHBOARD_URL}>
            Sign in
          </a>
          {/* Secondary here, so the hero keeps the page's single primary button. */}
          <Button as="a" href={DASHBOARD_URL} size="sm" variant="secondary">
            {cta}
          </Button>
        </div>
      </div>
    </header>
  )
}
