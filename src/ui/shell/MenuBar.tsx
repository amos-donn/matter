import { useEffect, useRef, useState } from 'react'
import { Icon } from '../kit'

export interface MenuItemDef {
  label?: string
  shortcut?: string
  action?: () => void
  disabled?: boolean
  disabledReason?: string
  separator?: boolean
  danger?: boolean
  checked?: boolean
}

export interface MenuGroupDef {
  label: string
  items: MenuItemDef[]
}

export function MenuBar({ menus }: { menus: MenuGroupDef[] }) {
  const [open, setOpen] = useState<number | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open === null) return
    const onPointer = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(null)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(null)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="menu-bar" ref={ref} role="menubar" aria-label="Application menu">
      <div className="menu-brand">
        <Icon name="shield" size={14} />
        <span>Matter</span>
      </div>
      {menus.map((menu, index) => (
        <div key={menu.label} className="menu-group">
          <button
            type="button"
            className={`menu-button ${open === index ? 'open' : ''}`}
            aria-haspopup="menu"
            aria-expanded={open === index}
            onClick={() => setOpen(open === index ? null : index)}
            onPointerEnter={() => {
              if (open !== null) setOpen(index)
            }}
          >
            {menu.label}
          </button>
          {open === index ? (
            <div className="menu-popover" role="menu" aria-label={menu.label}>
              {menu.items.map((item, itemIndex) =>
                item.separator ? (
                  <div key={`sep-${itemIndex}`} className="menu-sep" role="separator" />
                ) : (
                  <button
                    key={`${item.label}-${itemIndex}`}
                    type="button"
                    role="menuitem"
                    className={`menu-item ${item.danger ? 'danger' : ''}`}
                    disabled={item.disabled}
                    title={item.disabled ? item.disabledReason : undefined}
                    onClick={() => {
                      if (item.disabled) return
                      setOpen(null)
                      item.action?.()
                    }}
                  >
                    <span className="menu-check">{item.checked ? <Icon name="check" size={13} /> : null}</span>
                    <span className="menu-label">{item.label}</span>
                    {item.shortcut ? <span className="menu-shortcut">{item.shortcut}</span> : null}
                  </button>
                ),
              )}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}
