const configuredValue = import.meta.env?.VITE_CAREBRIDGE_TIMEZONE?.trim() as string | undefined
const configuredTimeZone = configuredValue || undefined

export function isBusinessTimeZoneConfigured(timeZone: string | null | undefined = configuredTimeZone): boolean {
  const candidate = timeZone?.trim()
  if (!candidate) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: candidate }).format(0)
    return true
  } catch {
    return false
  }
}

/**
 * The API exposes availability as clinic-local HH:mm labels and accepts an
 * offset-aware instant for booking. Configure the clinic's IANA timezone at
 * build time; the browser zone is a development fallback only.
 */
export function getBusinessTimeZone(timeZone: string | null | undefined = configuredTimeZone): string {
  if (!isBusinessTimeZoneConfigured(timeZone)) {
    throw new RangeError('The clinic timezone is not configured with a valid IANA timezone.')
  }
  return timeZone!.trim()
}

function getDateDisplayTimeZone(timeZone = configuredTimeZone): string {
  // These helpers only render a date minimum while the appointment controls
  // are disabled. No booking conversion may use this display-only fallback.
  if (!timeZone || !isBusinessTimeZoneConfigured(timeZone)) {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  }
  return getBusinessTimeZone(timeZone)
}

type WallTime = { year: number; month: number; day: number; hour: number; minute: number }

function wallTimeParts(value: string): WallTime {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!match) throw new RangeError('Choose a valid local date and time.')
  const [, yearText, monthText, dayText, hourText, minuteText] = match
  const result = {
    year: Number(yearText), month: Number(monthText), day: Number(dayText),
    hour: Number(hourText), minute: Number(minuteText),
  }
  const date = new Date(Date.UTC(result.year, result.month - 1, result.day))
  if (date.getUTCFullYear() !== result.year || date.getUTCMonth() + 1 !== result.month ||
      date.getUTCDate() !== result.day || result.hour > 23 || result.minute > 59) {
    throw new RangeError('Choose a valid local date and time.')
  }
  return result
}

function partsInZone(instant: Date, timeZone: string): WallTime {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(instant)
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(part => part.type === type)?.value)
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute') }
}

/** Convert clinic wall time to an instant, rejecting DST gaps and overlaps. */
export function wallTimeToInstant(value: string, timeZone = getBusinessTimeZone()): Date {
  const wanted = wallTimeParts(value)
  const wallEpoch = Date.UTC(wanted.year, wanted.month - 1, wanted.day, wanted.hour, wanted.minute)
  const offsets = new Set<number>()
  // Sample around the wall time so a DST transition contributes both offsets.
  for (const hours of [-36, -24, -12, 0, 12, 24, 36]) {
    const probe = wallEpoch + hours * 60 * 60_000
    const local = partsInZone(new Date(probe), timeZone)
    offsets.add(Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute) - probe)
  }
  const matches = [...offsets]
    .map(offset => wallEpoch - offset)
    .filter(candidate => {
      const found = partsInZone(new Date(candidate), timeZone)
      return found.year === wanted.year && found.month === wanted.month && found.day === wanted.day &&
        found.hour === wanted.hour && found.minute === wanted.minute
    })
  if (matches.length === 0) throw new RangeError('That local time does not exist in the clinic timezone.')
  if (matches.length > 1) throw new RangeError('That local time is ambiguous in the clinic timezone.')
  return new Date(matches[0])
}

export function dateInZone(instant = new Date(), timeZone = getDateDisplayTimeZone()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(instant)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value
  return `${get('year')}-${get('month')}-${get('day')}`
}

export function dateTimeInZone(instant = new Date(), timeZone = getDateDisplayTimeZone()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(instant)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}
