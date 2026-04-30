import { NavLink } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Users, UserCircle2 } from 'lucide-react'

export default function BottomTabBar() {
  return (
    <nav className="bottom-tabbar">
      <NavLink to="/dashboard" className={({ isActive }) => `tab${isActive ? ' active' : ''}`}>
        <LayoutDashboard size={20} />
      </NavLink>
      <NavLink to="/learning" className={({ isActive }) => `tab${isActive ? ' active' : ''}`}>
        <BookOpen size={20} />
      </NavLink>
      <NavLink to="/teachers" className={({ isActive }) => `tab${isActive ? ' active' : ''}`}>
        <Users size={20} />
      </NavLink>
      <NavLink to="/profile" className={({ isActive }) => `tab${isActive ? ' active' : ''}`}>
        <UserCircle2 size={20} />
      </NavLink>
    </nav>
  )
}
