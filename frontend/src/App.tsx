import { login, logout } from './services/authService'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import './App.css'
import { patientService } from './services/patientService'
import { mockUser } from './services/mockdata'
import ClinicianDashboard from './features/providers/ClinicianDashboard'
import SymptomIntake from './features/symptoms/SymptomIntake'
import FindDoctor from './features/doctors/FindDoctor'
import PatientTimeline from './features/timeline/PatientTimeline'
import VitalsAlerts from './features/monitoring/VitalsAlerts'
import type {
  PatientProfile,
  VitalReading,
  PatientAlert,
} from './types/healthcare'

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
const [loginError, setLoginError] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const [activePage, setActivePage] = useState('Dashboard')
  const [patient, setPatient] = useState<PatientProfile | null>(null)
const [vitals, setVitals] = useState<VitalReading[]>([])
const [alerts, setAlerts] = useState<PatientAlert[]>([])
const [dataLoading, setDataLoading] = useState(false)
const [dataError, setDataError] = useState('')

const [notificationsOpen, setNotificationsOpen] = useState(false)
const [readNotifications, setReadNotifications] = useState<number[]>([])
const notificationRef = useRef<HTMLDivElement>(null)
const [profileMenuOpen, setProfileMenuOpen] = useState(false)
const profileMenuRef = useRef<HTMLDivElement>(null)
const [globalSearch, setGlobalSearch] = useState('')
const [searchOpen, setSearchOpen] = useState(false)

const demoNotifications = [
  {
    id: 1,
    title: 'Vitals updated',
    message: 'Your demo vital readings are available.',
    time: '10 minutes ago',
  },
  {
    id: 2,
    title: 'Health record ready',
    message: 'Your demo patient timeline has been updated.',
    time: '30 minutes ago',
  },
  {
    id: 3,
    title: 'Reminder',
    message: 'Review your health information in CareBridge.',
    time: '1 hour ago',
  },
]

const searchItems = [
  {
    title: 'Dashboard',
    description: 'Your healthcare overview',
    page: 'Dashboard',
  },
  {
    title: 'Symptom Intake',
    description: 'Record symptoms and notes',
    page: 'Symptom Intake',
  },
  {
    title: 'Find a Doctor',
    description: 'Search healthcare providers',
    page: 'Find a Doctor',
  },
  {
    title: 'Patient Timeline',
    description: 'View visits and health records',
    page: 'Patient Timeline',
  },
  {
    title: 'Vitals & Alerts',
    description: 'View vital readings and alerts',
    page: 'Vitals & Alerts',
  },
  {
    title: 'Clinician Dashboard',
    description: 'Open the clinician workspace',
    page: 'Clinician Dashboard',
  },
]

const filteredSearchItems = searchItems.filter((item) =>
  `${item.title} ${item.description}`
    .toLowerCase()
    .includes(globalSearch.trim().toLowerCase())
)

useEffect(() => {
  if (!notificationsOpen) return

  function handleOutsideClick(event: MouseEvent) {
    if (
      notificationRef.current &&
      !notificationRef.current.contains(event.target as Node)
    ) {
      setNotificationsOpen(false)
    }
  }

  document.addEventListener('mousedown', handleOutsideClick)

  return () => {
    document.removeEventListener('mousedown', handleOutsideClick)
  }
}, [notificationsOpen])
useEffect(() => {
  if (!profileMenuOpen) return

  function handleProfileOutsideClick(event: MouseEvent) {
    if (
      profileMenuRef.current &&
      !profileMenuRef.current.contains(event.target as Node)
    ) {
      setProfileMenuOpen(false)
    }
  }

  document.addEventListener('mousedown', handleProfileOutsideClick)

  return () => {
    document.removeEventListener('mousedown', handleProfileOutsideClick)
  }
}, [profileMenuOpen])

useEffect(() => {
  if (!loggedIn) return

  let cancelled = false

  async function loadDashboard() {
    setDataLoading(true)
    setDataError('')

    try {
      const [profile, readings, patientAlerts] = await Promise.all([
        patientService.getProfile(),
        patientService.getVitals(),
        patientService.getAlerts(),
      ])

      if (cancelled) return

      setPatient(profile)
      setVitals(readings)
      setAlerts(patientAlerts)
    } catch {
      if (!cancelled) {
        setDataError('Unable to load demo dashboard data.')
      }
    } finally {
      if (!cancelled) setDataLoading(false)
    }
  }

  void loadDashboard()

  return () => {
    cancelled = true
  }
}, [loggedIn])


