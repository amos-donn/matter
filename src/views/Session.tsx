import { Icon } from '../ui/kit'

export function LoadingScreen({ error }: { error?: string | null }) {
  return (
    <div className="boot">
      <Icon name="book" size={26} />
      <div>{error ? 'The prototype workspace could not be opened.' : 'Opening the prototype workspace…'}</div>
      {error ? <div className="session-warning" style={{ maxWidth: 460 }}>{error}</div> : null}
    </div>
  )
}
