'use client'

import type { RichTextValue } from '@ainam/schema'
import { RICH_TEXT_HEADING_LEVELS, documentsMatch } from '@ainam/schema'
import { Button } from '@ainam/ui'
import { Link } from '@tiptap/extension-link'
import { EditorContent, type JSONContent, useEditor } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { useEffect } from 'react'

export interface RichTextEditorProps {
  id: string
  value: RichTextValue | null
  onChange: (value: RichTextValue) => void
}

const EMPTY: RichTextValue = { type: 'doc', content: [] }

/**
 * `RichTextValue` keeps its node tree opaque — mirroring TipTap's shape in the
 * domain model would drag its types into the published SDK, and the SDK has to
 * stay free of them. This file is the one boundary where the two meet, so the
 * conversion lives here and nowhere else.
 */
function asTipTapContent(value: RichTextValue): JSONContent {
  return value as unknown as JSONContent
}

/**
 * The controls offered, in the order they appear.
 *
 * Derived from the shared allowlist rather than written out: a button for a
 * node the renderers do not handle produces formatting that vanishes on the
 * customer's own site, and the parity tests in `@ainam/core` and `@ainam/next`
 * only guard the other direction.
 */
const HEADING_ACTIONS = RICH_TEXT_HEADING_LEVELS.map((level) => ({
  label: `H${level}`,
  isActive: (editor: NonNullable<ReturnType<typeof useEditor>>) =>
    editor.isActive('heading', { level }),
  run: (editor: NonNullable<ReturnType<typeof useEditor>>) =>
    editor.chain().focus().toggleHeading({ level }).run(),
}))

/**
 * The rich-text control.
 *
 * Configured from the allowlist, not from a hand-picked extension list: the
 * editor and the two renderers have to agree on exactly one set of nodes, and
 * the way they stop agreeing is somebody enabling one more TipTap extension
 * here because it was easy.
 */
export function RichTextEditor({ id, value, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    // Rendered on the client only. TipTap warns about SSR hydration otherwise,
    // and this control never appears in a server-rendered page.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [...RICH_TEXT_HEADING_LEVELS] },
        // Off because nothing renders them: the allowlist has no codeBlock,
        // horizontalRule or strike, so offering them would be offering
        // formatting that disappears on publish.
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        link: false,
      }),
      Link.configure({ openOnClick: false, autolink: false }),
    ],
    content: asTipTapContent(value ?? EMPTY),
    onUpdate: ({ editor: instance }) => onChange(instance.getJSON() as RichTextValue),
  })

  // A publish or a rollback replaces the value underneath the editor. Without
  // this the control keeps showing what it had, and the next keystroke saves it
  // back over the restored text.
  useEffect(() => {
    if (!editor || !value) return
    // Order-insensitive: the value comes back from a JSONB column with its keys
    // normalised, and resetting the content on every render would move the
    // caret to the start on every keystroke.
    if (!documentsMatch(editor.getJSON(), value)) {
      editor.commands.setContent(asTipTapContent(value), { emitUpdate: false })
    }
  }, [editor, value])

  if (!editor) return null

  return (
    <div className="ainam-richtext">
      <div className="ainam-richtext__toolbar">
        <Mark editor={editor} name="bold" label="Bold" />
        <Mark editor={editor} name="italic" label="Italic" />
        <Mark editor={editor} name="code" label="Code" />
        {HEADING_ACTIONS.map((action) => (
          <Button
            key={action.label}
            size="sm"
            variant={action.isActive(editor) ? 'secondary' : 'ghost'}
            onClick={() => action.run(editor)}
          >
            {action.label}
          </Button>
        ))}
        <Button
          size="sm"
          variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          List
        </Button>
        <Button
          size="sm"
          variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          Numbered
        </Button>
        <Button
          size="sm"
          variant={editor.isActive('blockquote') ? 'secondary' : 'ghost'}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          Quote
        </Button>
      </div>
      <EditorContent editor={editor} id={id} className="ainam-richtext__body" />
    </div>
  )
}

function Mark({
  editor,
  name,
  label,
}: {
  editor: NonNullable<ReturnType<typeof useEditor>>
  name: 'bold' | 'italic' | 'code'
  label: string
}) {
  return (
    <Button
      size="sm"
      variant={editor.isActive(name) ? 'secondary' : 'ghost'}
      onClick={() => editor.chain().focus().toggleMark(name).run()}
    >
      {label}
    </Button>
  )
}
