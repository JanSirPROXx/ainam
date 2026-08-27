import type { EditorView, ProjectSummary } from '@ainam/schema'
import { screen } from '@testing-library/react'
import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ContentEditor } from '@/components/ContentEditor'
import { renderWithProviders } from './render'

vi.mock('@/components/RichTextEditor', () => ({
  RichTextEditor: ({ id }: { id: string }) => createElement('div', { id }),
}))

const project = (role: string): ProjectSummary => ({
  id: 'proj_test',
  organizationId: 'org_test',
  organizationName: 'Acme',
  name: 'Acme web',
  slug: 'acme',
  defaultLocale: 'en',
  locales: ['en'],
  role,
  webhookUrl: null,
  previewUrl: null,
})

/** Keys in the order a developer declared them, not in any sorted order. */
const DECLARED = ['home/hero/eyebrow', 'home/hero/title', 'home/hero/subtitle', 'home/pricing/visible']

const view: EditorView = {
  locale: 'en',
  unpublishedCount: 1,
  entries: DECLARED.map((key, index) => ({
    key,
    field:
      index === 3
        ? { type: 'boolean', label: `Field ${index}`, required: false, default: true }
        : { type: 'text', label: `Field ${index}`, required: false, multiline: false, default: '' },
    draft: {
      value: index === 3 ? true : `value ${index}`,
      version: 1,
      updatedAt: '2026-08-26T00:00:00.000Z',
      updatedBy: { kind: 'user', id: 'usr_1' },
    },
    published: null,
    state: 'never-published',
  })),
}

describe('ContentEditor', () => {
  it('lists fields in the order the developer declared them', () => {
    // The editor once listed them in JSONB key order — by length, then bytes —
    // which put the hero subtitle between two pricing fields.
    renderWithProviders(<ContentEditor projectId="proj_test" view={view} project={project('owner')} />)
    const keys = screen.getAllByText(/^home\//).map((node) => node.textContent)
    expect(keys).toEqual(DECLARED)
  })

  it('offers no publish to an editor who cannot publish', () => {
    // An unrecognised role grants nothing, so the control is disabled rather
    // than offered and then refused by the server.
    renderWithProviders(<ContentEditor projectId="proj_test" view={view} project={project('member')} />)
    expect(screen.getByRole('button', { name: 'Publish' })).toHaveProperty('disabled', true)
  })

  it('lets an owner publish when nothing is unsaved', () => {
    renderWithProviders(<ContentEditor projectId="proj_test" view={view} project={project('owner')} />)
    expect(screen.getByRole('button', { name: 'Publish' })).toHaveProperty('disabled', false)
    // Nothing edited yet, so there is nothing to save.
    expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', true)
  })

  it('says how many changes are unpublished rather than that there are some', () => {
    renderWithProviders(<ContentEditor projectId="proj_test" view={view} project={project('owner')} />)
    expect(screen.getByText('1 change unpublished')).toBeDefined()
  })
})
