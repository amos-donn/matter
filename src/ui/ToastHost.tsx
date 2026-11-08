import { useEffect } from 'react'
import { Icon } from './kit'
import { useUi } from './ui'

export function ToastHost() {
  const { toasts, dismissToast } = useUi()

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('[contenteditable="true"], input, textarea, select')) return
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        const action = toasts.find(t => t.action)
        if (action?.action) {
          event.preventDefault()
          action.action.onClick()
          dismissToast(action.id)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toasts, dismissToast])

  return (
    <div className="toast-host" aria-live="polite" aria-atomic="false">
      {toasts.map(item => (
        <div key={item.id} className={`toast toast-${item.tone}`}>
          <Icon name={item.tone === 'danger' ? 'warning' : item.tone === 'success' ? 'check' : 'info'} />
          <span className="toast-message">{item.message}</span>
          {item.action ? (
            <button
              className="toast-action"
              onClick={() => {
                item.action?.onClick()
                dismissToast(item.id)
              }}
            >
              {item.action.label}
            </button>
          ) : null}
          <button className="toast-close" aria-label="Dismiss" onClick={() => dismissToast(item.id)}>
            <Icon name="close" size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}
