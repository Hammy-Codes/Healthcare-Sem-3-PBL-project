import { test, expect } from '@playwright/test'
import { randomBytes, randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const API = 'http://127.0.0.1:8001'
const password = randomBytes(32).toString('base64url')

test('assigned laboratory workflow reaches result entry and patient records', async ({ page, request }) => {
  const suffix = randomUUID().slice(0, 10)
  const patientEmail = `lab-patient-${suffix}@example.test`
  const doctorEmail = `lab-doctor-${suffix}@example.test`
  const techEmail = `lab-tech-${suffix}@example.test`
  const otherTechEmail = `lab-other-${suffix}@example.test`
  const provisionKey = (await readFile(resolve(process.cwd(), '../data/technician-provision.key'), 'utf8')).trim()
  const register = async (path: string, data: object) => {
    const response = await request.post(`${API}${path}`, { data })
    expect(response.status()).toBe(201)
    return response.json()
  }
  await register('/auth/register', { email: patientEmail, password, full_name: 'Synthetic Lab Patient' })
  const doctor = await register('/auth/register/doctor', { email: doctorEmail, password, full_name: 'Synthetic Lab Doctor', specialty: 'General Practice', registration_number: `LAB-${suffix}` })
  const technician = await register('/auth/register/lab-technician', { email: techEmail, password, full_name: 'Synthetic Haematology Technician', department: 'haematology', provision_key: provisionKey })
  await register('/auth/register/lab-technician', { email: otherTechEmail, password, full_name: 'Unassigned Technician', department: 'haematology', provision_key: provisionKey })
  const login = async (email: string) => (await (await request.post(`${API}/auth/login`, { data: { email, password } })).json()).access_token as string
  const patientToken = await login(patientEmail)
  const doctorToken = await login(doctorEmail)
  const otherToken = await login(otherTechEmail)
  const patientHeaders = { Authorization: `Bearer ${patientToken}` }
  const doctorHeaders = { Authorization: `Bearer ${doctorToken}` }
  const profile = await (await request.get(`${API}/patients/me`, { headers: patientHeaders })).json()
  await request.post(`${API}/patients/me/consents`, { headers: patientHeaders, data: { doctor_id: doctor.id, scope: 'medical_history' } })
  const orderResponse = await request.post(`${API}/doctors/me/patients/${profile.id}/lab-orders`, { headers: doctorHeaders, data: { test_name: 'CBC', technician_id: technician.id, department: 'haematology' } })
  expect(orderResponse.status()).toBe(201)
  const order = await orderResponse.json()
  const denied = await request.get(`${API}/lab/me/orders/${order.id}`, { headers: { Authorization: `Bearer ${otherToken}` } })
  expect(denied.status()).toBe(403)

  await page.goto('/')
  await page.getByLabel('Email address').fill(techEmail)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Laboratory investigations' })).toBeVisible()
  await page.getByRole('button', { name: 'Open authorised request' }).click()
  await expect(page.getByText('In Progress', { exact: true })).toBeVisible()
  await page.locator('#result-Haemoglobin').fill('13.2')
  await page.locator('#unit-Haemoglobin').fill('g/dL')
  await page.locator('#result-WBC').fill('6200')
  await page.locator('#unit-WBC').fill('cells/uL')
  await page.locator('#result-Platelets').fill('250000')
  await page.locator('#unit-Platelets').fill('cells/uL')
  await page.getByRole('button', { name: 'Submit results' }).click()
  await expect(page.getByText('Results submitted and saved. The investigation is complete.')).toBeVisible()
  const doctorResults = await request.get(`${API}/doctors/me/lab-results?patient_id=${profile.id}`, { headers: doctorHeaders })
  expect(doctorResults.status()).toBe(200)
  expect(await doctorResults.json()).toHaveLength(3)

  await page.getByRole('button', { name: 'Log out' }).click()
  await page.getByLabel('Email address').fill(patientEmail)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByRole('button', { name: 'Health Records' }).click()
  await expect(page.getByText('Haemoglobin', { exact: true })).toBeVisible()
  await expect(page.getByText('13.2 g/dL')).toBeVisible()
})
