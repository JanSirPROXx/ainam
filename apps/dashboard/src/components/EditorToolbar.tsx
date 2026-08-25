'use client'

import type { ProjectSummary } from '@ainam/schema'
import { hasPermission } from '@ainam/schema'
import { Badge, Button } from '@ainam/ui'
import { count } from '@/lib/plural'

export interface EditorToolbarProps {
  project: ProjectSummary
  unpublishedCount: number
  dirtyCount: number
  saving: boolean
  publishing: boolean
  previewing: boolean
  onSave: () => void
  onPublish: () => void
  onPreview: () => void
}

/**
 * The state of this locale, and the three things you can do about it.
 *
 * Publish stays disabled while there are unsaved edits: publishing would push
 * the last saved draft and leave the newer text behind, which looks like the
 * publish silently dropped it.
 */
export function EditorToolbar(props: EditorToolbarProps) {
  const { project, unpublishedCount, dirtyCount } = props
  const canPublish = hasPermission(project.role, 'content:publish')

  return (
    <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
      <Badge tone={unpublishedCount > 0 ? 'warning' : 'success'} dot>
        {unpublishedCount > 0
          ? `${count(unpublishedCount, 'change')} unpublished`
          : 'Everything published'}
      </Badge>

      <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--space-3)' }}>
        <Button
          variant="ghost"
          loading={props.previewing}
          onClick={props.onPreview}
          title={
            project.previewUrl
              ? 'Open the site showing unpublished drafts'
              : 'Set a preview URL in project settings first'
          }
        >
          Preview
        </Button>
        <Button
          variant="secondary"
          disabled={dirtyCount === 0}
          loading={props.saving}
          onClick={props.onSave}
        >
          {dirtyCount > 0 ? `Save ${count(dirtyCount, 'change')}` : 'Save'}
        </Button>
        <Button
          disabled={!canPublish || unpublishedCount === 0 || dirtyCount > 0}
          loading={props.publishing}
          onClick={props.onPublish}
        >
          Publish
        </Button>
      </div>
    </div>
  )
}
