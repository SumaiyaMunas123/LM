import { NavLink } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Users, UserCircle2, Sparkles } from 'lucide-react'

type UserRole = 'student' | 'teacher' | 'admin'

function getNav(role: UserRole) {
  const nav = [
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { to: '/learning', label: 'Learning', icon: <BookOpen size={18} /> },
    { to: '/teachers', label: 'Teachers', icon: <Users size={18} /> },
    { to: '/profile', label: 'Profile', icon: <UserCircle2 size={18} /> },
  ]

  if (role === 'admin') {
    nav.splice(3, 0, { to: '/admin/upload', label: 'Admin Upload', icon: <Sparkles size={18} /> })
  }

  return nav
}

export default function Sidebar({
  name,
  email,
  role,
  onSignOut,
}: {
  name: string
  email: string
  role: UserRole
  onSignOut: () => void
}) {
  const nav = getNav(role)

  return (
    <aside className="sidebar app-sidebar">
      <div>
        <div className="card-row" style={{ marginBottom: 12 }}>
          <div className="sidebar-brand" aria-hidden="true">
            <Sparkles size={18} />
          </div>
        </div>
        <div className="empty-state" style={{ padding: 12, marginBottom: 12 }}>
          <p className="muted" style={{ margin: 0 }}>No learning path selected yet.</p>
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
          <p className="sidebar-label">{role}</p>
          <p className="sidebar-user" style={{ fontWeight: 600 }}>{name}</p>
          <p className="sidebar-user">{email}</p>
        </div>
        <button className="ghost-button full-width" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </aside>
  )
}
