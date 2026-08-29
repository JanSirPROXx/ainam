export interface FooterLink {
  group: string
  label: string
  href: string
}

/**
 * Groups the flat link list into columns.
 *
 * Flat in the schema because a list field holds scalar fields only — no nested
 * lists — so the column is a value on each row. Order is first appearance, so
 * reordering rows in the dashboard reorders the columns.
 */
export function groupFooterLinks(links: FooterLink[]): Array<[string, FooterLink[]]> {
  const groups = new Map<string, FooterLink[]>()
  for (const link of links) {
    const existing = groups.get(link.group)
    if (existing) existing.push(link)
    else groups.set(link.group, [link])
  }
  return [...groups]
}
