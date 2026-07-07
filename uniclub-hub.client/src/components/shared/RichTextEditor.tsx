import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect } from 'react'

interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
}

const btn = (active: boolean): React.CSSProperties => ({
  height: 28, minWidth: 28, padding: '0 6px', borderRadius: 5,
  border: '1px solid #e8e3d6',
  background: active ? '#15131a' : '#f7f6f1',
  color: active ? '#fff' : '#4a4651',
  fontWeight: 700, fontSize: 12, cursor: 'pointer',
  fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
})

export default function RichTextEditor({ value, onChange, placeholder = 'Nhập nội dung...', minHeight = 260 }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Image,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  // Sync external value changes (e.g. when switching posts)
  useEffect(() => {
    if (!editor) return
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || '', { emitUpdate: false })
    }
  }, [value, editor])

  if (!editor) return null

  function setLink() {
    const url = window.prompt('URL:', editor!.getAttributes('link').href ?? '')
    if (url === null) return
    if (url === '') { editor!.chain().focus().unsetLink().run(); return }
    editor!.chain().focus().setLink({ href: url }).run()
  }

  function insertImage() {
    const url = window.prompt('URL ảnh:')
    if (url) editor!.chain().focus().setImage({ src: url }).run()
  }

  return (
    <div style={{ border: '1px solid #e8e3d6', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 4, padding: '8px 10px',
        borderBottom: '1px solid #e8e3d6', background: '#f7f6f1',
      }}>
        {/* Text style */}
        <button type="button" style={btn(editor.isActive('bold'))}
          onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBold().run() }}>B</button>
        <button type="button" style={{ ...btn(editor.isActive('italic')), fontStyle: 'italic' }}
          onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleItalic().run() }}>I</button>
        <button type="button" style={{ ...btn(editor.isActive('underline')), textDecoration: 'underline' }}
          onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleUnderline().run() }}>U</button>
        <button type="button" style={{ ...btn(editor.isActive('strike')), textDecoration: 'line-through' }}
          onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleStrike().run() }}>S</button>

        <span style={{ width: 1, background: '#e8e3d6', margin: '0 2px' }} />

        {/* Headings */}
        {([1, 2, 3] as const).map(level => (
          <button key={level} type="button" style={btn(editor.isActive('heading', { level }))}
            onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHeading({ level }).run() }}>
            H{level}
          </button>
        ))}

        <span style={{ width: 1, background: '#e8e3d6', margin: '0 2px' }} />

        {/* Lists */}
        <button type="button" style={btn(editor.isActive('bulletList'))}
          onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBulletList().run() }}>
          ≡
        </button>
        <button type="button" style={btn(editor.isActive('orderedList'))}
          onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run() }}>
          1.
        </button>
        <button type="button" style={btn(editor.isActive('blockquote'))}
          onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBlockquote().run() }}>
          "
        </button>
        <button type="button" style={btn(editor.isActive('codeBlock'))}
          onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleCodeBlock().run() }}>
          {'<>'}
        </button>

        <span style={{ width: 1, background: '#e8e3d6', margin: '0 2px' }} />

        {/* Align */}
        <button type="button" style={btn(editor.isActive({ textAlign: 'left' }))}
          onMouseDown={e => { e.preventDefault(); editor.chain().focus().setTextAlign('left').run() }}>⬅</button>
        <button type="button" style={btn(editor.isActive({ textAlign: 'center' }))}
          onMouseDown={e => { e.preventDefault(); editor.chain().focus().setTextAlign('center').run() }}>⬛</button>
        <button type="button" style={btn(editor.isActive({ textAlign: 'right' }))}
          onMouseDown={e => { e.preventDefault(); editor.chain().focus().setTextAlign('right').run() }}>➡</button>

        <span style={{ width: 1, background: '#e8e3d6', margin: '0 2px' }} />

        {/* Link & Image */}
        <button type="button" style={btn(editor.isActive('link'))}
          onMouseDown={e => { e.preventDefault(); setLink() }}>
          🔗
        </button>
        <button type="button" style={btn(false)}
          onMouseDown={e => { e.preventDefault(); insertImage() }}>
          🖼
        </button>

        <span style={{ width: 1, background: '#e8e3d6', margin: '0 2px' }} />

        {/* History */}
        <button type="button" style={btn(false)}
          onMouseDown={e => { e.preventDefault(); editor.chain().focus().undo().run() }}>↩</button>
        <button type="button" style={btn(false)}
          onMouseDown={e => { e.preventDefault(); editor.chain().focus().redo().run() }}>↪</button>
      </div>

      {/* Editor content */}
      <style>{`
        .richtexteditor .ProseMirror {
          outline: none;
          min-height: ${minHeight}px;
          padding: 14px 16px;
          font-size: 14px;
          line-height: 1.7;
          color: #15131a;
          font-family: 'Be Vietnam Pro', sans-serif;
        }
        .richtexteditor .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: #918c99;
          pointer-events: none;
          float: left;
          height: 0;
        }
        .richtexteditor .ProseMirror h1 { font-size: 1.8em; font-weight: 900; margin: .5em 0 .25em; }
        .richtexteditor .ProseMirror h2 { font-size: 1.4em; font-weight: 800; margin: .5em 0 .25em; }
        .richtexteditor .ProseMirror h3 { font-size: 1.15em; font-weight: 700; margin: .5em 0 .25em; }
        .richtexteditor .ProseMirror ul { list-style: disc; padding-left: 1.5em; }
        .richtexteditor .ProseMirror ol { list-style: decimal; padding-left: 1.5em; }
        .richtexteditor .ProseMirror blockquote {
          border-left: 3px solid #c7d2fe; margin: .5em 0; padding: 4px 12px; color: #4a4651;
        }
        .richtexteditor .ProseMirror pre {
          background: #f0ede8; border-radius: 6px; padding: 10px 14px;
          font-family: monospace; font-size: 13px; overflow-x: auto;
        }
        .richtexteditor .ProseMirror img { max-width: 100%; border-radius: 8px; margin: 8px 0; }
        .richtexteditor .ProseMirror a { color: #4f46e5; text-decoration: underline; }
      `}</style>
      <div className="richtexteditor">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
