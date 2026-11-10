import { clinicalTemplate } from './clinical-template'
import { useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import type { JSONContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyleKit, LineHeight } from '@tiptap/extension-text-style'
import { EditorIcon } from './EditorIcon'
import styles from './ClinicalDocument.module.css'

const empty: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] }
const fonts = ['Arial', 'Calibri', 'Aptos', 'Georgia', 'Times New Roman', 'Verdana']
const sizes = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48]
export function ClinicalDocument({ value, onChange, readOnly = false, disabled = false }: {
  value: JSONContent | null
  onChange?: (document: JSONContent) => void
  readOnly?: boolean
  disabled?: boolean
}) {
  const [zoom, setZoom] = useState(100)
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: false, codeBlock: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyleKit.configure({ lineHeight: false }),
      LineHeight.configure({ types: ['paragraph', 'heading'] })
    ],
    content: value ?? empty,
    editable: !readOnly && !disabled,
    shouldRerenderOnTransaction: true,
    editorProps: { attributes: { role: 'textbox', 'aria-label': 'Documento de historia clínica', 'aria-multiline': 'true', spellcheck: 'true' } },
    onUpdate: ({ editor: current }) => onChange?.(current.getJSON())
  })
  useEffect(() => { editor?.setEditable(!readOnly && !disabled) }, [editor, readOnly, disabled])
  if (!editor) return <p>Cargando documento…</p>
  const characters = editor.getText().length
  const words = editor.getText().trim().split(/\s+/).filter(Boolean).length
  const defaultSize = editor.isActive('heading', { level: 1 }) ? '28pt' : editor.isActive('heading', { level: 2 }) ? '18pt' : editor.isActive('heading', { level: 3 }) ? '14pt' : '12pt'
  const textStyle = editor.getAttributes('textStyle')
  const paragraphStyle = editor.getAttributes(editor.isActive('heading') ? 'heading' : 'paragraph')
  const action = (label: string, icon: ReactNode, run: () => void, active?: boolean, unavailable = false) => (
    <button type="button" title={label} aria-label={label} aria-pressed={active} disabled={disabled || unavailable}
      onMouseDown={event => event.preventDefault()} onClick={run}>{icon}</button>
  )
  return <section className={styles.document} aria-label="Historia clínica en formato documento">
    <header className={styles.titlebar}>
      <span className={styles.documentIcon}><EditorIcon name="document" /></span>
      <div><strong>Historia clínica</strong><span>Documento del paciente</span></div>
      <span className={styles.mode}>{readOnly ? 'Solo lectura' : 'Edición'}</span>
    </header>
    {!readOnly && <>
      <div className={styles.ribbonHeading}><span>Inicio</span><small>Formato del documento</small></div>
      <div className={styles.ribbon} role="group" aria-label="Formato del documento" tabIndex={0}>
        <div className={styles.toolGroup} role="group" aria-label="Fuente">
          <div className={styles.toolRow}>
            <select className={styles.fontSelect} aria-label="Fuente" disabled={disabled} value={textStyle.fontFamily || 'Arial'} onChange={e => editor.chain().focus().setFontFamily(e.target.value).run()}>
              {fonts.map(font => <option key={font} value={font}>{font}</option>)}
            </select>
            <select className={styles.sizeSelect} aria-label="Tamaño de fuente" disabled={disabled} value={textStyle.fontSize || defaultSize} onChange={e => editor.chain().focus().setFontSize(e.target.value).run()}>
              {sizes.map(size => <option key={size} value={`${size}pt`}>{size}</option>)}
            </select>
          </div>
          <div className={styles.toolRow}>
            {action('Negrita', <b className={styles.glyph}>N</b>, () => { editor.chain().focus().toggleBold().run() }, editor.isActive('bold'))}
            {action('Cursiva', <i className={styles.glyph}>K</i>, () => { editor.chain().focus().toggleItalic().run() }, editor.isActive('italic'))}
            {action('Subrayado', <u className={styles.glyph}>S</u>, () => { editor.chain().focus().toggleUnderline().run() }, editor.isActive('underline'))}
            {action('Tachado', <s className={styles.glyph}>ab</s>, () => { editor.chain().focus().toggleStrike().run() }, editor.isActive('strike'))}
            <label className={styles.colorControl} title="Color del texto"><span aria-hidden="true" style={{ borderColor: textStyle.color || '#202938' }}>A</span>
              <input type="color" aria-label="Color del texto" disabled={disabled} value={/^#[0-9a-f]{6}$/i.test(textStyle.color || '') ? textStyle.color : '#202938'} onChange={e => editor.chain().focus().setColor(e.target.value).run()} />
            </label>
          </div>
          <span className={styles.groupName}>Fuente</span>
        </div>
        <div className={styles.toolGroup} role="group" aria-label="Párrafo">
          <div className={styles.toolRow}>
            {action('Viñetas', <EditorIcon name="bullets" />, () => { editor.chain().focus().toggleBulletList().run() }, editor.isActive('bulletList'))}
            {action('Numeración', <EditorIcon name="numbers" />, () => { editor.chain().focus().toggleOrderedList().run() }, editor.isActive('orderedList'))}
            {action('Cita', <EditorIcon name="quote" />, () => { editor.chain().focus().toggleBlockquote().run() }, editor.isActive('blockquote'))}
            <select aria-label="Interlineado" title="Interlineado" disabled={disabled} value={paragraphStyle.lineHeight || (editor.isActive('heading', { level: 1 }) ? '1.15' : '1.5')} onChange={e => editor.chain().focus().updateAttributes('paragraph', { lineHeight: e.target.value }).updateAttributes('heading', { lineHeight: e.target.value }).run()}>
              {['1', '1.15', '1.5', '2'].map(height => <option key={height} value={height}>↕ {height}</option>)}
            </select>
          </div>
          <div className={styles.toolRow}>
            {(['left', 'center', 'right', 'justify'] as const).map((align, i) => <span key={align}>{action(['Izquierda', 'Centrar', 'Derecha', 'Justificar'][i], <EditorIcon name={align} />, () => { editor.chain().focus().setTextAlign(align).run() }, (paragraphStyle.textAlign || 'left') === align)}</span>)}
          </div>
          <span className={styles.groupName}>Párrafo</span>
        </div>
        <div className={styles.toolGroup} role="group" aria-label="Estilos">
          <div className={styles.styleTiles}>
            {[['0', 'Normal'], ['1', 'Título'], ['2', 'Subtítulo'], ['3', 'Sección']].map(([level, label]) => <button key={level} type="button" aria-label={`Estilo ${label}`} aria-pressed={level === '0' ? editor.isActive('paragraph') : editor.isActive('heading', { level: Number(level) })} disabled={disabled}
              onMouseDown={event => event.preventDefault()} onClick={() => level === '0' ? editor.chain().focus().setParagraph().run() : editor.chain().focus().setHeading({ level: Number(level) as 1 | 2 | 3 }).run()}>
              <span className={styles[`style${level}`]}>Aa</span><small>{label}</small>
            </button>)}
          </div>
          <span className={styles.groupName}>Estilos</span>
        </div>
        <div className={styles.toolGroup} role="group" aria-label="Edición">
          <div className={styles.toolRow}>
            {action('Deshacer', <EditorIcon name="undo" />, () => { editor.chain().focus().undo().run() }, undefined, !editor.can().undo())}
            {action('Rehacer', <EditorIcon name="redo" />, () => { editor.chain().focus().redo().run() }, undefined, !editor.can().redo())}
            {action('Quitar formato', <EditorIcon name="clear" />, () => { editor.chain().focus().unsetAllMarks().clearNodes().resetAttributes('paragraph', ['textAlign', 'lineHeight']).run() })}
          </div>
          <select aria-label="Resaltado" disabled={disabled} value={textStyle.backgroundColor || ''} onChange={e => e.target.value ? editor.chain().focus().setBackgroundColor(e.target.value).run() : editor.chain().focus().unsetBackgroundColor().run()}>
            <option value="">Sin resaltado</option><option value="#fff2a8">Amarillo</option><option value="#d8f2df">Verde</option><option value="#dbeafe">Azul</option><option value="#fce7f3">Rosa</option>
          </select>
          <span className={styles.groupName}>Edición</span>
        </div>
      </div>
      <div className={styles.saveHint}><span>Al guardar la ficha, el documento se archiva en MinIO y queda vinculado al paciente.</span>{editor.isEmpty && <button type="button" disabled={disabled} onClick={() => editor.commands.setContent(clinicalTemplate)}>Usar estructura clínica</button>}</div>
    </>}
    <div className={styles.canvas}>
      <div className={styles.sheetContainer} style={{ '--document-zoom': zoom / 100 } as CSSProperties}>
        <div className={styles.ruler} aria-hidden="true">{Array.from({ length: 15 }, (_, i) => <span key={i}>{i + 1}</span>)}</div>
        <div className={styles.paper}>
          <div className={styles.pageHeading} aria-hidden="true"><span>SUPERKANES</span><span>HISTORIA CLÍNICA</span></div>
          <EditorContent editor={editor} />
          <div className={styles.pageFooter} aria-hidden="true">Registro clínico · Uso del equipo veterinario</div>
        </div>
      </div>
    </div>
    <footer className={styles.statusbar}>
      <span>{words.toLocaleString('es')} palabras <span className={styles.divider}>|</span> {characters.toLocaleString('es')} / 200.000 caracteres</span>
      <label>Zoom <select aria-label="Zoom del documento" value={zoom} onChange={e => setZoom(Number(e.target.value))}>{[75, 90, 100, 110, 125].map(size => <option key={size} value={size}>{size}%</option>)}</select></label>
    </footer>
    {characters > 200000 && <p className={styles.limit} role="alert">Reduce el texto antes de guardar: el límite es de 200.000 caracteres.</p>}
  </section>
}