async function handleLogin(event: FormEvent<HTMLFormElement>) {
  event.preventDefault()
  setLoginError('')
  setLoginLoading(true)

  try {
    await login(email, password)
    setLoggedIn(true)
  } catch (error) {
    setLoginError(
      error instanceof Error
        ? error.message
        : 'Unable to sign in. Please try again.',
    )
  } finally {
    setLoginLoading(false)
  }
}

  if (!loggedIn) {
    return (
      <main className="login-page">
        <section className="login-card">
          <div className="brand">
            <div className="brand-icon">+</div>
            <span>CareBridge</span>
          </div>

          <p className="eyebrow">PRIVACY-AWARE CLINICAL CARE</p>
          <h1>Welcome back</h1>
          <p className="subtitle">
            Sign in to access your healthcare workspace.
          </p>

          <form onSubmit={handleLogin}>
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

          <button type="submit" disabled={loginLoading}>
  {loginLoading ? 'Signing in...' : 'Sign in'}
</button>
          </form>
          {loginError && (
  <p role="alert" className="login-error">
    {loginError}
  </p>
)}

          <p className="privacy-note">
            Your health information deserves privacy and care.
          </p>
        <p className="demo-note">
  Secure sign-in · Monitoring data is synthetic demo data
</p>
        </section>
      </main>
    )
  }

  const menuItems = [
    'Dashboard',
    'Symptom Intake',
    'Find a Doctor',
    'Patient Timeline',
    'Vitals & Alerts',
    'Clinician Dashboard',
  ]


  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">+</div>
          <span>CareBridge</span>
        </div>

        <p className="menu-label">PATIENT MENU</p>

        <nav>
          {menuItems.map((item) => (
            <button
              key={item}
              className={`nav-item ${activePage === item ? 'active' : ''}`}
              onClick={() => setActivePage(item)}
            >
              {item}
            </button>
          ))}
        </nav>

        <button
          className="logout-button"
        onClick={() => {
  logout()
  setLoggedIn(false)
  setPassword('')
  setActivePage('Dashboard')
}}
        >
          Log out
        </button>
      </aside>

      <main className="dashboard-main">
     
<header className="topbar">
  <div>
    <p className="eyebrow">YOUR HEALTHCARE WORKSPACE</p>
    <h2>{activePage}</h2>
  </div>

<div className="global-search">
  <span className="global-search-icon" aria-hidden="true">⌕</span>

  <input
    type="search"
    value={globalSearch}
    placeholder="Search CareBridge..."
    aria-label="Search CareBridge sections"
    aria-expanded={searchOpen && globalSearch.trim().length > 0}
    onFocus={() => setSearchOpen(true)}
    onChange={(event) => {
      setGlobalSearch(event.target.value)
      setSearchOpen(true)
    }}
    onKeyDown={(event) => {
      if (event.key === 'Escape') {
        setSearchOpen(false)
        setGlobalSearch('')
      }

      if (event.key === 'Enter' && filteredSearchItems.length > 0) {
        setActivePage(filteredSearchItems[0].page)
        setGlobalSearch('')
        setSearchOpen(false)
      }
    }}
  />

  {globalSearch && (
    <button
      type="button"
      className="global-search-clear"
      aria-label="Clear search"
      onClick={() => {
        setGlobalSearch('')
        setSearchOpen(true)
      }}
    >
      ×
    </button>
  )}

  {searchOpen && globalSearch.trim() && (
    <div className="global-search-results">
      {filteredSearchItems.length > 0 ? (
        filteredSearchItems.map((item) => (
          <button
            type="button"
            key={item.page}
            className="global-search-result"
            onClick={() => {
              setActivePage(item.page)
              setGlobalSearch('')
              setSearchOpen(false)
            }}
          >
            <strong>{item.title}</strong>
            <span>{item.description}</span>
          </button>
        ))
      ) : (
        <p className="global-search-empty">
          No matching CareBridge sections found.
        </p>
      )}
    </div>
  )}
