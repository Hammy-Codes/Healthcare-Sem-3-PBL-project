import { login, logout } from './services/authService'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import './App.css'
import './design-system.css'
import { patientService } from './services/patientService'
import { apiRequest } from './services/api'
import ClinicianDashboard from './features/providers/ClinicianDashboard'
import SymptomIntake from './features/symptoms/SymptomIntake'
import FindDoctor from './features/doctors/FindDoctor'
import PatientTimeline from './features/timeline/PatientTimeline'
import VitalsAlerts from './features/monitoring/VitalsAlerts'
import Appointments from './features/appointments/Appointments'
import DoctorAppointments from './features/appointments/DoctorAppointments'
import ConsentManager from './features/consent/ConsentManager'
import PatientHealthRecords from './features/records/PatientHealthRecords'
import LabDashboard from './features/lab/LabDashboard'
import type {
  User,
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
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [activePage, setActivePage] = useState('Dashboard')
  const [patient, setPatient] = useState<PatientProfile | null>(null)
const [vitals, setVitals] = useState<VitalReading[]>([])
const [alerts, setAlerts] = useState<PatientAlert[]>([])
const [dataLoading, setDataLoading] = useState(false)
const [dataError, setDataError] = useState('')

const [notificationsOpen, setNotificationsOpen] = useState(false)
const [readNotifications, setReadNotifications] = useState<number[]>([])
const [liveNotifications, setLiveNotifications] = useState<{id:number; title:string; message:string; time:string}[]>([])
const notificationRef = useRef<HTMLDivElement>(null)
const [profileMenuOpen, setProfileMenuOpen] = useState(false)
const profileMenuRef = useRef<HTMLDivElement>(null)
const [globalSearch, setGlobalSearch] = useState('')
const [searchOpen, setSearchOpen] = useState(false)
const [doctorRegisterMode, setDoctorRegisterMode] = useState(false)
  const [patientRegisterMode, setPatientRegisterMode] = useState(false)
const [labRegisterMode, setLabRegisterMode] = useState(false)
  const [patientProfileRequired, setPatientProfileRequired] = useState(false)
  const [profileDateOfBirth, setProfileDateOfBirth] = useState('')
  const [profilePhone, setProfilePhone] = useState('')
const [registerName, setRegisterName] = useState('')
const [registerSpecialty, setRegisterSpecialty] = useState('')
const [registerNumber, setRegisterNumber] = useState('')
const [registerDepartment, setRegisterDepartment] = useState('haematology')
const [provisionKey, setProvisionKey] = useState('')
const visibleNotifications = liveNotifications

useEffect(() => {
  if (!loggedIn || currentUser?.role !== 'patient') {
    setLiveNotifications([])
    return
  }
  let cancelled = false
  async function loadFollowUpNotifications() {
    try {
      const appointments = await apiRequest<{id:string; reason:string; scheduled_at:string; status:string; created_at:string}[]>('/patients/me/appointments')
      if (cancelled) return
      const notices = appointments
        .filter(item => new Date(item.scheduled_at).getTime() > Date.now() && !['cancelled','rejected','completed'].includes(item.status))
        .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map((item, index) => ({
          id: index + 100,
          title: /follow[ -]?up/i.test(item.reason) ? 'Follow-up visit scheduled' : 'Appointment update',
          message: `${new Date(item.scheduled_at).toLocaleString()} · ${item.reason}`,
          time: `Status: ${item.status}`,
        }))
      setLiveNotifications(notices)
    } catch {
      if (!cancelled) setLiveNotifications([])
    }
  }
  void loadFollowUpNotifications()
  return () => { cancelled = true }
}, [loggedIn, currentUser?.role, activePage])

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
  { title: 'Laboratory Dashboard', description: 'Review assigned lab requests and submit results', page: 'Laboratory Dashboard' },
  { title: 'Appointments', description: 'Book and manage consultations', page: 'Appointments' },
  { title: 'Share health data', description: 'Review and manage patient consent', page: 'Share health data' },
  { title: 'Health Records', description: 'View your clinical records and prescriptions', page: 'Health Records' },
]

