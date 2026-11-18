// Words and helpers for the Meta campaign audience check (server: src/modules/campaign/campaign.audience.js).

// Countries whose local numbers (05…, or 5… when Excel dropped the 0) are turned into the international form
export const COUNTRIES = [
  { code: '966', ar: 'السعودية', en: 'Saudi Arabia' },
  { code: '971', ar: 'الإمارات', en: 'UAE' },
  { code: '965', ar: 'الكويت', en: 'Kuwait' },
  { code: '974', ar: 'قطر', en: 'Qatar' },
  { code: '973', ar: 'البحرين', en: 'Bahrain' },
  { code: '968', ar: 'عُمان', en: 'Oman' },
  { code: '962', ar: 'الأردن', en: 'Jordan' },
  { code: '963', ar: 'سوريا', en: 'Syria' },
  { code: '961', ar: 'لبنان', en: 'Lebanon' },
  { code: '964', ar: 'العراق', en: 'Iraq' },
  { code: '970', ar: 'فلسطين', en: 'Palestine' },
  { code: '967', ar: 'اليمن', en: 'Yemen' },
  { code: '20', ar: 'مصر', en: 'Egypt' },
  { code: '249', ar: 'السودان', en: 'Sudan' },
  { code: '212', ar: 'المغرب', en: 'Morocco' },
  { code: '213', ar: 'الجزائر', en: 'Algeria' },
  { code: '216', ar: 'تونس', en: 'Tunisia' },
  { code: '90', ar: 'تركيا', en: 'Turkey' }
]

const REASONS = {
  invalid: { ar: 'ليس رقم جوال', en: 'not a phone number' },
  local: { ar: 'رقم محلي بدون رمز دولة', en: 'local number without a country code' },
  length: { ar: 'عدد الأرقام غير صحيح', en: 'wrong number of digits' },
  scientific: { ar: 'محفوظ بصيغة مختصرة (E+11) وضاعت آخر أرقامه', en: 'saved in short form (E+11), its last digits are lost' },
  empty: { ar: 'فارغ', en: 'empty' }
}
export const reasonText = (reason, isAr = true) => (REASONS[reason] || REASONS.invalid)[isAr ? 'ar' : 'en']

export const columnLetter = (i) => {
  let s = ''
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s
  return s
}

/** Why the campaign cannot be created from this audience, in plain words */
export function blockingText(blocking, report, isAr = true) {
  if (!blocking) return ''
  const need = report?.columns?.needed || 0
  const found = report?.columns?.found || 0
  const range = need > 1 ? `B–${columnLetter(need)}` : 'B'
  const texts = {
    COLUMNS_MISSING: isAr
      ? `القالب يحتاج ${need} ${need === 1 ? 'عمود قيم' : 'أعمدة قيم'} بعد عمود الرقم (${range})، والملف فيه ${found}. حمّل الملف الجاهز للقالب وعبّه.`
      : `The template needs ${need} value column${need === 1 ? '' : 's'} after the phone column (${range}); the file has ${found}. Download the ready file for this template.`,
    NO_RECIPIENTS: isAr ? 'لا يوجد أي رقم صالح للإرسال في الملف أو المجموعة.' : 'There is no valid phone number to send to.',
    TEMPLATE_UNSUPPORTED: isAr ? 'هذا القالب لا يمكن إرساله كحملة.' : 'This template cannot be sent as a campaign.'
  }
  return texts[blocking.code] || blocking.message
}

/** An API error in plain words (codes from the server, else its message) */
export function apiErrorText(err, isAr = true) {
  const e = err?.response?.data?.error
  const code = e?.code
  const texts = {
    TEMPLATE_NOT_FOUND: isAr ? 'هذا القالب غير معتمد على هذا الرقم بهذه اللغة.' : 'This template is not approved on this number in this language.',
    NO_META_CHANNEL: isAr ? 'لا يوجد رقم واتساب رسمي مربوط بالحساب.' : 'No official WhatsApp number is connected.',
    FILE_UNREADABLE: isAr ? 'تعذّرت قراءة الملف. ارفع ملف Excel (.xlsx) أو CSV.' : 'The file could not be read. Upload an Excel (.xlsx) or CSV file.',
    FILE_TOO_MANY_ROWS: isAr ? 'الملف أكبر من 200,000 صف. قسّمه على أكثر من حملة.' : 'The file has more than 200,000 rows. Split it into several campaigns.',
    HEADER_MEDIA_REQUIRED: isAr ? 'هذا القالب يبدأ بصورة/فيديو/PDF: ارفعه أو ضع رابطه.' : 'This template starts with an image / video / PDF: upload it or give its link.',
    INSUFFICIENT_BALANCE: isAr ? 'رصيد المحفظة لا يكفي لهذه الحملة. اشحن المحفظة ثم أعد المحاولة.' : 'The wallet balance does not cover this campaign.',
    META_UNREACHABLE: isAr ? 'تعذّر الوصول إلى ميتا لقراءة القالب. حاول بعد دقيقة.' : 'Meta could not be reached. Try again in a minute.'
  }
  return texts[code] || e?.message || (typeof err?.response?.data?.error === 'string' ? err.response.data.error : '') || (isAr ? 'حدث خطأ غير متوقع.' : 'Something went wrong.')
}

export const fmtInt = (n) => Number(n || 0).toLocaleString('en-US')

/** "~25 ثانية" / "~4 دقائق" / "~1.5 ساعة" */
export function formatDuration(seconds, isAr = true) {
  const s = Math.max(1, Math.round(seconds || 0))
  if (s < 60) return isAr ? `${s} ثانية` : `${s} s`
  if (s < 3600) {
    const m = Math.ceil(s / 60)
    return isAr ? `${m} ${m <= 10 && m > 2 ? 'دقائق' : 'دقيقة'}` : `${m} min`
  }
  const h = Math.round((s / 3600) * 10) / 10
  return isAr ? `${h} ساعة` : `${h} h`
}

/** A few words before {{n}} in the template text, so the sender sees what the variable is for */
export function variableContext(body, n) {
  const token = `{{${n}}}`
  const at = (body || '').indexOf(token)
  if (at < 0) return ''
  const before = body.slice(Math.max(0, at - 24), at).replace(/\s+/g, ' ')
  const words = before.split(' ').slice(-3).join(' ').trim()
  return `${at > 24 ? '…' : ''}${words} ${token}`.trim()
}
