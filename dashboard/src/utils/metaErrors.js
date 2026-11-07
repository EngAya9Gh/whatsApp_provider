// Plain-language explanations for the Meta error codes people actually hit when sending.
// The server sends Meta's own message plus its numeric code (error.metaCode); this adds the "what to do".
const HINTS = {
  131030: {
    ar: 'الرقم المستلم غير مضاف إلى قائمة المستلمين المسموحين. هذا يحدث مع رقم الاختبار من ميتا (+1 555…): يرسل فقط للأرقام التي أضفتها وفعّلتها في API Setup. اربط رقماً حقيقياً أو أضف الرقم هناك.',
    en: 'The recipient is not on the allowed list. This happens with Meta\'s test number (+1 555…): it only sends to numbers you added and verified in API Setup. Connect a real number or add the recipient there.'
  },
  190: {
    ar: 'انتهت صلاحية رمز الوصول (token) لهذه القناة. أعد ربط الرقم من صفحة «ربط Meta الرسمي». (الرمز المؤقت من API Setup ينتهي خلال 24 ساعة.)',
    en: 'This channel\'s access token has expired. Reconnect the number from the Meta Connection page. (The temporary token from API Setup expires after 24 hours.)'
  },
  132000: {
    ar: 'عدد المتغيرات المرسلة لا يطابق القالب. عبّئ كل متغيرات القالب.',
    en: 'The number of variables does not match the template. Fill in every template variable.'
  },
  132001: {
    ar: 'القالب غير موجود بهذا الاسم أو اللغة على حساب واتساب المرتبط بهذا الرقم. تأكد من القناة المختارة ومن أن القالب معتمد.',
    en: 'No template with this name and language exists on the WhatsApp account behind this number. Check the selected channel and that the template is approved.'
  },
  132012: {
    ar: 'صيغة أحد المتغيرات غير مقبولة (نص طويل أو أسطر جديدة أو مسافات كثيرة).',
    en: 'A variable has an unacceptable format (too long, new lines, or too many spaces).'
  },
  132015: { ar: 'القالب متوقف مؤقتاً بسبب جودته. استخدم قالباً آخر.', en: 'This template is paused because of its quality. Use another template.' },
  132016: { ar: 'تم تعطيل القالب نهائياً من ميتا. أنشئ قالباً جديداً.', en: 'Meta disabled this template. Create a new one.' },
  131047: {
    ar: 'مرّت أكثر من 24 ساعة على آخر رسالة من العميل. أرسل قالباً معتمداً بدل الرسالة الحرة.',
    en: 'More than 24 hours passed since the customer\'s last message. Send an approved template instead of free text.'
  },
  131026: {
    ar: 'تعذّر التسليم: الرقم غير مسجّل على واتساب أو لم يقبل شروطه.',
    en: 'Undeliverable: the number is not on WhatsApp or has not accepted its terms.'
  },
  131042: {
    ar: 'مشكلة في وسيلة الدفع لحساب واتساب. أضف وسيلة دفع في WhatsApp Manager.',
    en: 'There is a payment problem on the WhatsApp account. Add a payment method in WhatsApp Manager.'
  },
  131048: { ar: 'ميتا قيّدت الإرسال مؤقتاً بسبب بلاغات السبام.', en: 'Meta temporarily limited sending because of spam reports.' },
  131056: { ar: 'أرسلت رسائل كثيرة لنفس الرقم بسرعة. انتظر قليلاً.', en: 'Too many messages to the same number too quickly. Wait a moment.' },
  130429: { ar: 'تجاوزت سرعة الإرسال المسموحة. انتظر قليلاً ثم أعد المحاولة.', en: 'Sending rate limit reached. Wait a moment and retry.' },
  133010: {
    ar: 'الرقم غير مسجّل على Cloud API. أعد ربطه من صفحة «ربط Meta الرسمي».',
    en: 'The number is not registered on the Cloud API. Reconnect it from the Meta Connection page.'
  },
  10: { ar: 'ليس لدى التطبيق صلاحية لهذا الإجراء.', en: 'The app does not have permission for this action.' },
  // "Object with ID … does not exist, cannot be loaded due to missing permissions…": the saved token cannot see this number
  '100/33': {
    ar: 'التوكن المحفوظ في هذه القناة لا يملك صلاحية على هذا الرقم. غالباً الرقم (أو رقم الاختبار) تابع لتطبيق Meta آخر، أو التوكن صادر من تطبيق مختلف. أعد ربط القناة بقيم التطبيق الحالي (رقم ومعرّف حساب وتوكن من نفس التطبيق).',
    en: 'The token saved on this channel has no access to this number. Most likely the number (or test number) belongs to another Meta app, or the token was issued by a different app. Reconnect the channel with the current app\'s values (number, account ID and token from the same app).'
  }
}
// Permission errors share the 200-299 range
for (let c = 200; c <= 299; c++) HINTS[c] = HINTS[10]
HINTS[463] = HINTS[467] = HINTS[102] = HINTS[190]

/** The plain-language explanation for a Meta error code (and sub-code), or '' when we have none. */
export function metaHint(code, subcode, isAr = true) {
  const entry = (code != null && subcode != null && HINTS[`${code}/${subcode}`]) || (code != null && HINTS[code])
  return entry ? entry[isAr ? 'ar' : 'en'] : ''
}

/** The readable text of a failed request: our hint for known Meta codes, followed by Meta's own message. */
export function metaErrorText(err, isAr = true) {
  const data = err?.response?.data
  const apiError = data?.error
  const message = (typeof apiError === 'string' ? apiError : apiError?.message) || data?.message || err?.message || ''
  const code = typeof apiError === 'object' ? apiError?.metaCode : undefined
  const subcode = typeof apiError === 'object' ? apiError?.metaSubcode : undefined
  const hint = metaHint(code, subcode, isAr)
  // Errors that usually mean "this channel is not set up for the current app": point to the diagnostic
  const check = code === 100 && subcode === 33 || [190, 463, 467, 102, 133010].includes(code)
    ? (isAr ? '\n\nللتأكد: صفحة «ربط Meta الرسمي» ← زر «فحص الاتصال».' : '\n\nTo verify: Meta Connection page → "Check connection".')
    : ''
  return hint ? `${hint}${check}\n\n${message}` : message
}
