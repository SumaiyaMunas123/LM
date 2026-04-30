import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Link, Navigate, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ChevronDown,
  ChevronRight,
  FileBarChart2,
  FileText,
  Loader2,
  Play,
  Upload,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/useAuthStore'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import BottomTabBar from '../components/BottomTabBar'

type ResourceKind = 'tute' | 'paper' | 'video'

type Resource = {
  id: string
  kind: ResourceKind
  title: string
  url: string
}

type Unit = {
  id: string
  index: number
  name: string
  resources: Resource[]
}

type Module = {
  id: string
  title: string
  description: string
  teacher: string
  gradeName: string
  stream?: string
  units: Unit[]
}

type Stream = {
  id: string
  name: string
  modules: Omit<Module, 'id' | 'gradeName' | 'stream'>[]
}

type GradePlan = {
  id: string
  name: string
  subjects?: string[]
  streams?: Stream[]
}

const SUBJECTS_G1_TO_3 = ['Mathematics', 'Tamil', 'Environment']
const SUBJECTS_G4_TO_5 = ['Mathematics', 'English', 'Sinhala', 'Religion', 'Environment']
const SUBJECTS_G6_TO_9 = ['Mathematics', 'English', 'Science', 'Religion', 'Sinhala', 'Tamil', 'Civics', 'Geography', 'PT', 'History', 'Health']
const SUBJECTS_G10_TO_11 = ['Mathematics', 'English', 'Science', 'Religion', 'Sinhala', 'Commerce', 'Tamil', 'English Literature', 'Tamil Literature', 'Arabic Literature', 'Arabic', 'IT', 'Art', 'History']

const BASE_STREAMS: Stream[] = [
  {
    id: 'science',
    name: 'Science Stream',
    modules: [
      { title: 'Biology', description: 'Living systems and practical applications.', teacher: 'N. Perera', units: [] },
      { title: 'Physics', description: 'Conceptual and applied physics learning.', teacher: 'S. Fernando', units: [] },
      { title: 'Chemistry', description: 'Core chemistry principles and reactions.', teacher: 'R. Jayasinghe', units: [] },
      { title: 'Information Technology', description: 'Computing fundamentals and problem solving.', teacher: 'T. Silva', units: [] },
    ],
  },
  {
    id: 'commerce',
    name: 'Commerce Stream',
    modules: [
      { title: 'Economics', description: 'Economic theory and real-world analysis.', teacher: 'M. Dias', units: [] },
      { title: 'Business Studies', description: 'Business operations and management basics.', teacher: 'K. Rodrigo', units: [] },
      { title: 'Accounting', description: 'Financial accounting and reporting.', teacher: 'P. De Zoysa', units: [] },
    ],
  },
  {
    id: 'technology',
    name: 'Technology Stream',
    modules: [
      { title: 'Bio Technology', description: 'Biological systems for modern technology.', teacher: 'L. Senanayake', units: [] },
      { title: 'Engineering Technology', description: 'Design thinking and engineering systems.', teacher: 'A. Weerasekara', units: [] },
      { title: 'Science for Technology', description: 'Science concepts for technical pathways.', teacher: 'D. Wijesinghe', units: [] },
      { title: 'ICT', description: 'Digital tools and modern communication.', teacher: 'F. Abeysinghe', units: [] },
    ],
  },
  {
    id: 'arts',
    name: 'Arts Stream',
    modules: [
      { title: 'Geography', description: 'Physical and human geography.', teacher: 'H. Karunaratne', units: [] },
      { title: 'Arts', description: 'Visual expression and cultural studies.', teacher: 'I. Peiris', units: [] },
      { title: 'History', description: 'Historical contexts and interpretation.', teacher: 'B. Ekanayake', units: [] },
      { title: 'Politics', description: 'Political systems and civic participation.', teacher: 'G. Rathnayake', units: [] },
      { title: 'More Coming Soon', description: 'Additional arts modules are being prepared.', teacher: 'Curriculum Team', units: [] },
    ],
  },
]

