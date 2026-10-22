import type { ProjectSummary } from '@ainam/schema'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NewProjectForm } from '@/components/NewProjectForm'
import { renderWithProviders } from './render'

const push = vi.fn()
const setActive = vi.fn(async () => ({ data: null, error: null }))
const refreshOrganizations = vi.fn()
const adminFetch = vi.fn()

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/lib/auth-client', () => ({
  organization: { setActive: (...args: unknown[]) => setActive(...(args as [])) },
  refreshOrganizations: () => refreshOrganizations(),
}))
vi.mock('@/lib/api', async () => ({
  ...(await vi.importActual<object>('@/lib/api')),
  adminFetch: (...args: unknown[]) => adminFetch(...args),
}))

const created: ProjectSummary = {
  id: 'proj_new',
  organizationId: 'org_new',
  organizationName: 'Acme web',
  name: 'Acme web',
  slug: 'acme-web',
  defaultLocale: 'en',
  locales: ['en'],
  role: 'owner',
  webhookUrl: null,
  previewUrl: null,
}

describe('NewProjectForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    adminFetch.mockResolvedValue(created)
  })

  it('offers nothing to submit until the project has a name', () => {
    renderWithProviders(<NewProjectForm />)
    expect(screen.getByRole('button', { name: 'Create project' }).hasAttribute('disabled')).toBe(true)
  })

  it('creates the project, makes its organisation the active one, and opens it', async () => {
    renderWithProviders(<NewProjectForm />)

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Acme web' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create project' }))

    await waitFor(() => expect(push).toHaveBeenCalledWith('/projects/proj_new'))
    expect(adminFetch).toHaveBeenCalledWith(
      '/admin/projects',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: 'Acme web' }) }),
    )
    // Without this the project list stays filtered to another client and the
    // project just created is not on it.
    expect(setActive).toHaveBeenCalledWith({ organizationId: 'org_new' })
    expect(refreshOrganizations).toHaveBeenCalled()
  })

  it('stays on the form and says why when the server refuses', async () => {
    const { AdminApiError } = await import('@/lib/api')
    adminFetch.mockRejectedValue(
      new AdminApiError({ code: 'bad_request', message: 'Give the project a name.', requestId: 'req_1' }),
    )
    renderWithProviders(<NewProjectForm />)

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Acme web' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create project' }))

    expect(await screen.findByText('Give the project a name.')).toBeTruthy()
    expect(push).not.toHaveBeenCalled()
  })
})
