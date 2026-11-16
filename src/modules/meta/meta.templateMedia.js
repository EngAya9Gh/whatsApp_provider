// The image / video / document at the top of a Meta template ("media header").
// Meta needs the actual file with every send: either the id of a file uploaded to Meta from this number
// (POST /{phone-number-id}/media, kept by Meta for 30 days) or a public https link Meta downloads.
// Header formats a template can have: IMAGE (JPEG/PNG), VIDEO (MP4/3GPP), DOCUMENT (PDF).
const MB = 1024 * 1024;
const KINDS = {
  image: { format: 'IMAGE', mimes: ['image/jpeg', 'image/png'], maxBytes: 5 * MB },
  video: { format: 'VIDEO', mimes: ['video/mp4', 'video/3gpp'], maxBytes: 16 * MB },
  document: { format: 'DOCUMENT', mimes: ['application/pdf'], maxBytes: 16 * MB }
};

const bad = (message) => ({ status: 400, message });

/** 'IMAGE' (a template header format) → 'image' */
const kindOfFormat = (format) => Object.keys(KINDS).find(k => KINDS[k].format === String(format || '').toUpperCase()) || null;

/** Which kind an uploaded file can be, or a 400 explaining what is accepted */
function checkUpload(kind, { mimetype, size }) {
  const spec = KINDS[kind];
  if (!spec) throw bad('Unknown header type: use image, video or document');
  if (!spec.mimes.includes(mimetype)) throw bad(`A ${kind} header must be ${spec.mimes.join(' or ')}`);
  if (size > spec.maxBytes) throw bad(`A ${kind} header can be at most ${spec.maxBytes / MB} MB`);
}

/**
 * Checks what the sender gave for the header: { type, id } or { type, link }, plus an optional filename
 * for documents. Returns null when nothing was given.
 */
function normalizeHeaderMedia(input) {
  if (input === undefined || input === null || input === '') return null;
  let media = input;
  if (typeof media === 'string') {
    try { media = JSON.parse(media); } catch { throw bad('headerMedia must be JSON'); }
  }
  if (typeof media !== 'object' || Array.isArray(media)) throw bad('headerMedia must be an object');
  const type = String(media.type || '').toLowerCase();
  if (!KINDS[type]) throw bad('headerMedia.type must be image, video or document');

  const out = { type };
  if (media.id) {
    if (!/^\d{5,30}$/.test(String(media.id))) throw bad('headerMedia.id is not a Meta media id');
    out.id = String(media.id);
  } else if (media.link) {
    let url;
    try { url = new URL(String(media.link)); } catch { throw bad('headerMedia.link is not a valid link'); }
    if (url.protocol !== 'https:') throw bad('headerMedia.link must start with https://');
    if (url.href.length > 2000) throw bad('headerMedia.link is too long');
    out.link = url.href;
  } else {
    throw bad('Upload the header file or give its link');
  }
  if (type === 'document' && media.filename) out.filename = String(media.filename).slice(0, 240);
  return out;
}

/** The `header` component Meta expects for a media header */
function headerComponent(media) {
  const { type, id, link, filename } = media;
  const value = id ? { id } : { link };
  if (type === 'document' && filename) value.filename = filename;
  return { type: 'header', parameters: [{ type, [type]: value }] };
}

module.exports = { KINDS, kindOfFormat, checkUpload, normalizeHeaderMedia, headerComponent };
