import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

export type IconName =
  | 'add'
  | 'close'
  | 'search'
  | 'check'
  | 'warning'
  | 'flag'
  | 'calendar'
  | 'file'
  | 'trash'
  | 'download'
  | 'print'
  | 'external'
  | 'chevron-down'
  | 'chevron-right'
  | 'clock'
  | 'book'
  | 'users'
  | 'folder'
  | 'lock'
  | 'rotate'
  | 'more'
  | 'back'
  | 'info'
  | 'eye'
  | 'panel'
  | 'zoom'
  | 'cite'
  | 'exhibit'
  | 'note'
  | 'filing'
  | 'settings'
  | 'shield'

const paths: Record<IconName, ReactNode> = {
  add: <path d="M8 3v10M3 8h10" />,
  close: <path d="M4 4l8 8M12 4l-8 8" />,
  search: (
    <>
      <circle cx="7" cy="7" r="4.2" />
      <path d="M10.2 10.2L14 14" />
    </>
  ),
  check: <path d="M2.8 8.4l3.4 3.4L13.2 4.6" />,
  warning: (
    <>
      <path d="M8 2.5l6 11H2z" />
      <path d="M8 6v3.6M8 11.7v.1" />
    </>
  ),
  flag: <path d="M4 2v12M4 3h7.2l-1.4 2.4L11.2 8H4" />,
  calendar: (
    <>
      <rect x="2.5" y="3.5" width="11" height="10" rx="1" />
      <path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" />
    </>
  ),
  file: (
    <>
      <path d="M3.5 2h6l3 3v9h-9z" />
      <path d="M9.5 2v3h3M5.5 8h5M5.5 10.5h5" />
    </>
  ),
  trash: (
    <>
      <path d="M3 4.5h10M6 2.5h4M4.5 4.5l.6 9h5.8l.6-9M6.6 7v4M9.4 7v4" />
    </>
  ),
  download: <path d="M8 2v8M4.5 6.5L8 10l3.5-3.5M3 13h10" />,
  print: (
    <>
      <path d="M4.5 6V2h7v4M4.5 12H3V6.5h10V12h-1.5M4.5 10.5h7V14h-7z" />
    </>
  ),
  external: (
    <>
      <path d="M9 2.5h4.5V7M13.5 2.5L7.5 8.5" />
      <path d="M12 9v4.5H2.5V4H7" />
    </>
  ),
  'chevron-down': <path d="M4 6l4 4 4-4" />,
  'chevron-right': <path d="M6 3.5L10.5 8 6 12.5" />,
  clock: (
    <>
      <circle cx="8" cy="8" r="5.6" />
      <path d="M8 4.8V8l2.4 1.6" />
    </>
  ),
  book: (
    <>
      <path d="M2.5 3h4.3c.7 0 1.2.5 1.2 1.2V14c0-.8-.6-1.3-1.3-1.3H2.5z" />
      <path d="M13.5 3H9.2C8.5 3 8 3.5 8 4.2V14c0-.8.6-1.3 1.3-1.3h4.2z" />
    </>
  ),
  users: (
    <>
      <circle cx="6" cy="6" r="2.4" />
      <path d="M2 13c.2-2.4 1.8-3.7 4-3.7s3.8 1.3 4 3.7M10.6 4.2a2.3 2.3 0 010 4.2M11.6 9.6c1.4.4 2.2 1.6 2.4 3.4" />
    </>
  ),
  folder: <path d="M2 4.5h4l1.2 1.5H14v7H2z" />,
  lock: (
    <>
      <rect x="3.5" y="7" width="9" height="6.5" rx="1" />
      <path d="M5.5 7V5a2.5 2.5 0 015 0v2" />
    </>
  ),
  rotate: <path d="M13 8a5 5 0 11-1.6-3.7M13 2v3h-3" />,
  more: (
    <>
      <circle cx="3.5" cy="8" r=".9" />
      <circle cx="8" cy="8" r=".9" />
      <circle cx="12.5" cy="8" r=".9" />
    </>
  ),
  back: <path d="M13 8H3M7 4L3 8l4 4" />,
  info: (
    <>
      <circle cx="8" cy="8" r="5.6" />
      <path d="M8 7v4M8 5v.1" />
    </>
  ),
  eye: (
    <>
      <path d="M1.8 8S4.2 4 8 4s6.2 4 6.2 4S11.8 12 8 12 1.8 8 1.8 8z" />
      <circle cx="8" cy="8" r="1.8" />
    </>
  ),
  panel: (
    <>
      <rect x="2" y="3" width="12" height="10" rx="1" />
      <path d="M10 3v10" />
    </>
  ),
  zoom: (
    <>
      <circle cx="7" cy="7" r="4.2" />
      <path d="M10.2 10.2L14 14M5 7h4M7 5v4" />
    </>
  ),
  cite: (
    <>
      <path d="M3 13V3h4.5v4.5H4.5M8.5 13V3H13v4.5H10" />
    </>
  ),
  exhibit: (
    <>
      <rect x="2.5" y="2.5" width="11" height="11" rx="1" />
      <path d="M5 10l2-2.5 1.6 2 1.4-1.5 1.5 2M6 5.5h.1" />
    </>
  ),
  note: (
    <>
      <path d="M2.5 2.5h9l2 2v9h-11z" />
      <path d="M5 6h6M5 8.5h6M5 11h4" />
    </>
  ),
  filing: (
    <>
      <path d="M2.5 4.5h5l1.2 1.5h4.8v7h-11z" />
      <path d="M6 2.5h5l1.5 1.5" />
    </>
  ),
  settings: (
    <>
      <circle cx="8" cy="8" r="2.2" />
      <path d="M8 1.8v1.7M8 12.5v1.7M2 8h1.7M12.3 8H14M3.8 3.8l1.2 1.2M11 11l1.2 1.2M12.2 3.8L11 5M5 11l-1.2 1.2" />
    </>
  ),
  shield: <path d="M8 2l5 1.8v4.4c0 3-2 5.2-5 6.3-3-1.1-5-3.3-5-6.3V3.8z" />,
}

