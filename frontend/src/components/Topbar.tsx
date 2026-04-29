import { Bell } from 'lucide-react'

export default function Topbar({
  title = 'Dashboard',
  subtitle = 'Overview',
}: {
  title?: string
  subtitle?: string
}) {
  return (
    <header className="app-topbar">
      <div className="topbar-left">
        <p className="eyebrow">{subtitle}</p>
        <h1 className="topbar-title">{title}</h1>
      </div>
      <div className="topbar-right">
        <span className="health-pill">
          <span className="dot" />
          Connected
        </span>
        <button className="ghost-button" type="button" aria-label="Notifications">
          <Bell size={16} />
        </button>
      </div>
    </header>
  )
}
