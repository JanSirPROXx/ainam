import { describe, expect, it } from 'vitest'
import { accessControl, roles } from '../src/access'

/**
 * The organisation plugin authorises its own endpoints against its own
 * statements. Supplying a custom access control that carries only AINAM's
 * resources leaves an owner unable to invite anyone, and the 403 comes from
 * inside the library and points at nothing in our code — so these assert the
 * plugin's vocabulary survives the merge.
 */
describe('access control', () => {
  it('keeps the statements the organisation plugin checks against', () => {
    for (const resource of ['organization', 'member', 'invitation', 'ac']) {
      expect(Object.keys(accessControl.statements)).toContain(resource)
    }
  })

  it("keeps AINAM's own resources alongside them", () => {
    for (const resource of ['content', 'project', 'apiKey']) {
      expect(Object.keys(accessControl.statements)).toContain(resource)
    }
  })

  it('lets an owner invite and remove people', () => {
    expect(roles.owner.authorize({ invitation: ['create'] }).success).toBe(true)
    expect(roles.owner.authorize({ member: ['delete'] }).success).toBe(true)
    expect(roles.owner.authorize({ organization: ['delete'] }).success).toBe(true)
  })

  it('lets an owner do everything AINAM defines', () => {
    expect(roles.owner.authorize({ content: ['publish', 'restore'] }).success).toBe(true)
    expect(roles.owner.authorize({ project: ['manage'] }).success).toBe(true)
    expect(roles.owner.authorize({ apiKey: ['manage'] }).success).toBe(true)
  })

  it('lets an editor publish content and nothing else', () => {
    expect(roles.editor.authorize({ content: ['publish'] }).success).toBe(true)
    expect(roles.editor.authorize({ invitation: ['create'] }).success).toBe(false)
    expect(roles.editor.authorize({ member: ['delete'] }).success).toBe(false)
    expect(roles.editor.authorize({ organization: ['delete'] }).success).toBe(false)
    expect(roles.editor.authorize({ project: ['manage'] }).success).toBe(false)
    expect(roles.editor.authorize({ apiKey: ['manage'] }).success).toBe(false)
  })
})
