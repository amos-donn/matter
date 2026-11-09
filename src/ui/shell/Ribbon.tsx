import { useState } from 'react'
import { useWorkspace } from '../../core/store'
import { useUi } from '../ui'
import { useEditorSelection } from '../editorSelection'
import { Icon, Kbd, Select, type IconName } from '../kit'
import { uid } from '../../core/util'
import type { BlockType } from '../../core/types'

const TABS = ['Home', 'Insert', 'References', 'Review', 'View'] as const
type Tab = (typeof TABS)[number]

export function Ribbon({
  docId,
  sideOpen,
  onSidePanel,
  onSideTab,
  zoom,
  onZoom,
  showCitationMarks,
  onCitationMarks,
}: {
  docId: string
  sideOpen: boolean
  onSidePanel: () => void
  onSideTab: (tab: string) => void
  zoom: number
  onZoom: (next: number) => void
  showCitationMarks: boolean
  onCitationMarks: () => void
}) {
  const { data, updateDocument, saveDocumentVersion } = useWorkspace()
  const { openDialog, toast } = useUi()
  const { selection } = useEditorSelection()
  const [tab, setTab] = useState<Tab>('Home')
  const doc = data.documents.find(d => d.id === docId)
  if (!doc) return null

  const activeBlock = selection?.blockId ? doc.blocks.find(b => b.id === selection.blockId) : undefined
  const editableBlock =
    activeBlock && (activeBlock.type === 'paragraph' || activeBlock.type === 'heading' || activeBlock.type === 'quote')
      ? activeBlock
      : undefined

  const addBlock = (type: BlockType, text = '', level?: 1 | 2 | 3) => {
    const blocks = [...doc.blocks]
    const selectedIndex = selection ? blocks.findIndex(b => b.id === selection.blockId) : -1
    const insertAt = selectedIndex >= 0 ? selectedIndex + 1 : blocks.length
    if (type === 'pagebreak') {
      const paragraphId = uid('blk')
      blocks.splice(insertAt, 0, { id: uid('blk'), type: 'pagebreak', text: '' }, { id: paragraphId, type: 'paragraph', text: '' })
      updateDocument(doc.id, { blocks })
      window.setTimeout(() => window.dispatchEvent(new CustomEvent('lmt:focus-block', { detail: paragraphId })), 40)
      return
    }
    if (type === 'caption') {
      if (blocks.some(b => b.type === 'caption')) {
        toast('This document already has a caption block.')
        return
      }
      updateDocument(doc.id, { blocks: [{ id: uid('blk'), type, text: '' }, ...blocks] })
      return
    }
    const blockId = uid('blk')
    const block = { id: blockId, type, text, level } as typeof blocks[number]
    blocks.splice(insertAt, 0, block)
    updateDocument(doc.id, { blocks })
    window.setTimeout(() => window.dispatchEvent(new CustomEvent('lmt:focus-block', { detail: blockId })), 40)
  }

  const command = (
    label: string,
    icon: IconName,
    run: () => void,
    disabled = false,
    reason?: string,
    pressed?: boolean,
  ) => (
    <button
      type="button"
      className="ribbon-btn"
      onMouseDown={event => event.preventDefault()}
      onClick={run}
      disabled={disabled}
      title={reason || label}
      aria-label={label}
      aria-pressed={pressed}
    >
      <Icon name={icon} size={18} />
      <span>{label}</span>
    </button>
  )

  const styleValue = editableBlock
    ? editableBlock.type === 'heading'
      ? `heading${editableBlock.level || 1}`
      : editableBlock.type
    : ''

  const applyStyle = (value: string) => {
    if (!editableBlock) {
      toast('Place the cursor in a paragraph or heading first.')
      return
    }
    const blocks = doc.blocks.map(block => {
      if (block.id !== editableBlock.id) return block
      if (value.startsWith('heading')) {
        return { ...block, type: 'heading' as const, level: Number(value.slice(-1)) as 1 | 2 | 3 }
      }
      return { ...block, type: value as BlockType }
    })
    updateDocument(doc.id, { blocks })
  }

  const save = () => {
    saveDocumentVersion(doc.id, 'Manual save')
    toast('Version saved.', { tone: 'success' })
  }

  return (
    <div className="ribbon">
      <div className="ribbon-tabs" role="tablist" aria-label="Ribbon">
        {TABS.map(name => (
          <button
            key={name}
            type="button"
            className={`ribbon-tab ${tab === name ? 'active' : ''}`}
            role="tab"
            aria-selected={tab === name}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="ribbon-body">
        {tab === 'Home' && (
          <>
            <div className="ribbon-group">
              <div className="ribbon-actions">
                {command('Save', 'save', save)}
                {command('History', 'clock', () => openDialog('history', { docId: doc.id }))}
              </div>
              <div className="ribbon-group-label">Document</div>
            </div>
            <div className="ribbon-group">
              <div className="ribbon-actions">
                {command('Cut', 'cut', () => document.execCommand('cut'))}
                {command('Copy', 'copy', () => document.execCommand('copy'))}
                {command('Paste', 'paste', () => toast('Use Ctrl+V to paste text into the draft.'))}
                {command('Undo', 'undo', () => document.execCommand('undo'))}
                {command('Redo', 'redo', () => document.execCommand('redo'))}
              </div>
              <div className="ribbon-group-label">Clipboard</div>
            </div>
            <div className="ribbon-group">
              <div className="ribbon-actions">
                <Select
                  className="ribbon-select"
                  value={styleValue}
                  onChange={event => applyStyle(event.target.value)}
                  disabled={!editableBlock}
                  title="Paragraph style — the court template owns margins, font, and spacing"
                  aria-label="Paragraph style"
                >
                  {!editableBlock ? <option value="">Place cursor in text</option> : null}
                  <option value="paragraph">Body text</option>
                  <option value="heading1">Heading 1</option>
                  <option value="heading2">Heading 2</option>
                  <option value="heading3">Heading 3</option>
                  <option value="quote">Block quote</option>
                </Select>
                <span className="ribbon-note" title="Margins, typeface, size, and spacing come from the court template.">
                  Court template
                </span>
              </div>
              <div className="ribbon-group-label">Styles</div>
            </div>
            <div className="ribbon-group">
              <div className="ribbon-actions">
                {command('Find', 'search', () => openDialog('find-replace', { docId: doc.id }))}
                {command('Replace', 'rotate', () => openDialog('find-replace', { docId: doc.id, replace: true }))}
                {command('Navigation', 'panel', () => window.dispatchEvent(new CustomEvent('lmt:toggle-nav')))}
              </div>
              <div className="ribbon-group-label">Editing</div>
            </div>
          </>
        )}
        {tab === 'Insert' && (
          <>
            <div className="ribbon-group">
              <div className="ribbon-actions">
                {command('Exhibit x-ref', 'exhibit', () => openDialog('exhibit-xref', { docId: doc.id, caseId: doc.caseId }))}
                {command('Caption', 'text', () => addBlock('caption'))}
                {command('Page break', 'file', () => addBlock('pagebreak'))}
              </div>
              <div className="ribbon-group-label">Blocks</div>
            </div>
            <div className="ribbon-group">
              <div className="ribbon-actions">
                {command('Table of contents', 'note', () => addBlock('tableOfContents'))}
                {command('Table of authorities', 'book', () => addBlock('tableOfAuthorities'))}
                {command('Exhibit index', 'folder', () => addBlock('exhibitIndex'))}
                {command('Certificate', 'check', () => addBlock('certificateOfService'))}
              </div>
              <div className="ribbon-group-label">Generated</div>
            </div>
            <div className="ribbon-group">
              <div className="ribbon-actions">
                {command('Citation', 'cite', () => openDialog('cite', { docId: doc.id, caseId: doc.caseId }), !selection?.text.trim(), 'Select text in the draft first.')}
              </div>
              <div className="ribbon-group-label">References</div>
            </div>
          </>
        )}
        {tab === 'References' && (
          <>
            <div className="ribbon-group">
              <div className="ribbon-actions">
                {command('Cite', 'cite', () => openDialog('cite', { docId: doc.id, caseId: doc.caseId }), !selection?.text.trim(), 'Select text in the draft first.')}
                {command('Authorities', 'book', () => onSideTab('authorities'))}
                {command('Citation Scan', 'warning', () => openDialog('citation-scan', { docId: doc.id }))}
              </div>
              <div className="ribbon-group-label">Citations</div>
            </div>
            <div className="ribbon-group">
              <div className="ribbon-actions">
                {command('Table of authorities', 'book', () => addBlock('tableOfAuthorities'))}
                {command('Update TOA', 'rotate', () => toast('The table of authorities updates from the citations when the document is exported.'))}
                {command('Table of contents', 'note', () => addBlock('tableOfContents'))}
              </div>
              <div className="ribbon-group-label">Tables</div>
            </div>
            <div className="ribbon-group">
              <div className="ribbon-actions">
                {command('Mark verified', 'check', () => openDialog('mark-verified', { docId: doc.id, caseId: doc.caseId }))}
              </div>
              <div className="ribbon-group-label">Verification</div>
            </div>
          </>
        )}
        {tab === 'Review' && (
          <>
            <div className="ribbon-group">
              <div className="ribbon-actions">
                {command('Track Changes', 'file', () => openDialog('deferred', { title: 'Track Changes', body: 'Track Changes and Comments are version 1.1 features in the product specification. The draft still keeps version history under Review > History.' }))}
                {command('Comments', 'note', () => openDialog('deferred', { title: 'Comments', body: 'Comments are planned for version 1.1. Use a case note and link it to this draft for now.' }))}
              </div>
              <div className="ribbon-group-label">Review</div>
            </div>
            <div className="ribbon-group">
              <div className="ribbon-actions">
                {command('History', 'clock', () => openDialog('history', { docId: doc.id }))}
                {command('Compare', 'file', () => openDialog('compare', { docId: doc.id }))}
              </div>
              <div className="ribbon-group-label">Versions</div>
            </div>
            <div className="ribbon-group">
              <div className="ribbon-actions">
                {command('Quick Check', 'check', () => openDialog('quick-check', { docId: doc.id }))}
                {command('Citation Scan', 'warning', () => openDialog('citation-scan', { docId: doc.id }))}
                {command('Issues', 'flag', () => onSideTab('issues'))}
              </div>
              <div className="ribbon-group-label">Checks</div>
            </div>
          </>
        )}
        {tab === 'View' && (
          <>
            <div className="ribbon-group">
              <div className="ribbon-actions">
                {command('Print Layout', 'print', () => window.print())}
                {command('Navigation Pane', 'panel', () => window.dispatchEvent(new CustomEvent('lmt:toggle-nav')))}
                {command('Side Panel', 'panel', onSidePanel, false, undefined, sideOpen)}
              </div>
              <div className="ribbon-group-label">Show</div>
            </div>
            <div className="ribbon-group">
              <div className="ribbon-actions">
                {command('Zoom out', 'zoom', () => onZoom(Math.max(80, zoom - 10)))}
                {command('Zoom in', 'zoom', () => onZoom(Math.min(160, zoom + 10)))}
                {command('Reset zoom', 'rotate', () => onZoom(100))}
              </div>
              <div className="ribbon-group-label">Zoom</div>
            </div>
            <div className="ribbon-group">
              <div className="ribbon-actions">
                {command('Citation marks', 'cite', onCitationMarks, false, undefined, showCitationMarks)}
              </div>
              <div className="ribbon-group-label">Marks</div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function KeyHints() {
  return (
    <span className="row-wrap tiny">
      <Kbd>Ctrl+S</Kbd> save <Kbd>Ctrl+Shift+A</Kbd> cite <Kbd>Ctrl+Shift+E</Kbd> exhibit
    </span>
  )
}
