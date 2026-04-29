import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { apiGet } from './api/client'
import { supabase } from './lib/supabase'
import { useAuthStore } from './stores/authStore'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import BottomTabBar from './components/BottomTabBar'

type Grade = {
  id: number
  name: string
  display_order: number
}

type Module = {
  id: string
  grade_id: number
  title: string
  code: string | null
  description: string | null
  icon: string | null
  display_order: number
}

type Unit = {
  id: string
  module_id: string
  title: string
  description: string | null
  display_order: number
}

type Resource = {
  id: string
  unit_id: string
  kind: 'tute' | 'paper' | 'video'
  title: string
  description: string | null
  external_url: string | null
  display_order: number
  duration_seconds: number | null
}

type HealthResponse = {
  ok: boolean
}

function useSessionBootstrap() {
  const setSession = useAuthStore((state) => state.setSession)
  const clearSession = useAuthStore((state) => state.clearSession)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const loadSession = async () => {
      const url = new URL(window.location.href)
      if (url.searchParams.has('code')) {
        await supabase.auth.exchangeCodeForSession(window.location.href)
      }

      const { data } = await supabase.auth.getSession()
      if (data.session) {
        setSession(data.session.access_token, {
          id: data.session.user.id,
          email: data.session.user.email ?? null,
        })
      }

      setReady(true)
    }

    void loadSession()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSession(session.access_token, {
          id: session.user.id,
          email: session.user.email ?? null,
        })
      } else {
        clearSession()
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [clearSession, setSession])

  return ready
}

function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  const user = useAuthStore((state) => state.user)
  const clearSession = useAuthStore((state) => state.clearSession)

  const signOut = async () => {
    await supabase.auth.signOut()
    clearSession()
    window.location.replace('/')
  }

  return (
    <div className="app-page">
      <Sidebar email={user?.email ?? 'Google account'} onSignOut={signOut} />
      <main className="content-area">
        <Topbar title={title} subtitle={subtitle} />
        {children}
      </main>
    </div>
  )
}

