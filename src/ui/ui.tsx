import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { uid } from '../core/util'

export type DialogKind =
  | 'new-case'
  | 'edit-case'
  | 'trigger-event'
  | 'add-deadlines'
  | 'deadline-rules'
  | 'override-deadline'
  | 'new-document'
  | 'find-replace'
  | 'citation-scan'
  | 'cite'
  | 'mark-verified'
  | 'flag-citation'
  | 'new-authority'
  | 'save-authority'
  | 'add-exhibit'
  | 'edit-exhibit'
  | 'exhibit-xref'
  | 'bates'
  | 'organize-pages'
  | 'combine-files'
  | 'exhibit-index'
  | 'new-filing'
  | 'edit-filing'
  | 'preflight'
  | 'stage-filing'
  | 'record-result'
  | 'contact'
  | 'note'
  | 'backup'
  | 'options'
  | 'shortcuts'
  | 'about'
  | 'help'
  | 'history'
  | 'compare'
  | 'quick-check'
  | 'deferred'
  | 'delete-confirm'
  | 'purge'
  | 'service-contacts'
  | 'view-exhibit'
  | 'command-help'

export interface DialogState {
  kind: DialogKind
  payload: Record<string, unknown>
  instance: string
}

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastItem {
  id: string
  message: string
  tone: 'info' | 'success' | 'danger'
  duration: number
  action?: ToastAction
}

interface UiValue {
  dialog: DialogState | null
  openDialog: (kind: DialogKind, payload?: Record<string, unknown>) => void
  closeDialog: () => void
  toasts: ToastItem[]
  toast: (
    message: string,
    options?: { tone?: ToastItem['tone']; action?: ToastAction; duration?: number },
  ) => string
  dismissToast: (id: string) => void
}

const UiContext = createContext<UiValue | null>(null)

export function UiProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef(new Map<string, number>())

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      window.clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const toast = useCallback<UiValue['toast']>((message, options) => {
    const id = uid('toast')
    const item: ToastItem = {
      id,
      message,
      tone: options?.tone || 'info',
      duration: options?.duration ?? (options?.action ? 10_000 : 5_000),
      action: options?.action,
    }
    setToasts(prev => [...prev.filter(t => t.message !== message), item])
    const timer = window.setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
      timers.current.delete(id)
    }, item.duration)
    timers.current.set(id, timer)
    return id
  }, [])

  const openDialog = useCallback((kind: DialogKind, payload: Record<string, unknown> = {}) => {
    setDialog({ kind, payload, instance: uid('dlg') })
  }, [])

  const closeDialog = useCallback(() => setDialog(null), [])

  useEffect(() => {
    return () => {
      for (const timer of timers.current.values()) window.clearTimeout(timer)
    }
  }, [])

  const value = useMemo(
    () => ({ dialog, openDialog, closeDialog, toasts, toast, dismissToast }),
    [dialog, openDialog, closeDialog, toasts, toast, dismissToast],
  )

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>
}

export function useUi(): UiValue {
  const ui = useContext(UiContext)
  if (!ui) throw new Error('useUi must be used inside UiProvider.')
  return ui
}