const roleSearchItems = currentUser?.role === 'doctor'
  ? searchItems.filter((item) => ['Clinician Dashboard', 'Appointments'].includes(item.page))
  : currentUser?.role === 'lab_technician'
    ? searchItems.filter((item) => item.page === 'Laboratory Dashboard')
    : searchItems.filter((item) => item.page !== 'Clinician Dashboard' && item.page !== 'Laboratory Dashboard')

const filteredSearchItems = roleSearchItems.filter((item) =>
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
  if (!loggedIn || currentUser?.role !== 'patient') return

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
}, [loggedIn, currentUser?.role])


async function handleLogin(event: FormEvent<HTMLFormElement>) {
  event.preventDefault()
  setLoginError('')
  setLoginLoading(true)

  try {
    const user = await login(email, password)
    setCurrentUser(user)
    setActivePage(user.role === 'doctor' ? 'Clinician Dashboard' : user.role === 'lab_technician' ? 'Laboratory Dashboard' : 'Dashboard')
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

async function handleDoctorRegister(event: FormEvent<HTMLFormElement>) {
  event.preventDefault(); setLoginError(''); setLoginLoading(true)
  try {
    await patientService.registerDoctor({ email, password, full_name: registerName, specialty: registerSpecialty, registration_number: registerNumber })
    const user = await login(email, password)
    setCurrentUser(user); setActivePage('Clinician Dashboard'); setLoggedIn(true); setDoctorRegisterMode(false)
  } catch (error) { setLoginError(error instanceof Error ? error.message : 'Unable to register doctor account.') }
  finally { setLoginLoading(false) }
}

async function handlePatientRegister(event: FormEvent<HTMLFormElement>) {
  event.preventDefault(); setLoginError(''); setLoginLoading(true)
  try {
    await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name: registerName }),
    })
    const user = await login(email, password)
    setCurrentUser(user); setLoggedIn(true); setPatientRegisterMode(false)
    setPatientProfileRequired(true)
  } catch (error) {
    setLoginError(error instanceof Error ? error.message : 'Unable to create patient account.')
  } finally { setLoginLoading(false) }
}

async function handleLabRegister(event: FormEvent<HTMLFormElement>) {
  event.preventDefault(); setLoginError(''); setLoginLoading(true)
  try {
    await apiRequest('/auth/register/lab-technician', { method: 'POST', body: JSON.stringify({ email, password, full_name: registerName, department: registerDepartment, provision_key: provisionKey }) })
    const user = await login(email, password)
    setCurrentUser(user); setActivePage('Laboratory Dashboard'); setLoggedIn(true); setLabRegisterMode(false); setProvisionKey('')
  } catch (error) { setLoginError(error instanceof Error ? error.message : 'Unable to provision technician account.') }
  finally { setLoginLoading(false) }
}