function LoginPage() {
  const token = useAuthStore((state) => state.token)

  if (token) {
    return <Navigate to="/dashboard" replace />
  }

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="auth-shell">
      <div className="auth-card hero-card">
        <div className="hero-copy">
          <p className="eyebrow">LM Learning</p>
          <h1>Welcome back.</h1>
          <p>
            Sign in with your Google account to open your dashboard, learning modules, and resources.
          </p>
          <div className="action-row">
            <button className="primary-button" onClick={signInWithGoogle}>
              Continue with Google
            </button>
            <span className="support-chip">Secure sign in</span>
          </div>
        </div>
        <div className="hero-panel">
          <p className="panel-kicker">Get started</p>
          <ul className="checklist">
            <li>Open your LMS workspace</li>
            <li>Browse grades, modules, and units</li>
            <li>Access learning resources</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

function DashboardPage() {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const [grades, setGrades] = useState<Grade[]>([])
  const [healthy, setHealthy] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadDashboard = async () => {
      if (!token) return

      try {
        const [gradeData, healthData] = await Promise.all([
          apiGet<Grade[]>('/api/grades', token),
          apiGet<HealthResponse>('/health', token),
        ])

        setHealthy(healthData.ok)
        const data = gradeData
        setGrades(data)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load grades')
      }
    }

    void loadDashboard()
  }, [token])

  if (!token) {
    return <Navigate to="/" replace />
  }

  return (
    <AppShell title={`Welcome${user?.email ? `, ${user.email}` : ''}`} subtitle="Dashboard">
      <section className="metric-grid">
        <article className="metric-card accent">
          <p className="metric-label">Auth</p>
          <h3>Google session ready</h3>
          <span className="metric-value">{token ? 'Connected' : 'Offline'}</span>
        </article>
        <article className="metric-card">
          <p className="metric-label">Backend</p>
          <h3>Health check</h3>
          <span className="metric-value">{healthy === null ? 'Checking' : healthy ? 'OK' : 'Down'}</span>
        </article>
        <article className="metric-card">
          <p className="metric-label">Grades</p>
          <h3>Live records</h3>
          <span className="metric-value">{grades.length}</span>
        </article>
      </section>

      <section className="panel soft-panel">
        <div className="panel-header">
          <div>
            <p className="panel-kicker">Live data</p>
            <h2>Grades from the backend API</h2>
          </div>
          <span className="status-pill">Real table data only</span>
        </div>
        {error ? <p className="error">{error}</p> : null}
        <ul className="list">
          {grades.map((grade) => (
            <li key={grade.id} className="list-item">
              <span>{grade.name}</span>
              <span className="muted">Order {grade.display_order}</span>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  )
}

function LearningPage() {
  const token = useAuthStore((state) => state.token)
  const [grades, setGrades] = useState<Grade[]>([])
  const [modules, setModules] = useState<Module[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [activeGrade, setActiveGrade] = useState<number | null>(null)
  const [activeModule, setActiveModule] = useState<string | null>(null)
  const [activeUnit, setActiveUnit] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadGrades = async () => {
      if (!token) return
      try {
        const gradeData = await apiGet<Grade[]>('/api/grades', token)
        setGrades(gradeData)
        setActiveGrade((prev) => prev ?? (gradeData[0]?.id ?? null))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load grades')
      }
    }

    void loadGrades()
  }, [token])

  useEffect(() => {
    const loadModules = async () => {
      if (!token || !activeGrade) return
      try {
        const moduleData = await apiGet<Module[]>(`/api/modules?gradeId=${activeGrade}`, token)
        setModules(moduleData)
        setActiveModule((prev) => (prev && moduleData.some((m) => m.id === prev) ? prev : (moduleData[0]?.id ?? null)))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load modules')
      }
    }

    void loadModules()
  }, [token, activeGrade])

  useEffect(() => {
    const loadUnits = async () => {
      if (!token || !activeModule) return
      try {
        const unitData = await apiGet<Unit[]>(`/api/units?moduleId=${activeModule}`, token)
        setUnits(unitData)
        setActiveUnit((prev) => (prev && unitData.some((u) => u.id === prev) ? prev : (unitData[0]?.id ?? null)))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load units')
      }
    }

    void loadUnits()
  }, [token, activeModule])

  useEffect(() => {
    const loadResources = async () => {
      if (!token || !activeUnit) return
      try {
        const resourceData = await apiGet<Resource[]>(`/api/units/${activeUnit}/resources`, token)
        setResources(resourceData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load resources')
      }
    }

    void loadResources()
  }, [token, activeUnit])

  if (!token) {
    return <Navigate to="/" replace />
  }

  return (
    <AppShell title="Learning Hub" subtitle="Modules and Units">
      <section className="panel soft-panel">
        <div className="panel-header">
          <div>
            <p className="panel-kicker">Curriculum</p>
            <h2>Pick a grade, then drill into modules and resources</h2>
          </div>
          <span className="status-pill">Live API graph</span>
        </div>

        {error ? <p className="error">{error}</p> : null}

        <div className="chip-row">
          {grades.map((grade) => (
            <button
              key={grade.id}
              className={`chip-button${activeGrade === grade.id ? ' active' : ''}`}
              onClick={() => setActiveGrade(grade.id)}
            >
              {grade.name}
            </button>
          ))}
        </div>

        <div className="learning-grid">
          <article className="column-card">
            <p className="panel-kicker">Modules</p>
            <ul className="list compact-list">
              {modules.map((module) => (
                <li key={module.id} className="list-item">
                  <button className="select-link" onClick={() => setActiveModule(module.id)}>
                    <strong>{module.title}</strong>
                    <span className="muted">{module.code ?? 'No code'}</span>
                  </button>
                </li>
              ))}
            </ul>
          </article>

          <article className="column-card">
            <p className="panel-kicker">Units</p>
            <ul className="list compact-list">
              {units.map((unit) => (
                <li key={unit.id} className="list-item">
                  <button className="select-link" onClick={() => setActiveUnit(unit.id)}>
                    <strong>{unit.title}</strong>
                    <span className="muted">{unit.description ?? 'No description'}</span>
                  </button>
                </li>
              ))}
            </ul>
          </article>

          <article className="column-card">
            <p className="panel-kicker">Resources</p>
            <ul className="list compact-list">
              {resources.map((resource) => (
                <li key={resource.id} className="list-item resource-item">
                  <div>
                    <strong>{resource.title}</strong>
                    <p className="muted small-text">{resource.description ?? 'No description'}</p>
                  </div>
                  <span className="status-pill">{resource.kind}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>
    </AppShell>
  )
}

function ProfilePage() {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)

  if (!token) {
    return <Navigate to="/" replace />
  }

  return (
    <AppShell title="Profile" subtitle="Account">
      <section className="panel soft-panel profile-grid">
        <div>
          <p className="panel-kicker">Connected identity</p>
          <h2>{user?.email ?? 'Google account'}</h2>
          <p className="muted">
            This is the live session coming from Supabase auth. No mock profile data is being invented here.
          </p>
        </div>
        <div className="info-card">
          <p className="sidebar-label">User ID</p>
          <p className="mono-text">{user?.id ?? 'Unavailable'}</p>
        </div>
      </section>
    </AppShell>
  )
}

function IntegrationsPage() {
  const token = useAuthStore((state) => state.token)
  const [health, setHealth] = useState<boolean | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)

  useEffect(() => {
    const checkHealth = async () => {
      if (!token) return

      try {
        const data = await apiGet<HealthResponse>('/health', token)
        setHealth(data.ok)
      } catch (err) {
        setStatusError(err instanceof Error ? err.message : 'Failed to check API status')
      }
    }

    void checkHealth()
  }, [token])

  if (!token) {
    return <Navigate to="/" replace />
  }

  return (
    <AppShell title="Integrations" subtitle="System">
      <section className="panel soft-panel">
        <div className="panel-header">
          <div>
            <p className="panel-kicker">External setup still needed</p>
            <h2>What comes from outside the codebase</h2>
          </div>
        </div>
        <div className="stacked-cards">
          <article className="info-card">
            <h3>Supabase Google provider</h3>
            <p className="muted">Add the client id and secret inside Supabase Auth, not in the frontend.</p>
          </article>
          <article className="info-card">
            <h3>Allowed URLs</h3>
            <p className="muted">Set site URL and redirect URLs for localhost and your deployment domain.</p>
          </article>
          <article className="info-card">
            <h3>Environment files</h3>
            <p className="muted">Backend needs Supabase keys; frontend needs Vite API and Supabase public vars.</p>
          </article>
        </div>
        <div className="status-row">
          <span className="status-pill">API health: {health === null ? 'checking' : health ? 'ok' : 'down'}</span>
          {statusError ? <span className="error">{statusError}</span> : null}
        </div>
      </section>
    </AppShell>
  )
}

function AuthCallbackPage() {
  const setSession = useAuthStore((state) => state.setSession)

  useEffect(() => {
    const finalize = async () => {
      const existing = await supabase.auth.getSession()
      let session = existing.data.session

      if (!session) {
        const exchanged = await supabase.auth.exchangeCodeForSession(window.location.href)
        session = exchanged.data.session
      }

      if (!session) {
        window.location.replace('/')
        return
      }

      setSession(session.access_token, {
        id: session.user.id,
        email: session.user.email ?? null,
      })
      window.location.replace('/dashboard')
    }

    void finalize()
  }, [setSession])

  return <div className="loading-page">Completing sign in...</div>
}

export default function App() {
  const ready = useSessionBootstrap()
  const token = useAuthStore((state) => state.token)

  if (!ready) {
    return <div className="loading-page loading-screen">Loading app...</div>
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/learning" element={<LearningPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/integrations" element={<IntegrationsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {token ? <BottomTabBar /> : null}
    </>
  )
}