const GRADE_PLANS: GradePlan[] = [
  { id: 'grade-1', name: 'Grade 1', subjects: SUBJECTS_G1_TO_3 },
  { id: 'grade-2', name: 'Grade 2', subjects: SUBJECTS_G1_TO_3 },
  { id: 'grade-3', name: 'Grade 3', subjects: SUBJECTS_G1_TO_3 },
  { id: 'grade-4', name: 'Grade 4', subjects: SUBJECTS_G4_TO_5 },
  { id: 'grade-5', name: 'Grade 5', subjects: SUBJECTS_G4_TO_5 },
  { id: 'grade-6', name: 'Grade 6', subjects: SUBJECTS_G6_TO_9 },
  { id: 'grade-7', name: 'Grade 7', subjects: SUBJECTS_G6_TO_9 },
  { id: 'grade-8', name: 'Grade 8', subjects: SUBJECTS_G6_TO_9 },
  { id: 'grade-9', name: 'Grade 9', subjects: SUBJECTS_G6_TO_9 },
  { id: 'grade-10', name: 'Grade 10', subjects: SUBJECTS_G10_TO_11 },
  { id: 'grade-11', name: 'Grade 11', subjects: SUBJECTS_G10_TO_11 },
  { id: 'grade-12', name: 'Grade 12', streams: BASE_STREAMS },
  { id: 'grade-13', name: 'Grade 13', streams: BASE_STREAMS },
  { id: 'a-l', name: 'A/L', streams: BASE_STREAMS },
]

const MODULE_TEACHERS: Record<string, string> = {
  Mathematics: 'S. Perera',
  Tamil: 'J. Nadarajah',
  Environment: 'R. Kumari',
  English: 'M. Silva',
  Sinhala: 'P. Wijeratne',
  Religion: 'A. Fernando',
  Science: 'N. Gunasekara',
  Civics: 'D. Mendis',
  Geography: 'K. Jayawardena',
  PT: 'V. Karunaratne',
  History: 'I. Rathnayake',
  Health: 'H. Liyanage',
  Commerce: 'B. Jayasinghe',
  'English Literature': 'T. Wickramasinghe',
  'Tamil Literature': 'S. Sathasivam',
  'Arabic Literature': 'A. Hameed',
  Arabic: 'F. Azeez',
  IT: 'R. Wijesekara',
  Art: 'M. Fernando',
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function toTitleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function getFirstName(name: string | null | undefined) {
  if (!name) return 'Student'
  return name.trim().split(/\s+/)[0] || 'Student'
}

function initials(name: string | null | undefined) {
  if (!name) return 'S'
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function createUnits(subject: string): Unit[] {
  return [1, 2, 3].map((index) => {
    const base = `${slugify(subject)}-u${index}`
    return {
      id: base,
      index,
      name: `Unit ${index}: ${subject} Focus`,
      resources: [
        {
          id: `${base}-tute`,
          kind: 'tute',
          title: `${subject} Tute ${index}`,
          url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        },
        {
          id: `${base}-paper`,
          kind: 'paper',
          title: `${subject} Paper ${index}`,
          url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        },
        {
          id: `${base}-video`,
          kind: 'video',
          title: `${subject} Video ${index}`,
          url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        },
      ],
    }
  })
}

function modulesForGrade(grade: GradePlan, streamId?: string): Module[] {
  if (grade.streams?.length) {
    if (!streamId) return []
    const stream = grade.streams.find((item) => item.id === streamId)
    if (!stream) return []
    return stream.modules.map((module) => ({
      id: `${grade.id}-${stream.id}-${slugify(module.title)}`,
      title: module.title,
      description: module.description,
      teacher: module.teacher,
      gradeName: grade.name,
      stream: stream.name,
      units: createUnits(module.title),
    }))
  }

  return (grade.subjects ?? []).map((subject) => ({
    id: `${grade.id}-${slugify(subject)}`,
    title: subject,
    description: `${subject} lessons and revision for ${grade.name}.`,
    teacher: MODULE_TEACHERS[subject] ?? 'School Teacher',
    gradeName: grade.name,
    units: createUnits(subject),
  }))
}

function allTeacherCards() {
  const teacherMap = new Map<string, { name: string; subjects: string[]; grades: string[] }>()

  GRADE_PLANS.forEach((grade) => {
    const streams = grade.streams ?? []

    if (streams.length) {
      streams.forEach((stream) => {
        stream.modules.forEach((module) => {
          const record = teacherMap.get(module.teacher) ?? { name: module.teacher, subjects: [], grades: [] }
          if (!record.subjects.includes(module.title)) record.subjects.push(module.title)
          if (!record.grades.includes(grade.name)) record.grades.push(grade.name)
          teacherMap.set(module.teacher, record)
        })
      })
      return
    }

    ;(grade.subjects ?? []).forEach((subject) => {
      const teacher = MODULE_TEACHERS[subject] ?? 'School Teacher'
      const record = teacherMap.get(teacher) ?? { name: teacher, subjects: [], grades: [] }
      if (!record.subjects.includes(subject)) record.subjects.push(subject)
      if (!record.grades.includes(grade.name)) record.grades.push(grade.name)
      teacherMap.set(teacher, record)
    })
  })

  return [...teacherMap.values()]
}

function useAuthBootstrap() {
  const setSession = useAuthStore((state) => state.setSession)
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let mounted = true

    const run = async () => {
      const url = new URL(window.location.href)
      if (url.searchParams.has('code')) {
        await supabase.auth.exchangeCodeForSession(window.location.href)
      }
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      setSession(data.session)
      setReady(true)
    }

    void run()

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setSession(session)
      else clearAuth()
    })

    return () => {
      mounted = false
      data.subscription.unsubscribe()
    }
  }, [clearAuth, setSession])

  return ready
}