</div>

  <div className="topbar-actions">
   <div className="notification-wrapper" ref={notificationRef}>

<button
  type="button"
  className="notification-button"
  aria-label="Notifications"
  title="Notifications"
  aria-expanded={notificationsOpen}
  onClick={() => setNotificationsOpen(!notificationsOpen)}
>
  <span aria-hidden="true">🔔</span>

  {demoNotifications.length - readNotifications.length > 0 && (
    <span className="notification-count">
      {demoNotifications.length - readNotifications.length}
    </span>
  )}
</button>

{notificationsOpen && (
  <div className="notification-dropdown">
    <div className="notification-dropdown-header">
      <strong>Notifications</strong>

      <button
        type="button"
        className="mark-read-button"
        onClick={() =>
          setReadNotifications(demoNotifications.map((item) => item.id))
        }
      >
        Mark all read
      </button>
    </div>

    {demoNotifications.map((notification) => {
      const isRead = readNotifications.includes(notification.id)

      return (
        <div
          key={notification.id}
          className={`notification-item ${isRead ? 'is-read' : ''}`}
        >
          <span className="notification-dot" />
          <div>
            <strong>{notification.title}</strong>
            <p>{notification.message}</p>
            <small>{notification.time}</small>
          </div>
        </div>
      )
    })}
  </div>
)}</div>


  
<div className="profile-menu-container" ref={profileMenuRef}>
  <button
    type="button"
    className="profile profile-menu-trigger"
    aria-expanded={profileMenuOpen}
    aria-label="Open patient profile menu"
    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
  >
    <div className="avatar">
      {(mockUser.full_name)
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()}
    </div>

    <div className="profile-text">
      <strong>{mockUser.full_name ?? 'Loading profile...'}</strong>
      <p>Patient account · Demo</p>
    </div>

    <span className="profile-chevron" aria-hidden="true">
      {profileMenuOpen ? '▲' : '▼'}
    </span>
  </button>

  {profileMenuOpen && (
    <div className="profile-dropdown">
      <div className="profile-dropdown-heading">
        <strong>{mockUser.full_name ?? 'Demo Patient'}</strong>
        <span>Patient account</span>
      </div>

      <button
        type="button"
        onClick={() => {
          setProfileMenuOpen(false)
          setActivePage('Dashboard')
        }}
      >
        <span>◉</span>
        View dashboard
      </button>

      <div className="profile-demo-note">
        Demo account · Profile settings are not connected yet.
      </div>

      <button
        type="button"
        className="profile-logout-option"
        onClick={() => {
          setProfileMenuOpen(false)
          setLoggedIn(false)
        }}
      >
        <span>↪</span>
        Log out
      </button>
    </div>
  )}
</div>
    </div>
</header>

        