export function Icon({ name, size = 16, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  icon?: IconName
  busy?: boolean
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  busy,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={`btn btn-${variant} btn-${size} ${className}`}
      disabled={props.disabled || busy}
      aria-busy={busy || undefined}
    >
      {busy ? <span className="spinner" aria-hidden="true" /> : icon ? <Icon name={icon} /> : null}
      {children ? <span>{children}</span> : null}
    </button>
  )
}

export function IconButton({
  label,
  icon,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; icon: IconName }) {
  return (
    <button {...props} className="icon-btn" aria-label={label} title={label}>
      <Icon name={icon} />
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Status vocabulary: every status gets an icon and a word             */
/* ------------------------------------------------------------------ */

const STATUS_MAP: Record<string, { tone: string; icon: IconName; label?: string }> = {
  Verified: { tone: 'success', icon: 'check' },
  Unverified: { tone: 'warn', icon: 'warning' },
  Flagged: { tone: 'danger', icon: 'flag' },
  Draft: { tone: 'neutral', icon: 'file' },
  Staged: { tone: 'info', icon: 'folder' },
  Submitted: { tone: 'info', icon: 'filing' },
  Accepted: { tone: 'success', icon: 'check' },
  Rejected: { tone: 'danger', icon: 'warning' },
  Served: { tone: 'success', icon: 'check' },
  Upcoming: { tone: 'neutral', icon: 'clock' },
  'Due Soon': { tone: 'warn', icon: 'clock' },
  Overdue: { tone: 'danger', icon: 'warning' },
  Overridden: { tone: 'outline', icon: 'flag' },
  Pending: { tone: 'neutral', icon: 'clock' },
  Running: { tone: 'info', icon: 'rotate' },
  Passed: { tone: 'success', icon: 'check' },
  Failed: { tone: 'danger', icon: 'warning' },
  Active: { tone: 'success', icon: 'check' },
  Archived: { tone: 'neutral', icon: 'folder' },
  Final: { tone: 'success', icon: 'check' },
  'Due Soon ': { tone: 'warn', icon: 'clock' },
  Broken: { tone: 'danger', icon: 'warning' },
  Locked: { tone: 'neutral', icon: 'lock' },
  'Missing': { tone: 'danger', icon: 'warning' },
}

export function Status({ state, label }: { state: string; label?: string }) {
  const entry = STATUS_MAP[state] ?? { tone: 'neutral', icon: 'info' as IconName }
  return (
    <span className={`status status-${entry.tone}`}>
      <Icon name={entry.icon} size={14} />
      <span>{label ?? state}</span>
    </span>
  )
}

export function Badge({
  children,
  tone = 'neutral',
  title,
}: {
  children: ReactNode
  tone?: 'neutral' | 'info' | 'success' | 'warn' | 'danger' | 'accent' | 'outline'
  title?: string
}) {
  return (
    <span className={`badge badge-${tone}`} title={title}>
      {children}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Form controls                                                       */
/* ------------------------------------------------------------------ */

export function Field({
  label,
  hint,
  required,
  children,
  className = '',
}: {
  label: string
  hint?: ReactNode
  required?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <label className={`field ${className}`}>
      <span className="field-label">
        {label}
        {required ? <span className="required" aria-hidden="true"> *</span> : null}
      </span>
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  )
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`input ${props.className || ''}`} />
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`input textarea ${props.className || ''}`} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`input select ${props.className || ''}`} />
}

export function Checkbox({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: ReactNode
  hint?: ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className="checkbox-row">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={event => onChange(event.target.checked)}
      />
      <div>
        <label htmlFor={id}>{label}</label>
        {hint ? <div className="field-hint">{hint}</div> : null}
      </div>
    </div>
  )
}

export function RadioRow({
  name,
  value,
  current,
  onChange,
  label,
  hint,
}: {
  name: string
  value: string
  current: string
  onChange: (value: string) => void
  label: ReactNode
  hint?: ReactNode
}) {
  return (
    <label className={`radio-row ${current === value ? 'selected' : ''}`}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={current === value}
        onChange={() => onChange(value)}
      />
      <span>
        <span className="radio-label">{label}</span>
        {hint ? <span className="field-hint">{hint}</span> : null}
      </span>
    </label>
  )
}

/* ------------------------------------------------------------------ */
/* Dialog                                                              */
/* ------------------------------------------------------------------ */

export function Dialog({
  title,
  subtitle,
  eyebrow,
  children,
  footer,
  onClose,
  width = '580px',
}: {
  title: string
  subtitle?: ReactNode
  eyebrow?: string
  children: ReactNode
  footer?: ReactNode
  onClose: () => void
  width?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const focusTarget =
      ref.current?.querySelector<HTMLElement>(
        'input:not([type="hidden"]):not([disabled]), textarea, select, button.primary-focus, [tabindex="0"]',
      ) ?? ref.current
    focusTarget?.focus()
    return () => previous?.focus?.()
  }, [])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
      if (event.key === 'Tab' && ref.current) {
        const focusables = Array.from(
          ref.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]',
          ),
        ).filter(el => el.offsetParent !== null)
        if (!focusables.length) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="overlay" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <div
        className="dialog"
        style={{ maxWidth: width }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={ref}
        tabIndex={-1}
      >
        <header className="dialog-head">
          <div>
            {eyebrow ? <div className="dialog-eyebrow">{eyebrow}</div> : null}
            <h2>{title}</h2>
            {subtitle ? <div className="dialog-subtitle">{subtitle}</div> : null}
          </div>
          <IconButton label="Close" icon="close" onClick={onClose} />
        </header>
        <div className="dialog-body">{children}</div>
        {footer ? <footer className="dialog-foot">{footer}</footer> : null}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Layout helpers                                                      */
/* ------------------------------------------------------------------ */

export function Tabs({
  tabs,
  active,
  onChange,
  label = 'Sections',
}: {
  tabs: { id: string; label: string; badge?: number; tone?: 'danger' | 'warn' }[]
  active: string
  onChange: (id: string) => void
  label?: string
}) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={active === tab.id}
          className={`tab ${active === tab.id ? 'active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
          {tab.badge ? (
            <span className={`tab-badge ${tab.tone === 'danger' ? 'danger' : tab.tone === 'warn' ? 'warn' : ''}`}>
              {tab.badge}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  )
}

export function EmptyState({
  icon = 'file',
  title,
  body,
  action,
}: {
  icon?: IconName
  title: string
  body?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon name={icon} size={22} />
      </div>
      <h3>{title}</h3>
      {body ? <div className="empty-body">{body}</div> : null}
      {action ? <div className="empty-action">{action}</div> : null}
    </div>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="loading-inline" role="status">
      <span className="spinner" aria-hidden="true" />
      {label ? <span>{label}</span> : null}
    </span>
  )
}

export function Divider() {
  return <hr className="divider" />
}

export function PageHeader({
  title,
  subtitle,
  actions,
  badges,
}: {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  badges?: ReactNode
}) {
  return (
    <header className="page-head">
      <div className="page-head-text">
        <div className="page-title-row">
          <h1>{title}</h1>
          {badges}
        </div>
        {subtitle ? <div className="page-subtitle">{subtitle}</div> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  )
}