async function handlePatientProfile(event: FormEvent<HTMLFormElement>) {
  event.preventDefault(); setLoginError(''); setLoginLoading(true)
  try {
    await apiRequest('/patients/me', {
      method: 'POST',
      body: JSON.stringify({
        date_of_birth: profileDateOfBirth || null,
        phone: profilePhone.trim() || null,
      }),
    })
    setPatientProfileRequired(false)
    setActivePage('Dashboard')
  } catch (error) {
    setLoginError(error instanceof Error ? error.message : 'Unable to save patient profile.')
  } finally { setLoginLoading(false) }
}

  if (!loggedIn) {
    return (
      <main className="login-page">
        <aside className="auth-intro">
          <div className="auth-intro-brand"><span className="brand-icon">+</span><span>CareBridge</span></div>
          <p className="auth-kicker">CONNECTED CARE, MADE CLEAR</p>
          <h2>A calmer way to manage your care.</h2>
          <p>Bring appointments, health records, and care team updates together in one secure workspace.</p>
          <div className="auth-trust-list"><span><i>✓</i> Private, role-based access</span><span><i>✓</i> Your information in one place</span><span><i>✓</i> Built around your care journey</span></div>
          <small>CareBridge demonstration workspace · Use synthetic information only</small>
        </aside>
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

          <form onSubmit={doctorRegisterMode ? handleDoctorRegister : patientRegisterMode ? handlePatientRegister : labRegisterMode ? handleLabRegister : handleLogin}>
            {(doctorRegisterMode || patientRegisterMode || labRegisterMode) && <>
              <label htmlFor="register-name">Full name</label><input id="register-name" value={registerName} onChange={e=>setRegisterName(e.target.value)} required maxLength={150} />
            </>}
            {labRegisterMode && <>
              <label htmlFor="lab-department">Laboratory department</label><input id="lab-department" value={registerDepartment} onChange={e=>setRegisterDepartment(e.target.value)} required maxLength={80} />
              <label htmlFor="lab-provision-key">Provisioning key</label><input id="lab-provision-key" type="password" value={provisionKey} onChange={e=>setProvisionKey(e.target.value)} required maxLength={256} />
              <p className="demo-note">Technician registration requires the local administrator’s provisioning key.</p>
            </>}
            {doctorRegisterMode && <>
              <label htmlFor="doctor-specialty">Specialty</label><input id="doctor-specialty" value={registerSpecialty} onChange={e=>setRegisterSpecialty(e.target.value)} required minLength={2} maxLength={120} placeholder="e.g. Dermatology" />
              <label htmlFor="doctor-registration">Medical registration number</label><input id="doctor-registration" value={registerNumber} onChange={e=>setRegisterNumber(e.target.value)} required minLength={3} maxLength={100} />
            </>}
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
{loginLoading ? 'Please wait…' : doctorRegisterMode ? 'Create doctor account' : patientRegisterMode ? 'Create patient account' : labRegisterMode ? 'Provision lab technician' : 'Sign in'}
</button>
          </form>
          {!doctorRegisterMode && !labRegisterMode && <button type="button" className="doctor-details-button" onClick={() => { setPatientRegisterMode(v => !v); setLoginError('') }}>{patientRegisterMode ? 'Back to sign in' : 'Create a patient account'}</button>}
          {!patientRegisterMode && !labRegisterMode && <button type="button" className="doctor-details-button" onClick={() => { setDoctorRegisterMode(v => !v); setLoginError('') }}>{doctorRegisterMode ? 'Back to sign in' : 'Register as a doctor'}</button>}
          {!patientRegisterMode && !doctorRegisterMode && <button type="button" className="doctor-details-button" onClick={() => { setLabRegisterMode(v => !v); setLoginError('') }}>{labRegisterMode ? 'Back to sign in' : 'Provision a lab technician'}</button>}
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

  if (patientProfileRequired) {
    return <main className="login-page"><aside className="auth-intro"><div className="auth-intro-brand"><span className="brand-icon">+</span><span>CareBridge</span></div><p className="auth-kicker">YOUR PROFILE</p><h2>One last step to get started.</h2><p>Your profile details are optional. You can continue to your dashboard at any time.</p><small>CareBridge demonstration workspace · Use synthetic information only</small></aside><section className="login-card">
      <div className="brand"><div className="brand-icon">+</div><span>CareBridge</span></div>
      <p className="eyebrow">PATIENT PROFILE</p><h1>Complete your profile</h1>
      <p className="subtitle">Date of birth and phone are optional. You can continue without adding them.</p>
      <form onSubmit={handlePatientProfile}>
        <label htmlFor="patient-date-of-birth">Date of birth (optional)</label>
        <input id="patient-date-of-birth" type="date" value={profileDateOfBirth} onChange={e => setProfileDateOfBirth(e.target.value)} />
        <label htmlFor="patient-phone">Phone (optional)</label>
        <input id="patient-phone" type="tel" maxLength={30} value={profilePhone} onChange={e => setProfilePhone(e.target.value)} />
        <button type="submit" disabled={loginLoading}>{loginLoading ? 'Please wait…' : 'Save and continue'}</button>
      </form>
      {loginError && <p role="alert" className="login-error">{loginError}</p>}
    </section></main>
  }

  const menuItems = currentUser?.role === 'doctor'
    ? ['Clinician Dashboard', 'Appointments']
    : currentUser?.role === 'lab_technician'
      ? ['Laboratory Dashboard']
      : ['Dashboard', 'Symptom Intake', 'Find a Doctor', 'Patient Timeline', 'Vitals & Alerts', 'Appointments', 'Share health data', 'Health Records']


  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">+</div>
          <span>CareBridge</span>
        </div>

        <p className="menu-label">{currentUser?.role === 'doctor' ? 'DOCTOR MENU' : currentUser?.role === 'lab_technician' ? 'LABORATORY MENU' : 'PATIENT MENU'}</p>

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
  setCurrentUser(null)
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

  {visibleNotifications.length - readNotifications.length > 0 && (
    <span className="notification-count">
      {visibleNotifications.length - readNotifications.length}
    </span>
  )}
</button>

{notificationsOpen && (
  <div className="notification-dropdown">
    <div className="notification-dropdown-header">
      <strong>Notifications</strong>

      {visibleNotifications.length > 0 && <button
        type="button"
        className="mark-read-button"
        onClick={() =>
          setReadNotifications(visibleNotifications.map((item) => item.id))
        }
      >
        Mark all read
      </button>}
    </div>

    {visibleNotifications.length === 0 ? (
      <p className="notification-empty" role="status">
        Appointment updates will appear here when you have upcoming visits.
      </p>
    ) : visibleNotifications.map((notification) => {
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
    aria-label="Open account menu"
    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
  >
    <div className="avatar">
      {(currentUser?.full_name ?? '')
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()}
    </div>

    <div className="profile-text">
      <strong>{currentUser?.full_name ?? 'Loading profile...'}</strong>
      <p>{currentUser?.role === 'doctor' ? 'Doctor account' : currentUser?.role === 'lab_technician' ? 'Laboratory technician' : 'Patient account'}</p>
    </div>

    <span className="profile-chevron" aria-hidden="true">
      {profileMenuOpen ? '▲' : '▼'}
    </span>
  </button>

  {profileMenuOpen && (
    <div className="profile-dropdown">
      <div className="profile-dropdown-heading">
        <strong>{currentUser?.full_name ?? 'Account'}</strong>
        <span>{currentUser?.role === 'doctor' ? 'Doctor account' : currentUser?.role === 'lab_technician' ? 'Laboratory technician' : 'Patient account'}</span>
      </div>

      <button
        type="button"
        onClick={() => {
          setProfileMenuOpen(false)
          setActivePage(currentUser?.role === 'doctor' ? 'Clinician Dashboard' : currentUser?.role === 'lab_technician' ? 'Laboratory Dashboard' : 'Dashboard')
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
          logout()
          setCurrentUser(null)
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



{activePage === 'Laboratory Dashboard' && currentUser?.role === 'lab_technician' ? (
  <LabDashboard />
) : activePage === 'Share health data' ? (
  <ConsentManager />
) : activePage === 'Health Records' ? (
  <PatientHealthRecords />
) : activePage === 'Appointments' ? (
  currentUser?.role === 'doctor' ? <DoctorAppointments /> : <Appointments />
) : activePage === 'Vitals & Alerts' ? (
  <VitalsAlerts />
) : activePage === 'Patient Timeline' ? (
  <PatientTimeline />
) : activePage === 'Find a Doctor' ? (
  <FindDoctor />
) : activePage === 'Symptom Intake' ? (
  <SymptomIntake />
) : activePage === 'Clinician Dashboard' ? (
  <ClinicianDashboard />
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


{dataLoading && (
  <p className="notice">Loading healthcare data...</p>
)}

{dataError && (
  <p className="notice" role="alert">{dataError}</p>
)}

{patient && (
  <section className="dashboard-data profile-card">
    <h3>Patient Profile</h3>
  <p><strong>Name:</strong> {currentUser?.full_name ?? 'Profile name unavailable'}</p>
    <p>
      <strong>Date of birth:</strong>{' '}
      {patient.date_of_birth || 'Not available'}
    </p>
  </section>
)}

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
                <p>Search clinicians and review available appointment times.</p>
                <span className="card-link">Open section →</span>
              </button>

              <button
                className="feature-card purple-card"
                onClick={() => setActivePage('Patient Timeline')}
              >
                <span className="card-icon">▤</span>
                <h3>Patient Timeline</h3>
                <p>Review a sample chronology of clinical events.</p>
                <span className="card-link">Open section →</span>
              </button>

              <button
                className="feature-card orange-card"
                onClick={() => setActivePage('Vitals & Alerts')}
              >
                <span className="card-icon">♡</span>
                <h3>Vitals & Alerts</h3>
                <p>Review synthetic vital readings and example alerts.</p>
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
