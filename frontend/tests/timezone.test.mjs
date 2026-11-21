import test from 'node:test'
import assert from 'node:assert/strict'
import { dateInZone, getBusinessTimeZone, isBusinessTimeZoneConfigured, wallTimeToInstant } from '../src/lib/timezone.ts'

test('missing and invalid clinic timezones disable booking without host-zone conversion', () => {
  assert.equal(isBusinessTimeZoneConfigured(null), false)
  assert.equal(isBusinessTimeZoneConfigured(''), false)
  assert.equal(isBusinessTimeZoneConfigured('America/Not_A_Real_Zone'), false)
  assert.equal(isBusinessTimeZoneConfigured('UTC'), true)
  assert.equal(isBusinessTimeZoneConfigured('America/New_York'), true)
  assert.throws(() => getBusinessTimeZone(null), /not configured/)
  assert.throws(() => getBusinessTimeZone('America/Not_A_Real_Zone'), /not configured/)
})

test('business wall-time maps consistently for India and UTC', () => {
  assert.equal(wallTimeToInstant('2030-01-15T09:00', 'Asia/Kolkata').toISOString(), '2030-01-15T03:30:00.000Z')
  assert.equal(wallTimeToInstant('2030-01-15T09:00', 'UTC').toISOString(), '2030-01-15T09:00:00.000Z')
})

test('New York daylight-saving gap and repeated hour fail closed', () => {
  assert.throws(() => wallTimeToInstant('2026-03-08T02:30', 'America/New_York'), /does not exist/)
  assert.throws(() => wallTimeToInstant('2026-11-01T01:30', 'America/New_York'), /ambiguous/)
  assert.equal(wallTimeToInstant('2026-03-08T09:00', 'America/New_York').toISOString(), '2026-03-08T13:00:00.000Z')
  assert.equal(wallTimeToInstant('2026-11-01T09:00', 'America/New_York').toISOString(), '2026-11-01T14:00:00.000Z')
})

test('business date follows the configured zone around UTC midnight', () => {
  assert.equal(dateInZone(new Date('2030-01-01T00:30:00Z'), 'Asia/Kolkata'), '2030-01-01')
  assert.equal(dateInZone(new Date('2030-01-01T00:30:00Z'), 'America/New_York'), '2029-12-31')
})