function Spinner() {
  return (
    <div className="loading-screen">
      <Loader2 className="spinner" size={24} />
    </div>
  )
}

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const token = useAuthStore((state) => state.token)
  if (!token) return <Navigate to="/login" replace />
  return children
}

function AppShell({ title, children }: { title: string; children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user)
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const navigate = useNavigate()

  const signOut = async () => {
    await supabase.auth.signOut()
    clearAuth()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-page">
      <Sidebar name={user?.name ?? 'Student'} email={user?.email ?? 'student@example.com'} onSignOut={signOut} />
      <div className="main-column">
        <Topbar title={title} />
        <main className="app-main">{children}</main>
      </div>
      <BottomTabBar />
    </div>
  )
}

function GradeGrid({ plans }: { plans: GradePlan[] }) {
  return (
    <section className="grade-grid grade-grid-main">
      {plans.map((plan) => {
        const moduleCount = plan.streams?.length ? plan.streams.reduce((sum, stream) => sum + stream.modules.length, 0) : plan.subjects?.length ?? 0
        return (
          <Link key={plan.id} to={`/grades/${plan.id}`} className="grade-card-link">
            <article className="grade-card card-hover grade-card-cool">
              <h3 style={{ textAlign: 'center' }}>{plan.name}</h3>
              <p className="grade-meta" style={{ textAlign: 'center', margin: '8px 0 0' }}>{moduleCount} modules</p>
              <button className="primary-button full-width" type="button" style={{ marginTop: 14 }}>Explore</button>
            </article>
          </Link>
        )
      })}
    </section>
  )
}

