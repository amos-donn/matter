import { useState } from 'react'
import { useWorkspace } from '../../core/store'
import { useUi } from '../ui'
import { useEditorSelection } from '../editorSelection'
import { Icon, Kbd, Select } from '../kit'
import { uid } from '../../core/util'
import type { BlockType } from '../../core/types'

const TABS = ['Home', 'Insert', 'References', 'Review', 'View'] as const
type Tab = (typeof TABS)[number]

export function Ribbon({
  docId,
  sideOpen,
  onSidePanel,
  zoom,
  onZoom,
  showCitationMarks,
  onCitationMarks,
}: {
  docId: string
  sideOpen: boolean
  onSidePanel: () => void
  zoom: number
  onZoom: (next: number) => void
  showCitationMarks: boolean
  onCitationMarks: () => void
}) {
  const { data, updateDocument, updateSettings } = useWorkspace()
  const { openDialog, toast } = useUi()
  const { selection } = useEditorSelection()
  const [tab, setTab] = useState<Tab>('Home')
  const [advanced, setAdvanced] = useState(false)
  const doc = data.documents.find(d => d.id === docId)
  if (!doc) return null

  const addBlock = (type: BlockType, text = '', level?: 1 | 2 | 3) => {
    const blocks = [...doc.blocks]
    if (type === 'pagebreak') {
      blocks.push({ id: uid('blk'), type: 'pagebreak', text: '' })
      blocks.push({ id: uid('blk'), type: 'paragraph', text: '' })
    } else if (type === 'caption') {
      if (blocks.some(b => b.type === 'caption')) {
        toast('This document already has a caption block.')
        return
      }
      blocks.unshift({ id: uid('blk'), type, text: '' })
    } else {
      blocks.push({ id: uid('blk'), type, text, level })
    }
    updateDocument(doc.id, { blocks })
  }

  const command = (label: string, icon: Parameters<typeof Icon>[0]['name'], run: () => void, disabled = false, reason?: string) => (
    <button className="ribbon-btn" onClick={run} disabled={disabled} title={reason || label} aria-label={label}>
      <Icon name={icon} size={18} />
      <span>{label}</span>
    </button>
  )

  const styleValue = (() => {
    const block = selection?.blockId ? doc.blocks.find(b => b.id === selection.blockId) : undefined
    if (!block) return 'paragraph'
    return block.type === 'heading' ? `heading${block.level || 1}` : block.type
  })()

  const applyStyle = (value: string) => {
    const blockId = selection?.blockId
    if (!blockId) {
      toast('Place the cursor in a paragraph first.')
      return
    }
    const blocks = doc.blocks.map(block => {
      if (block.id !== blockId) return block
      if (value.startsWith('heading')) {
        return { ...block, type: 'heading' as const, level: Number(value.slice(-1)) as 1 | 2 | 3 }
      }
      return { ...block, type: value as BlockType }
    })
    updateDocument(doc.id, { blocks })
  }

  return (
    <div className="ribbon">
      <div className="ribbon-tabs" role="tablist" aria-label="Ribbon">
        {TABS.map(name => (
          <button key={name} className={`ribbon-tab ${tab === name ? 'active' : ''}`} role="tab" aria-selected={tab === name} onClick={() => setTab(name)}>
            {name}
          </button>
        ))}
      </div>
      <div className="ribbon-body">
        {tab === 'Home' && (
          <>
            <div className="ribbon-group">
              <div className="ribbon-actions">
                {command('Save', 'download', () => openDialog('history', { docId: doc.id }))}
                {command('Find', 'search', () => openDialog('find-replace', { docId: doc.id }))}
                {command('Replace', 'file', () => openDialog('find-replace', { docId: doc.id, replace: true }))}
                {command('Panels', 'panel', () => window.dispatchEvent(new CustomEvent('lmt:toggle-nav')))}
              </div>
              <div className="ribbon-group-label">Editing</div>
            </div>
            <div className="ribbon-group">
              <div className="ribbon-actions">
                <Select className="ribbon-select" value={styleValue} onChange={e => applyStyle(e.target.value)} disabled={!selection} title="Paragraph style — the template owns formatting">
                  <option value="paragraph">Body text</option>
                  <option value="heading1">Heading 1</option>
                  <option value="heading2">Heading 2</option>
                  <option value="heading3">Heading 3</option>
                  <option value="quote">Block quote</option>
                </Select>
                <button className={`ribbon-advanced`} onClick={() => setAdvanced(v => !v)} title="Formatting that may not match court rules">
                  Advanced
                </button>
                {advanced && (
                  <span className="ribbon-warning">
                    Font and size controls can pull the page away from the court template. Export checks use the template.
                  </span>
                )}
              </div>
              <div className="ribbon-group-label">Styles</div>
            </div>
            <div className="ribbon-group">
              <div className="ribbon-actions">
                {command('Cut', 'more', () => document.execCommand('cut'))}
                {command('Copy', 'file', () => document.execCommand('copy'))}
                {command('Paste', 'download', () => toast('Use Ctrl+V to paste text into the draft.'))}
              </div>
              <div className="ribbon-group-label">Clipboard</div>
            </div>
          </>
        )}
        {tab === 'Insert' && (
          <>
            <div className="ribbon-group">
              <div className="ribbon-actions">
                {command('Exhibit x-ref', 'exhibit', () => openDialog('exhibit-xref', { docId: doc.id, caseId: doc.caseId }))}
                {command('Caption block', 'file', () => addBlock('caption'))}
              </div>
              <div className="ribbon-group-label">References</div>
            </div>
            <div className="ribbon-group">
              <div className="ribbon-actions">
                {command('Table of authorities', 'book', () => addBlock('tableOfAuthorities'))}
                {command('Table of contents', 'note', () => addBlock('tableOfContents'))}
                {command('Exhibit index', 'folder', () => addBlock('exhibitIndex'))}
                {command('Certificate', 'check', () => addBlock('certificateOfService'))}
              </div>
              <div className="ribbon-group-label">Generated</div>
            </div>
            <div className="ribbon-group">
              <div className="ribbon-actions">
                {command('Page break', 'file', () => addBlock('pagebreak'))}
              </div>
              <div className="ribbon-group-label">Pages</div>
            </div>
          </>
        )}
        {tab === 'References' && (
          <>
            <div className="ribbon-group">
              <div className="ribbon-actions">
                {command('Cite', 'cite', () => openDialog('cite', { docId: doc.id, caseId: doc.caseId }), !selection, 'Select text in the draft first.')}
                {command('Authorities', 'book', () => openDialog('citation-scan', { docId: doc.id }))}
                {command('Citation Scan', 'warning', () => openDialog('citation-scan', { docId: doc.id }))}
              </div>
              <div className="ribbon-group-label">Citations</div>
            </div>
            <div className="ribbon-group">
              <div className="ribbon-actions">
                {command('Mark verified', 'check', () => openDialog('mark-verified', { docId: doc.id, caseId: doc.caseId }))}
                {command('Update TOA', 'rotate', () => toast('The table of authorities is generated from the citations when the document is exported.'))}
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
                {command('Quick Check', 'check', () => openDialog('quick-check', { docId: doc.id }))}
              </div>
              <div className="ribbon-group-label">Versions</div>
            </div>
          </>
        )}
        {tab === 'View' && (
          <>
            <div className="ribbon-group">
              <div className="ribbon-actions">
                {command('Print Layout', 'file', () => window.print())}
                {command('Outline', 'note', () => onSidePanel())}
                {command('Side Panel', 'panel', onSidePanel)}
              </div>
              <div className="ribbon-group-label">Layout</div>
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
                {command('Issues', 'warning', onSidePanel)}
                {command('Citation marks', 'cite', () => {
                  onCitationMarks()
                  updateSettings({ showCitationMarks: !showCitationMarks })
                })}
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
