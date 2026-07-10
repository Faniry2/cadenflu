import { DateTime } from 'luxon'

export function toLocal(utcIso: string, timezone: string): DateTime {
  return DateTime.fromISO(utcIso, { zone: 'utc' }).setZone(timezone)
}

export function toUTC(local: DateTime): string {
  return local.toUTC().toISO()!
}

export function formatLocal(utcIso: string, timezone: string, fmt = 'HH:mm'): string {
  return toLocal(utcIso, timezone).toFormat(fmt)
}

export function formatDate(utcIso: string, timezone: string): string {
  return toLocal(utcIso, timezone).toLocaleString(DateTime.DATE_MED)
}

export function formatDateTime(utcIso: string, timezone: string): string {
  return toLocal(utcIso, timezone).toLocaleString(DateTime.DATETIME_MED)
}

export function startOfWeekUTC(timezone: string): string {
  return DateTime.now().setZone(timezone).startOf('week').toUTC().toISO()!
}

export function endOfWeekUTC(timezone: string): string {
  return DateTime.now().setZone(timezone).endOf('week').toUTC().toISO()!
}

export function startOfMonthUTC(timezone: string): string {
  return DateTime.now().setZone(timezone).startOf('month').toUTC().toISO()!
}

export function endOfMonthUTC(timezone: string): string {
  return DateTime.now().setZone(timezone).endOf('month').toUTC().toISO()!
}

export function localToUTCIso(date: Date, timezone: string): string {
  return DateTime.fromJSDate(date, { zone: timezone }).toUTC().toISO()!
}

export function utcIsoToLocalDate(utcIso: string, timezone: string): Date {
  return toLocal(utcIso, timezone).toJSDate()
}