function LoginPage() {
  const token = useAuthStore((state) => state.token)
  const setSession = useAuthStore((state) => state.setSession)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (token) return <Navigate to="/dashboard" replace />

  const onSubmit = async () => {
    setError(null)
    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        })
        if (signUpError) throw signUpError
        if (data.session) setSession(data.session)
        return
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError
      if (data.session) setSession(data.session)
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Sign in failed')
    }
  }

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } })
  }

  return (
    <div className="auth-shell">
      <div className="auth-card login-card">
        <h1 style={{ color: 'var(--brand)', marginBottom: 6 }}>Ready to learn?</h1>
        <p className="muted" style={{ marginTop: 0 }}>Your grades, modules, and resources — all in one place.</p>

        <div className="field-stack" style={{ marginTop: 18 }}>
          <label className="field-stack">
            <span className="sidebar-label">Name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
          </label>
          <label className="field-stack">
            <span className="sidebar-label">Email</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" />
          </label>
          <label className="field-stack">
            <span className="sidebar-label">Password</span>
            <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" type="password" />
          </label>
        </div>

        {error ? <p className="error">{error}</p> : null}

        <button className="primary-button full-width" type="button" onClick={onSubmit}>{mode === 'signin' ? 'Sign In' : 'Create Account'}</button>

        <div className="divider" />
        <p className="muted" style={{ textAlign: 'center', margin: 0 }}>or</p>
        <div className="divider" />

        <button className="secondary-button full-width" type="button" onClick={signInWithGoogle}>Continue with Google</button>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <button className="link-button" type="button" onClick={() => setMode((value) => (value === 'signin' ? 'signup' : 'signin'))}>
            {mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DashboardPage() {
  const user = useAuthStore((state) => state.user)

  return (
    <AppShell title="Dashboard">
      <section className="page-card welcome-card">
        <h2 style={{ fontSize: 24, marginBottom: 6 }}>{getGreeting()}, {getFirstName(user?.name)}</h2>
        <p className="muted">What are you studying today?</p>
      </section>
      <GradeGrid plans={GRADE_PLANS} />
    </AppShell>
  )
}

function LearningPage() {
  return (
    <AppShell title="Choose your grade">
      <section className="page-card" style={{ marginBottom: 16 }}>
        <p className="muted" style={{ margin: 0 }}>No learning path selected yet.</p>
      </section>
      <GradeGrid plans={GRADE_PLANS} />
    </AppShell>
  )
}

function GradeDetailPage() {
  const { gradeId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const grade = GRADE_PLANS.find((item) => item.id === gradeId)
  const streamId = searchParams.get('stream') ?? undefined

  if (!grade) return <Navigate to="/learning" replace />

  const modules = modulesForGrade(grade, streamId)

  return (
    <AppShell title={grade.name}>
      <div className="breadcrumb-row">
        <div className="breadcrumb">
          <Link to="/learning">Learning</Link>
          <ChevronRight size={14} />
          <span>{grade.name}</span>
        </div>
      </div>

      {grade.streams?.length ? (
        <section className="page-card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 10 }}>Select a stream</h3>
          <div className="chip-row">
            {grade.streams.map((stream) => (
              <button
                key={stream.id}
                className={`chip-button${streamId === stream.id ? ' active' : ''}`}
                type="button"
                onClick={() => setSearchParams({ stream: stream.id })}
              >
                {stream.name}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="module-grid module-grid-main">
        {modules.map((module) => (
          <article key={module.id} className="module-card card-hover">
            <div className="split-header">
              <div>
                <h3>{module.title}</h3>
                <div className="card-row" style={{ marginTop: 8 }}>
                  <span className="avatar-circle">{initials(module.teacher)}</span>
                  <span className="teacher-meta">{module.teacher}</span>
                </div>
              </div>
              <span className="pill success-pill">{module.units.length} Units</span>
            </div>
            <p className="muted module-meta">{module.description}</p>
            <div className="toolbar-row" style={{ marginTop: 16 }}>
              <Link to={`/grades/${grade.id}/modules/${module.id}`} className="primary-button">Open</Link>
            </div>
          </article>
        ))}
      </section>
    </AppShell>
  )
}

function ModuleDetailPage() {
  const navigate = useNavigate()
  const { gradeId, moduleId } = useParams()
  const [searchParams] = useSearchParams()
  const grade = GRADE_PLANS.find((item) => item.id === gradeId)
  if (!grade || !moduleId) return <Navigate to="/learning" replace />

  const modules = modulesForGrade(grade, searchParams.get('stream') ?? undefined)
  const module = modules.find((item) => item.id === moduleId)
  if (!module) return <Navigate to={`/grades/${grade.id}`} replace />

  const resourceCount = module.units.reduce((sum, unit) => sum + unit.resources.length, 0)

  return (
    <AppShell title={module.title}>
      <div className="breadcrumb-row">
        <div className="breadcrumb">
          <Link to="/learning">Learning</Link>
          <ChevronRight size={14} />
          <Link to={`/grades/${grade.id}`}>{grade.name}</Link>
          <ChevronRight size={14} />
          <span>{module.title}</span>
        </div>
      </div>

      <div className="two-column-grid">
        <div className="resource-list">
          {module.units.map((unit) => (
            <AccordionUnit
              key={unit.id}
              unit={unit}
              onOpenResource={(resourceId) => navigate(`/resource/${resourceId}`)}
            />
          ))}
        </div>

        <aside className="column-card sticky-side">
          <h3>{module.title}</h3>
          <p className="muted" style={{ marginTop: 8 }}>{module.description}</p>
          <div className="divider" />
          <div className="card-row">
            <span className="pill">Teacher: {module.teacher}</span>
            <span className="pill">{resourceCount} resources</span>
          </div>
        </aside>
      </div>
    </AppShell>
  )
}

function AccordionUnit({ unit, onOpenResource }: { unit: Unit; onOpenResource: (resourceId: string) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <article className="column-card">
      <button className="accordion-trigger" type="button" onClick={() => setOpen((state) => !state)}>
        <div className="card-row" style={{ justifyContent: 'space-between', width: '100%' }}>
          <div className="card-row">
            <span className="pill">Unit {unit.index}</span>
            <strong>{unit.name}</strong>
          </div>
          {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </div>
      </button>

      {open ? (
        <div className="resource-list" style={{ marginTop: 12 }}>
          {unit.resources.map((resource) => (
            <article key={resource.id} className="resource-card">
              <div className="card-row">
                <span className={`resource-badge ${resource.kind}`}>
                  {resource.kind === 'tute' ? <FileText size={16} /> : resource.kind === 'paper' ? <FileBarChart2 size={16} /> : <Play size={16} />}
                </span>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 14 }}>{resource.title}</h3>
                  <p className="resource-meta" style={{ margin: '4px 0 0' }}>{toTitleCase(resource.kind)}</p>
                </div>
                <button className="secondary-button" type="button" onClick={() => onOpenResource(resource.id)}>Open</button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </article>
  )
}

function findResource(resourceId?: string) {
  for (const grade of GRADE_PLANS) {
    const streamSets = grade.streams?.map((stream) => stream.id) ?? [undefined]
    for (const streamId of streamSets) {
      const modules = modulesForGrade(grade, streamId)
      for (const module of modules) {
        for (const unit of module.units) {
          const resource = unit.resources.find((item) => item.id === resourceId)
          if (resource) {
            return { grade, module, unit, resource }
          }
        }
      }
    }
  }
  return undefined
}

function UnitPage() {
  const navigate = useNavigate()
  const { unitId } = useParams()
  const [filter, setFilter] = useState<'all' | ResourceKind>('all')

  const bundle = useMemo(() => {
    if (!unitId) return undefined
    for (const grade of GRADE_PLANS) {
      const streamSets = grade.streams?.map((stream) => stream.id) ?? [undefined]
      for (const streamId of streamSets) {
        const modules = modulesForGrade(grade, streamId)
        for (const module of modules) {
          const unit = module.units.find((item) => item.id === unitId)
          if (unit) return { grade, module, unit }
        }
      }
    }
    return undefined
  }, [unitId])

  if (!bundle) return <Navigate to="/learning" replace />

  const resources = filter === 'all' ? bundle.unit.resources : bundle.unit.resources.filter((item) => item.kind === filter)

  return (
    <AppShell title={bundle.unit.name}>
      <div className="breadcrumb-row">
        <div className="breadcrumb">
          <Link to="/learning">Learning</Link>
          <ChevronRight size={14} />
          <Link to={`/grades/${bundle.grade.id}`}>{bundle.grade.name}</Link>
          <ChevronRight size={14} />
          <span>{bundle.unit.name}</span>
        </div>
      </div>

      <div className="tabs-row" style={{ marginBottom: 16 }}>
        {(['all', 'tute', 'paper', 'video'] as const).map((value) => (
          <button key={value} className={`tab-button${filter === value ? ' active' : ''}`} type="button" onClick={() => setFilter(value)}>
            {value === 'all' ? 'All' : value === 'tute' ? 'Tutes' : value === 'paper' ? 'Papers' : 'Videos'}
          </button>
        ))}
      </div>

      <section className="resource-list">
        {resources.map((resource) => (
          <article key={resource.id} className="resource-card">
            <div className="card-row">
              <span className={`resource-badge ${resource.kind}`}>
                {resource.kind === 'tute' ? <FileText size={16} /> : resource.kind === 'paper' ? <FileBarChart2 size={16} /> : <Play size={16} />}
              </span>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 14 }}>{resource.title}</h3>
                <p className="resource-meta" style={{ margin: '4px 0 0' }}>{toTitleCase(resource.kind)}</p>
              </div>
              <button className="secondary-button" type="button" onClick={() => navigate(`/resource/${resource.id}`)}>Open</button>
            </div>
          </article>
        ))}
      </section>
    </AppShell>
  )
}

function ResourceViewerPage() {
  const navigate = useNavigate()
  const { resourceId } = useParams()
  const bundle = findResource(resourceId)

  if (!bundle) return <Navigate to="/learning" replace />

  const others = bundle.unit.resources.filter((item) => item.id !== bundle.resource.id)

  return (
    <AppShell title={bundle.resource.title}>
      <div className="two-column-grid">
        <section className="page-card">
          {bundle.resource.kind === 'video' ? (
            <iframe className="viewer-frame" src={bundle.resource.url} title={bundle.resource.title} allow="autoplay; encrypted-media" />
          ) : (
            <iframe className="viewer-frame" src={bundle.resource.url} title={bundle.resource.title} />
          )}
        </section>
        <aside className="column-card sticky-side">
          <h3>Other resources in this unit</h3>
          <div className="resource-list" style={{ marginTop: 12 }}>
            {others.map((item) => (
              <article key={item.id} className="resource-card">
                <div className="card-row">
                  <span className={`resource-badge ${item.kind}`}>
                    {item.kind === 'tute' ? <FileText size={16} /> : item.kind === 'paper' ? <FileBarChart2 size={16} /> : <Play size={16} />}
                  </span>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 14 }}>{item.title}</h3>
                  </div>
                  <button className="secondary-button" type="button" onClick={() => navigate(`/resource/${item.id}`)}>Open</button>
                </div>
              </article>
            ))}
          </div>
        </aside>
      </div>
    </AppShell>
  )
}

function TeachersPage() {
  const teachers = allTeacherCards()

  return (
    <AppShell title="Teachers">
      <section className="teacher-grid teacher-grid-main">
        {teachers.map((teacher) => (
          <article key={teacher.name} className="teacher-card card-hover">
            <div className="card-row" style={{ marginBottom: 10 }}>
              <span className="avatar-circle">{initials(teacher.name)}</span>
              <h3>{teacher.name}</h3>
            </div>
            <div className="card-row" style={{ marginBottom: 10 }}>
              {teacher.subjects.slice(0, 4).map((subject) => (
                <span key={subject} className="pill subject-pill">{subject}</span>
              ))}
            </div>
            <div className="card-row">
              {teacher.grades.slice(0, 4).map((grade) => (
                <span key={grade} className="pill grade-pill">{grade}</span>
              ))}
            </div>
          </article>
        ))}
      </section>
    </AppShell>
  )
}

function ProfilePage() {
  const [name, setName] = useState(useAuthStore.getState().user?.name ?? 'Student')
  const [photoPreview, setPhotoPreview] = useState<string | null>(useAuthStore.getState().user?.photoUrl ?? null)
  const user = useAuthStore((state) => state.user)
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const navigate = useNavigate()

  const onUploadPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoPreview(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    clearAuth()
    navigate('/login', { replace: true })
  }

  return (
    <AppShell title="Profile">
      <section className="page-card profile-shell profile-card-main">
        <div style={{ display: 'grid', justifyItems: 'center', gap: 12 }}>
          {photoPreview ? (
            <img src={photoPreview} alt="Profile" className="avatar-img" />
          ) : (
            <div className="avatar avatar-lg">{initials(name || user?.email)}</div>
          )}

          <label className="secondary-button" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Upload size={16} />
            Profile Picture
            <input type="file" accept="image/*" onChange={onUploadPhoto} style={{ display: 'none' }} />
          </label>
        </div>

        <div className="field-stack" style={{ marginTop: 18 }}>
          <label className="field-stack">
            <span className="sidebar-label">Name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="field-stack">
            <span className="sidebar-label">Email</span>
            <input value={user?.email ?? ''} disabled />
          </label>
        </div>

        <div className="card-row" style={{ marginTop: 14, justifyContent: 'center' }}>
          <span className="pill success-pill">{user?.role ?? 'student'}</span>
        </div>

        <div className="divider" />

        <div className="card-row" style={{ justifyContent: 'center' }}>
          <button className="primary-button" type="button">Edit Profile</button>
        </div>

        <button className="ghost-button full-width" type="button" onClick={signOut} style={{ marginTop: 12, borderColor: 'var(--danger)', color: 'var(--danger)' }}>
          Sign Out
        </button>
      </section>
    </AppShell>
  )
}

function NotFoundPage() {
  return (
    <div className="auth-shell">
      <div className="auth-card login-card">
        <h1>Page not found</h1>
        <p className="muted">Let’s get you back to your learning space.</p>
        <Link className="primary-button" to="/dashboard">Go to Dashboard</Link>
      </div>
    </div>
  )
}

export default function AppRouter() {
  const ready = useAuthBootstrap()

  if (!ready) return <Spinner />

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<Spinner />} />
      <Route path="/" element={<ProtectedRoute><Navigate to="/dashboard" replace /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/learning" element={<ProtectedRoute><LearningPage /></ProtectedRoute>} />
      <Route path="/grades" element={<ProtectedRoute><Navigate to="/learning" replace /></ProtectedRoute>} />
      <Route path="/grades/:gradeId" element={<ProtectedRoute><GradeDetailPage /></ProtectedRoute>} />
      <Route path="/grades/:gradeId/modules/:moduleId" element={<ProtectedRoute><ModuleDetailPage /></ProtectedRoute>} />
      <Route path="/grades/:gradeId/modules/:moduleId/units/:unitId" element={<ProtectedRoute><UnitPage /></ProtectedRoute>} />
      <Route path="/resource/:resourceId" element={<ProtectedRoute><ResourceViewerPage /></ProtectedRoute>} />
      <Route path="/teachers" element={<ProtectedRoute><TeachersPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
