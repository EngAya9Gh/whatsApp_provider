// Plain-language text for the AI error codes the API returns (error.code), in [Arabic, English]
const MESSAGES = {
  AI_NOT_CONFIGURED: ['لم يُضف مفتاح Gemini بعد. أضفه من الإعدادات ← الذكاء الاصطناعي.', 'No Gemini key yet. Add one in Settings → AI.'],
  AI_BUSY: ['خدمة الذكاء الاصطناعي من Google مزدحمة الآن. حاول مرة أخرى بعد قليل.', "Google's AI service is busy right now. Try again in a moment."],
  AI_TIMEOUT: ['تأخر رد خدمة الذكاء الاصطناعي. حاول مرة أخرى بعد قليل.', 'The AI service took too long to answer. Try again in a moment.'],
  AI_NETWORK: ['تعذّر الاتصال بخدمة الذكاء الاصطناعي. حاول مرة أخرى بعد قليل.', 'Could not reach the AI service. Try again in a moment.'],
  AI_RATE_LIMIT: ['وصل مفتاح Gemini إلى حد الطلبات المسموح. انتظر دقيقة، أو استخدم مفتاحاً بحصة أعلى.', 'Your Gemini key reached its request limit. Wait a minute, or use a key with a higher quota.'],
  AI_KEY_INVALID: ['مفتاح Gemini غير صالح أو لا يملك صلاحية. تحقّق منه في الإعدادات ← الذكاء الاصطناعي.', 'The Gemini key is invalid or not allowed. Check it in Settings → AI.'],
  AI_MODEL_UNAVAILABLE: ['نموذج الذكاء الاصطناعي غير متاح حالياً. حاول مرة أخرى لاحقاً.', 'The AI model is not available right now. Try again later.'],
  AI_EMPTY: ['لم يصل رد من الذكاء الاصطناعي. حاول مرة أخرى.', 'The AI returned no answer. Try again.'],
  AI_BAD_JSON: ['وصل رد غير مكتمل من الذكاء الاصطناعي. حاول مرة أخرى.', 'The AI returned an incomplete answer. Try again.']
}

/** Message for a failed AI request (axios error), in the dashboard language */
export function aiErrorMessage(err, isAr) {
  const data = err?.response?.data?.error
  const pair = MESSAGES[data?.code]
  if (pair) return isAr ? pair[0] : pair[1]
  return data?.message || err?.response?.data?.message || err?.message || ''
}
