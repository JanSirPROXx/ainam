import { expect, test } from '@playwright/test'
import { OWNER, TITLE_KEY } from './seed'

/**
 * The flow a customer would churn over.
 *
 * Sign in, change the copy, publish it, see it live, roll it back, see it gone.
 * Every step crosses a boundary the unit tests cannot: the browser to the admin
 * API, the API to Postgres, and the published value back out through the
 * content endpoint a customer's site reads.
 */

const CMS = `http://localhost:${process.env['CMS_PORT'] ?? '8787'}`
const EDITED = 'Edited by an end-to-end test'

test.describe.configure({ mode: 'serial' })

test('sign in, edit, publish, roll back', async ({ page, request }) => {
  await test.step('sign in', async () => {
    await page.goto('/sign-in')
    await page.getByLabel('Email').fill(OWNER.email)
    await page.getByLabel('Password').fill(OWNER.password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByText('Projects')).toBeVisible()
  })

  await test.step('open the project', async () => {
    await page.getByRole('link').filter({ hasText: 'E2E site' }).click()
    await expect(page.getByRole('tab', { name: 'Content' })).toBeVisible()
  })

  const original = await page.getByRole('textbox').first().inputValue()

  await test.step('edit and save', async () => {
    await page.getByRole('textbox').first().fill(EDITED)
    await page.getByRole('button', { name: /^Save/ }).click()
    // The save cleared: this is the assertion that caught nothing for three
    // milestones and would have caught the comparison bug that disabled Publish.
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled()
  })

  await test.step('the draft is not public yet', async () => {
    const live = await readLiveContent(request)
    expect(live[TITLE_KEY]).toBe(original)
  })

  await test.step('publish, and the change reaches the content API', async () => {
    await page.getByRole('button', { name: 'Publish' }).click()
    await expect(page.getByText(/Published \d+ key/)).toBeVisible()
    await expect.poll(async () => (await readLiveContent(request))[TITLE_KEY]).toBe(EDITED)
  })

  await test.step('roll the publish back from the history', async () => {
    await page.getByRole('tab', { name: 'History' }).click()
    await page.getByRole('button', { name: 'Revert' }).first().click()
    await page.getByRole('button', { name: 'Revert and publish' }).click()
    await expect.poll(async () => (await readLiveContent(request))[TITLE_KEY]).toBe(original)
  })

  await test.step('the rollback also replaced the draft', async () => {
    // Without this the value someone just rolled back sits in the editor and
    // returns on their next unrelated publish — the rollback would appear to
    // work and then quietly undo itself.
    await page.getByRole('tab', { name: 'Content' }).click()
    await expect(page.getByRole('textbox').first()).toHaveValue(original)
  })
})

async function readLiveContent(
  request: import('@playwright/test').APIRequestContext,
): Promise<Record<string, string>> {
  const key = process.env['E2E_READ_KEY']
  const projectId = process.env['E2E_PROJECT_ID']
  const response = await request.get(`${CMS}/v1/content/${projectId}`, {
    headers: { authorization: `Bearer ${key}` },
  })
  return response.json() as Promise<Record<string, string>>
}
