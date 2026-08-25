import { describe, expect, it } from 'vitest'
import { AINAM_ROLES, ROLE_STATEMENTS, hasPermission, isAinamRole } from '../src/roles'

describe('roles', () => {
  it('lets an editor publish but not touch keys, settings or people', () => {
    expect(hasPermission('editor', 'content:publish')).toBe(true)
    expect(hasPermission('editor', 'content:restore')).toBe(true)
    expect(hasPermission('editor', 'apiKey:manage')).toBe(false)
    expect(hasPermission('editor', 'project:manage')).toBe(false)
  })

  it('gives an owner every permission an editor has, and more', () => {
    for (const [resource, actions] of Object.entries(ROLE_STATEMENTS.editor)) {
      for (const action of actions) {
        expect(hasPermission('owner', `${resource}:${action}` as never)).toBe(true)
      }
    }
    expect(hasPermission('owner', 'project:manage')).toBe(true)
    expect(hasPermission('owner', 'apiKey:manage')).toBe(true)
  })

  it('grants nothing to a role it does not recognise', () => {
    // Fails closed on purpose: Better Auth's generated schema defaults the
    // column to "member", and a row carrying it must not inherit access.
    expect(hasPermission('member', 'content:edit')).toBe(false)
    expect(hasPermission('admin', 'content:edit')).toBe(false)
    expect(hasPermission('', 'content:edit')).toBe(false)
    expect(isAinamRole('member')).toBe(false)
  })

  it('lists exactly the roles it defines statements for', () => {
    expect([...AINAM_ROLES].sort()).toEqual(Object.keys(ROLE_STATEMENTS).sort())
  })
})
