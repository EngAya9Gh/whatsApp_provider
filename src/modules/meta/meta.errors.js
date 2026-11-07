/**
 * Meta's Graph API reports a failed call as { error: { message, code, error_subcode, error_data: { details } } }.
 * MetaService throws that body as is, so the senders receive it as a plain object; axios errors carry it
 * in response.data. This turns any of those (or a normal Error) into one predictable shape, so the real
 * reason for a failure can reach the screen instead of a generic "Meta rejected the message".
 */
const metaErrorInfo = (err) => {
  const e = err?.error || err?.response?.data?.error || null;
  if (e && typeof e === 'object' && (e.message || e.code)) {
    return {
      code: typeof e.code === 'number' ? e.code : null,
      subcode: e.error_subcode ?? null,
      message: e.message || 'Meta API error',
      details: e.error_data?.details || null
    };
  }
  return { code: null, subcode: null, message: err?.message || 'Unknown error', details: null };
};

/** One readable line for a log row or an API response, e.g. "(#131030) Recipient phone number not in allowed list". */
const metaErrorText = (err) => {
  const { message, details } = metaErrorInfo(err);
  return details && !message.includes(details) ? `${message} — ${details}` : message;
};

module.exports = { metaErrorInfo, metaErrorText };
