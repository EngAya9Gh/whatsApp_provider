// Media-header templates (image / video / PDF at the top): what a sender may give for the header, the
// component Meta receives, and the dashboard helper that decides what a form can send.
const { test } = require('node:test');
const assert = require('node:assert');
const { pathToFileURL } = require('node:url');
const { fromRoot } = require('./helpers/env');

const media = require(fromRoot('src/modules/meta/meta.templateMedia'));
const dashboard = () => import(pathToFileURL(fromRoot('dashboard/src/utils/metaTemplate.js')).href);
const rejects400 = (fn, re) => assert.throws(fn, (e) => e.status === 400 && re.test(e.message));

test('header media given by the sender: uploaded id or https link, checked before sending', () => {
  assert.strictEqual(media.normalizeHeaderMedia(undefined), null);
  assert.strictEqual(media.normalizeHeaderMedia(''), null);
  assert.deepStrictEqual(media.normalizeHeaderMedia({ type: 'IMAGE', id: '123456789' }), { type: 'image', id: '123456789' });
  assert.deepStrictEqual(media.normalizeHeaderMedia('{"type":"document","link":"https://shop.sa/inv.pdf","filename":"فاتورة.pdf"}'),
    { type: 'document', link: 'https://shop.sa/inv.pdf', filename: 'فاتورة.pdf' }, 'campaign forms send it as JSON text');
  assert.deepStrictEqual(media.normalizeHeaderMedia({ type: 'image', link: 'https://x.sa/a.png', filename: 'ignored' }), { type: 'image', link: 'https://x.sa/a.png' });

  rejects400(() => media.normalizeHeaderMedia({ type: 'audio', id: '123456' }), /image, video or document/);
  rejects400(() => media.normalizeHeaderMedia({ type: 'image' }), /Upload the header file/);
  rejects400(() => media.normalizeHeaderMedia({ type: 'image', link: 'http://x.sa/a.png' }), /https/);
  rejects400(() => media.normalizeHeaderMedia({ type: 'image', id: '../etc' }), /media id/);
  rejects400(() => media.normalizeHeaderMedia('{bad json'), /JSON/);
});

test('the header component Meta expects', () => {
  assert.deepStrictEqual(media.headerComponent({ type: 'image', id: '42' }), { type: 'header', parameters: [{ type: 'image', image: { id: '42' } }] });
  assert.deepStrictEqual(media.headerComponent({ type: 'document', link: 'https://x.sa/f.pdf', filename: 'f.pdf' }),
    { type: 'header', parameters: [{ type: 'document', document: { link: 'https://x.sa/f.pdf', filename: 'f.pdf' } }] });
});

test('uploads: only the types and sizes Meta takes for each header', () => {
  assert.doesNotThrow(() => media.checkUpload('image', { mimetype: 'image/png', size: 1000 }));
  rejects400(() => media.checkUpload('image', { mimetype: 'image/gif', size: 1000 }), /image\/jpeg or image\/png/);
  rejects400(() => media.checkUpload('image', { mimetype: 'image/jpeg', size: 6 * 1024 * 1024 }), /5 MB/);
  rejects400(() => media.checkUpload('document', { mimetype: 'application/msword', size: 10 }), /application\/pdf/);
  assert.doesNotThrow(() => media.checkUpload('video', { mimetype: 'video/mp4', size: 15 * 1024 * 1024 }));
  rejects400(() => media.checkUpload('sticker', { mimetype: 'image/webp', size: 10 }), /Unknown header type/);
});

test('dashboard: image / video / PDF header templates can now be sent from a form; location headers still cannot', async () => {
  const { normalizeTemplate, buildComponents, buildPreview } = await dashboard();
  const offer = normalizeTemplate({
    name: 'offer', language: 'ar', category: 'MARKETING', status: 'APPROVED',
    components: [{ type: 'HEADER', format: 'IMAGE', example: { header_handle: ['https://cdn/x'] } }, { type: 'BODY', text: 'أهلاً {{1}}، عرضنا وصل!' }]
  });
  assert.strictEqual(offer.supported, true);
  assert.strictEqual(offer.headerMedia, 'image');
  assert.deepStrictEqual(buildComponents(offer, ['سارة'], [], { type: 'image', id: '77' }), [
    { type: 'header', parameters: [{ type: 'image', image: { id: '77' } }] },
    { type: 'body', parameters: [{ type: 'text', text: 'سارة' }] }
  ]);
  assert.match(buildPreview(offer, ['سارة']), /^🖼️ صورة\n\nأهلاً سارة/);

  const invoice = normalizeTemplate({ name: 'inv', components: [{ type: 'HEADER', format: 'DOCUMENT' }, { type: 'BODY', text: 'فاتورتك' }] });
  assert.deepStrictEqual(buildComponents(invoice, [], [], { type: 'document', link: 'https://x.sa/i.pdf', filename: 'i.pdf' })[0].parameters[0],
    { type: 'document', document: { link: 'https://x.sa/i.pdf', filename: 'i.pdf' } });

  const where = normalizeTemplate({ name: 'map', components: [{ type: 'HEADER', format: 'LOCATION' }, { type: 'BODY', text: 'هنا' }] });
  assert.strictEqual(where.supported, false);
  assert.strictEqual(where.unsupportedKind, 'media');

  const text = normalizeTemplate({ name: 't', components: [{ type: 'HEADER', format: 'TEXT', text: 'مرحبا' }, { type: 'BODY', text: 'x' }] });
  assert.strictEqual(text.headerMedia, null);
  assert.deepStrictEqual(buildComponents(text, [], [], { type: 'image', id: '1' }), [], 'no header media for a text header');
});
