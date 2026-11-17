// Due times of team tasks: the value of a datetime-local input, and a short label ("today 5:00 pm", "late").

/** Date → 'YYYY-MM-DDTHH:mm' in the browser's time zone (what <input type="datetime-local"> expects) */
export function toLocalInput(date) {
  const d = new Date(date)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }

/** 'late' | 'today' | 'tomorrow' | 'later' | 'none' */
export function dueGroup(due, now = new Date()) {
  if (!due) return 'none'
  const d = new Date(due)
  if (d < now) return 'late'
  const days = Math.round((startOfDay(d) - startOfDay(now)) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  return 'later'
}

export function dueLabel(due, isAr = true, now = new Date()) {
  if (!due) return ''
  const d = new Date(due)
  const time = d.toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', { hour: 'numeric', minute: '2-digit' })
  const group = dueGroup(d, now)
  if (group === 'late') {
    const hours = Math.floor((now - d) / 3600000)
    if (hours < 24) return isAr ? `متأخرة ${hours < 1 ? 'أقل من ساعة' : `${hours} ساعة`}` : `late ${hours < 1 ? '< 1 h' : `${hours} h`}`
    const days = Math.floor(hours / 24)
    return isAr ? `متأخرة ${days} يوم` : `late ${days} d`
  }
  if (group === 'today') return isAr ? `اليوم ${time}` : `today ${time}`
  if (group === 'tomorrow') return isAr ? `غداً ${time}` : `tomorrow ${time}`
  return d.toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' }) + ' ' + time
}