{activePage === 'Vitals & Alerts' ? (
  <VitalsAlerts />
) : activePage === 'Patient Timeline' ? (
  <PatientTimeline />
) : activePage === 'Find a Doctor' ? (
  <FindDoctor />
) : activePage === 'Symptom Intake' ? (
  <SymptomIntake />
) : activePage === 'Clinician Dashboard' ? (
  <ClinicianDashboard
    patients={patient ? [patient] : []}
  />
) : activePage === 'Dashboard' ? (


          <>
          
<section className="welcome-banner">
  <div className="welcome-content">
    <p>YOUR HEALTH, ALL IN ONE PLACE</p>
    <h1>Welcome to CareBridge!</h1>
    <span>
      Your healthcare information, organized in one convenient workspace.
    </span>

    <div className="welcome-badge">
      <span className="welcome-status-dot"></span>
      Demo workspace active
    </div>
  </div>

  <div className="welcome-symbol" aria-hidden="true">
    +
  </div>
</section>


            <h3 className="section-title">Quick access</h3>


{dataLoading && (
  <p className="notice">Loading healthcare data...</p>
)}

{dataError && (
  <p className="notice">{dataError}</p>
)}

{patient && (
  <section className="dashboard-data profile-card">
    <h3>Patient Profile</h3>
  <p><strong>Name:</strong> {mockUser.full_name}</p>
    <p>
      <strong>Date of birth:</strong>{' '}
      {patient.date_of_birth || 'Not available'}
    </p>
  </section>
)}

<section className="dashboard-grid">
  <div className="feature-card teal-card">
    <h3>Vitals & Monitoring</h3>

    {vitals.length === 0 ? (
      <p>No vitals available yet.</p>
    ) : (
     
vitals.map((vital) => (
  <div className="vital-reading" key={vital.id}>
    <div className="vital-reading-header">
      <strong>{vital.type}</strong>
      <span className="vital-value">
        {vital.value} {vital.unit}
      </span>
    </div>

    <small className="vital-timestamp">
      Recorded:{' '}
      {new Date(vital.recorded_at).toLocaleString()}
    </small>
  </div>
))

    )}
  </div>

  <div className="feature-card orange-card">
    <h3>Patient Alerts</h3>

    {alerts.length === 0 ? (
      <p>No alerts available.</p>
    ) : (
      alerts.map((alert) => (
        <div key={alert.id}>
          <p>
            <strong>
              {alert.severity.toUpperCase()} ALERT
            </strong>
          </p>
          <p>{alert.reason}</p>
          <p>Status: {alert.status}</p>
          <small>Created: {alert.created_at}</small>
        </div>
      ))
    )}
  </div>
</section>



            <section className="dashboard-grid">
              <button
                className="feature-card teal-card"
                onClick={() => setActivePage('Symptom Intake')}
              >
                <span className="card-icon">✚</span>
                <h3>Symptom Intake</h3>
                <p>Record symptoms and prepare for a provider search.</p>
                <span className="card-link">Open section →</span>
              </button>

              <button
                className="feature-card blue-card"
                onClick={() => setActivePage('Find a Doctor')}
              >
                <span className="card-icon">⚕</span>
                <h3>Find a Doctor</h3>
                <p>Explore the provider search interface.</p>
                <span className="card-link">Open section →</span>
              </button>

              <button
                className="feature-card purple-card"
                onClick={() => setActivePage('Patient Timeline')}
              >
                <span className="card-icon">▤</span>
                <h3>Patient Timeline</h3>
                <p>View where clinical events will appear.</p>
                <span className="card-link">Open section →</span>
              </button>

              <button
                className="feature-card orange-card"
                onClick={() => setActivePage('Vitals & Alerts')}
              >
                <span className="card-icon">♡</span>
                <h3>Vitals & Alerts</h3>
                <p>Explore the monitoring interface.</p>
                <span className="card-link">Open section →</span>
              </button>
            </section>

            
<section className="notice">
  <strong>Demo environment</strong>
  <p>
    Synthetic demonstration data only. These readings and alerts
    are fictional and must not be used for medical decisions.
  </p>
</section>

<section className="dashboard-data">
  <h3>Monitoring overview</h3>

  {dataLoading && <p>Loading demo data...</p>}

  {dataError && <p role="alert">{dataError}</p>}

  {!dataLoading && !dataError && (
    <>
      <h4>Vitals</h4>

      {vitals.length === 0 ? (
        <p>No demo readings available.</p>
      ) : (
        <div className="data-list">
          {vitals.map((vital) => (
            <article className="data-item" key={vital.id}>
              <strong>{vital.type}</strong>
              <span>{vital.value} {vital.unit}</span>
              <small>
                Demo reading · {new Date(vital.recorded_at).toLocaleString()}
              </small>
            </article>
          ))}
        </div>
      )}

      <h4>Alerts</h4>

      {alerts.length === 0 ? (
        <p>No demo alerts available.</p>
      ) : (
        <div className="data-list">
          {alerts.map((alert) => (
            <article className="data-item" key={alert.id}>
              <strong>{alert.reason}</strong>
              <span>Severity: {alert.severity}</span>
              <small>
                {alert.status} · {new Date(alert.created_at).toLocaleString()}
              </small>
            </article>
          ))}
        </div>
      )}
    </>
  )}
</section>

          </>
        ) : (
          <section className="placeholder-page">
            <div className="placeholder-icon">+</div>
            <h2>{activePage}</h2>
            <p>
              This section is part of the frontend prototype. We'll build
              its features step by step.
            </p>
            <button onClick={() => setActivePage('Dashboard')}>
              Back to dashboard
            </button>
            <p className="demo-note">
              No real patient data is being displayed.
            </p>
          </section>
        )}
      </main>
    </div>
  )
}

export default App