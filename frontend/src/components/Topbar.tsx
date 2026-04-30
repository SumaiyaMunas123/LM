export default function Topbar({
  title = 'Dashboard',
}: {
  title?: string
}) {
  return (
    <header className="app-topbar">
      <div className="topbar-left">
        <h1 className="topbar-title">{title}</h1>
      </div>
    </header>
  )
}
