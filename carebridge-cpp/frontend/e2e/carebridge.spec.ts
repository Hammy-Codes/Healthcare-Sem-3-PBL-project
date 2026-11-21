import { test, expect } from '@playwright/test'
import { createHmac, randomBytes, randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const API = 'http://127.0.0.1:8001'
const password = randomBytes(32).toString('base64url')
const suffix = randomUUID().slice(0, 8)
const patient = { name: `E2E Patient ${suffix}`, email: `e2e-patient-${suffix}@example.test`, password }
const doctor = { name: `E2E Doctor ${suffix}`, email: `e2e-doctor-${suffix}@example.test`, password }

test('synthetic onboarding, consent, symptoms, booking, clinician review and file round trip', async ({ page, request }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Register as a doctor' }).click()
  await page.getByLabel('Full name').fill(doctor.name)
  await page.getByLabel('Specialty').fill('Neurology')
  await page.getByLabel('Medical registration number').fill(`E2E-${suffix}`)
  await page.getByLabel('Email address').fill(doctor.email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Create doctor account' }).click()
  await expect(page.getByRole('heading', { name: 'Doctor Workspace' })).toBeVisible()
  await page.getByRole('button', { name: 'Log out' }).click()

  await page.getByRole('button', { name: 'Create a patient account' }).click()
  await page.getByLabel('Full name').fill(patient.name)
  await page.getByLabel('Email address').fill(patient.email)
  await page.getByLabel('Password').fill(patient.password)
  await page.getByRole('button', { name: 'Create patient account' }).click()
  await expect(page.getByRole('heading', { name: 'Complete your profile' })).toBeVisible()
  await page.getByLabel('Phone (optional)').fill('555-0108')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await expect(page.getByRole('button', { name: 'Symptom Intake', exact: true })).toBeVisible()

  // Duplicate registration and invalid signup follow the same C++ staging API.
  const duplicate = await request.post(`${API}/auth/register`, {
    data: { email: patient.email, password, full_name: patient.name },
  })
  expect(duplicate.status()).toBe(409)
  const invalid = await request.post(`${API}/auth/register`, {
    data: { email: 'not-an-email', password: 'short', full_name: '' },
  })
  expect(invalid.status()).toBe(422)
  expect(JSON.stringify(await invalid.json())).not.toContain('short')

  await page.getByRole('button', { name: 'Share health data' }).click()
  await page.getByLabel('Doctor').selectOption({ label: `${doctor.name} — Neurology` })
  const directoryResponse = await request.get(`${API}/doctors/directory`)
  const doctorId = (await directoryResponse.json()).find((item: { full_name: string }) => item.full_name === doctor.name)?.id
  expect(doctorId).toBeTruthy()
  await page.getByLabel('Doctor').selectOption(doctorId!)
  expect(await page.getByLabel('Doctor').inputValue()).toBe(doctorId)
  await page.getByRole('button', { name: 'Grant selected access' }).click()
  await expect(page.getByText('Access permissions granted.')).toBeVisible()
  const patientLogin = await request.post(`${API}/auth/login`, { data: { email: patient.email, password } })
  const patientToken = (await patientLogin.json()).access_token as string
  const consentResponse = await request.get(`${API}/patients/me/consents`, { headers: { Authorization: `Bearer ${patientToken}` } })
  const createdConsents = await consentResponse.json()
  expect(createdConsents.filter((item: { doctor_id: string }) => item.doctor_id === doctorId)).toHaveLength(3)

  await page.getByRole('button', { name: 'Symptom Intake', exact: true }).click()
  await page.locator('.symptom-option').filter({ hasText: 'Headache' }).locator('input').check()
  await page.getByLabel('How long have you had them? *').selectOption({ label: '1–3 days' })
  await page.getByRole('radio', { name: /Moderate/ }).check()
  await page.getByRole('button', { name: 'Save symptom record' }).click()
  await expect(page.getByText('Your symptoms were saved successfully.')).toBeVisible()

  const recommended = page.locator('.symptom-recommendations')
  await expect(recommended.getByText(doctor.name, { exact: true })).toBeVisible()
  const doctorRecommendation = recommended.locator('article').filter({ hasText: doctor.name })
  const appointmentDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const dateText = new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.VITE_CAREBRIDGE_TIMEZONE || 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(appointmentDate)
  const dateInput = doctorRecommendation.locator('input[type="date"]')
  await dateInput.fill(dateText)
  const timeSelect = doctorRecommendation.locator('select').last()
  await expect(timeSelect.locator('option').filter({ hasText: '09:00' })).toHaveCount(1)
  await timeSelect.selectOption('09:00')
  await doctorRecommendation.getByPlaceholder('Briefly describe what you need help with').fill('Synthetic browser QA appointment')
  await doctorRecommendation.getByRole('button', { name: 'Book appointment' }).click()
  await expect(page.getByText(`Appointment request sent to ${doctor.name}.`)).toBeVisible()

  await page.getByRole('button', { name: 'Appointments' }).click()
  await expect(page.getByRole('heading', { name: doctor.name })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel appointment' }).click()
  await expect(page.getByText('Appointment cancelled.')).toBeVisible()

  // Make a second request so doctor approval and completion can be exercised.
  await page.getByRole('button', { name: 'Find a Doctor' }).click()
  await page.locator('.doctor-card').filter({ hasText: doctor.name }).getByRole('button', { name: 'View profile & book' }).click()
  await page.getByLabel('Choose date').fill(dateText)
  const available = page.getByLabel('Available appointment time')
  await expect(available.locator('option').nth(1)).toBeAttached()
  const nextSlot = await available.locator('option').nth(1).getAttribute('value')
  expect(nextSlot).toBeTruthy()
  await available.selectOption(nextSlot!)
  await page.getByLabel('Reason for consultation').fill('Synthetic review and completion')
  await page.getByRole('button', { name: 'Request appointment' }).click()
  await expect(page.getByRole('status')).toContainText('Appointment request sent')

  await page.getByRole('button', { name: 'Log out' }).click()
  await page.getByRole('button', { name: 'Register as a doctor' }).click()
  await page.getByRole('button', { name: 'Back to sign in' }).click()
  await page.getByLabel('Email address').fill(doctor.email)
  await page.getByLabel('Password').fill(doctor.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Doctor Workspace' })).toBeVisible()
  await expect(page.getByText(patient.name, { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Open patient profile', exact: true }).click()

  await page.getByPlaceholder('e.g. Follow-up assessment').fill('E2E clinical note')
  await page.getByPlaceholder('Enter clinical details').fill('Synthetic browser test only')
  await page.getByRole('button', { name: 'Save record' }).click()
  await expect(page.getByText('Clinical record saved for this patient.')).toBeVisible()

  const syntheticPdf = Buffer.from('%PDF-1.4\nCareBridge synthetic E2E fixture\n%%EOF\n')
  await page.locator('input[type="file"]').setInputFiles({
    name: 'synthetic-e2e.pdf', mimeType: 'application/pdf', buffer: syntheticPdf,
  })
  await page.getByRole('button', { name: 'Upload prescription' }).click()
  await expect(page.getByText('Prescription uploaded and saved to the patient’s Health Records.')).toBeVisible()

  await page.locator('input[type="datetime-local"]').fill(`${dateText}T11:00`)
  await page.getByLabel('Reason for follow-up').fill('Synthetic follow-up check')
  await page.getByRole('button', { name: /Schedule follow-up/ }).click()
  await expect(page.getByRole('status')).toContainText('Follow-up scheduled.')

  const appointmentPage = page.getByRole('button', { name: 'Appointments' })
  await appointmentPage.click()
  await expect(page.getByText('Synthetic review and completion')).toBeVisible()
  await page.getByRole('button', { name: 'Approve' }).click()
  await expect(page.getByText('Appointment approved.')).toBeVisible()
  await page.getByRole('article').filter({ hasText: 'Synthetic review and completion' })
    .getByRole('button', { name: 'Mark completed' }).click()
  await expect(page.getByText('Appointment completed.')).toBeVisible()

  await page.getByRole('button', { name: 'Log out' }).click()
  await page.getByLabel('Email address').fill(patient.email)
  await page.getByLabel('Password').fill(patient.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('button', { name: 'Health Records' })).toBeVisible()
  await page.getByRole('button', { name: 'Health Records' }).click()
  await expect(page.getByText('E2E clinical note')).toBeVisible()
  await expect(page.getByText('synthetic-e2e.pdf')).toBeVisible()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download prescription' }).click(),
  ])
  expect(await readFile(await download.path()!)).toEqual(syntheticPdf)
})

test('invalid/expired token responses and CORS are checked against C++', async ({ request }) => {
  const unauthenticated = await request.get(`${API}/patients/me`)
  expect(unauthenticated.status()).toBe(401)
  for (const token of ['not-a-jwt', signExpiredToken()]) {
    const response = await request.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
    expect(response.status()).toBe(401)
  }
  const preflight = await request.fetch(`${API}/auth/login`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://127.0.0.1:5173',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization,content-type',
    },
  })
  expect(preflight.status()).toBe(200)
  expect(preflight.headers()['access-control-allow-origin']).toBe('http://127.0.0.1:5173')
})

function signExpiredToken(): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const header = encode({ alg: 'HS256', typ: 'JWT' })
  const payload = encode({ sub: randomUUID(), role: 'patient', exp: 1 })
  const signature = createHmac('sha256', randomBytes(32))
    .update(`${header}.${payload}`).digest('base64url')
  return `${header}.${payload}.${signature}`
}
