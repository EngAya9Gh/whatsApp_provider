// Number / duration formatting shared by the analytics pages (Latin digits, like the rest of the app)
export function useAnalyticsFormat(isAr) {
  const numberFormat = new Intl.NumberFormat('en-US')

  const num = (n) => (n === null || n === undefined ? '—' : numberFormat.format(n))
  const percent = (n) => (n === null || n === undefined ? '—' : `${n}%`)

  // Seconds under an hour (response times), hours and minutes above
  const duration = (minutes) => {
    if (minutes === null || minutes === undefined) return '—'
    const totalSec = Math.round(minutes * 60)
    if (totalSec < 60) return isAr.value ? `${totalSec} ث` : `${totalSec}s`
    if (minutes < 60) {
      const m = Math.floor(totalSec / 60)
      const s = totalSec % 60
      if (!s) return isAr.value ? `${m} د` : `${m} min`
      return isAr.value ? `${m}د ${s}ث` : `${m}m ${s}s`
    }
    const h = Math.floor(minutes / 60)
    const m = Math.round(minutes % 60)
    if (h < 48) return isAr.value ? `${h}س ${m}د` : `${h}h ${m}m`
    return isAr.value ? `${Math.round(h / 24)} يوم` : `${Math.round(h / 24)} days`
  }
  const durationHours = (hours) => (hours === null || hours === undefined ? '—' : duration(hours * 60))

  const date = (iso) => new Intl.DateTimeFormat(isAr.value ? 'ar-u-nu-latn-ca-gregory' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))

  return { num, percent, duration, durationHours, date }
}
