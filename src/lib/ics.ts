import { EVENT, startDate, endDate } from '../config/event'

/** Format iCalendar UTC : 20260919T180000Z */
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

/** Les retours à la ligne et les virgules doivent être échappés dans un .ics. */
const esc = (s: string) => s.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n')

export function buildIcs(): string {
  const title = `Anniversaire ${EVENT.hostName}`
  const location = [EVENT.place.name, EVENT.place.address].filter(Boolean).join(', ')

  // Le CRLF est obligatoire, certains clients (Outlook) refusent le \n seul.
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//anniversaire-25ans//FR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${EVENT.hostName.toLowerCase()}-anniv-2026@anniversaire`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(startDate())}`,
    `DTEND:${stamp(endDate())}`,
    `SUMMARY:${esc(title)}`,
    `LOCATION:${esc(location)}`,
    `DESCRIPTION:${esc(EVENT.place.directions || 'À très vite !')}`,
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(title)} demain !`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

export function downloadIcs() {
  const blob = new Blob([buildIcs()], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `anniversaire-${EVENT.hostName.toLowerCase()}.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
