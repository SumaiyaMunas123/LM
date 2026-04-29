import { NavLink } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Users, Settings, CircleUserRound } from 'lucide-react'

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { to: '/learning', label: 'Learning', icon: <BookOpen size={18} /> },
  { to: '/teachers', label: 'Teachers', icon: <Users size={18} /> },
  { to: '/admin', label: 'Admin', icon: <Settings size={18} /> },
]

export default function Sidebar({
  email,
  onSignOut,
}: {
  email: string
  onSignOut: () => void
}) {
  return (
    <aside className="sidebar app-sidebar">
      <div>
        <div className="card-row" style={{ marginBottom: 12 }}>
          <div className="sidebar-brand" aria-hidden="true">
            <CircleUserRound size={20} />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600 }}>EduPath</div>
            <p className="sidebar-copy" style={{ margin: '2px 0 0' }}>
              Quiet, structured learning workspace.
            </p>
          </div>
        </div>
      </div>
      <nav className="nav-list sidebar-nav" aria-label="Primary">
        {nav.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            className={({ isActive }) => `nav-link sidebar-link${isActive ? ' active' : ''}`}
          >
            <span className="icon">{n.icon}</span>
            <span className="label">{n.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div>
          <p className="sidebar-label">Signed in as</p>
          <p className="sidebar-user">{email}</p>
        </div>
        <button className="ghost-button full-width" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </aside>
  )
}
