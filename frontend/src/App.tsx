import { useEffect, useState, type FormEvent } from 'react'
import './App.css'
import { login, logout } from './services/authService'
import { patientService } from './services/patientService'
import type {
  PatientProfile,
  VitalReading,
  PatientAlert,
} from './types/healthcare'

function App() {
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const [activePage, setActivePage] = useState('Dashboard')
  const [patient, setPatient] = useState<PatientProfile | null>(null)
  const [vitals, setVitals] = useState<VitalReading[]>([])
  const [alerts, setAlerts] = useState<PatientAlert[]>([])
  const [dataLoading, setDataLoading] = useState(false)
  const [dataError, setDataError] = useState('')

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
            Demo only · Real authentication is not connected
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
          <div className="profile">
            <div className="avatar">P</div>
            <div>
              <strong>{patient?.full_name ?? 'Loading profile...'}</strong>
              <p>Patient account · Demo</p>
            </div>
          </div>
        </header>

        {activePage === 'Dashboard' ? (
          <>
            <section className="welcome-banner">
              <div>
                <p>YOUR HEALTH, ALL IN ONE PLACE</p>
                <h1>Welcome to CareBridge!</h1>
                <span>
                  Access your healthcare information from one workspace.
                </span>
              </div>
              <div className="welcome-symbol">+</div>
            </section>

            <h3 className="section-title">Quick access</h3>

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