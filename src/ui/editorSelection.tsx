import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export interface EditorSelection {
  docId: string
  blockId: string
  text: string
}

interface SelectionState {
  selection: EditorSelection | null
  setSelection: (value: EditorSelection | null) => void
}

const Context = createContext<SelectionState | null>(null)

export function EditorSelectionProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<EditorSelection | null>(null)
  const value = useMemo(() => ({ selection, setSelection }), [selection])
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useEditorSelection(): SelectionState {
  return useContext(Context) ?? { selection: null, setSelection: () => {} }
}

/** Broadcast a freshly inserted citation so the editor can fade its highlight. */
export function flashCitation(citationId: string) {
  window.dispatchEvent(new CustomEvent('lmt:cite-inserted', { detail: citationId }))
}
