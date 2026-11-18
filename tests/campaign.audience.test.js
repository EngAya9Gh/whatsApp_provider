// The Meta campaign file checked against its template: phone numbers turned into the international form,
// values per variable, header / example rows, duplicates, missing values, CSV encodings, and the sample file.
require('./helpers/env');
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const xlsx = require('xlsx');
const audience = require('../src/modules/campaign/campaign.audience');
const { templateSpec } = require('../src/modules/meta/meta.templateSpec');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wk-audience-'));
const SA = audience.countryOf('966');
const spec = templateSpec({
  name: 'offer', language: 'ar', category: 'MARKETING',
  components: [{ type: 'BODY', text: 'مرحبا {{1}}، خصم {{2}} لك', example: { body_text: [['سارة', '25%']] } }]
});

const writeXlsx = (name, rows, edit) => {
  const sheet = xlsx.utils.aoa_to_sheet(rows);
  if (edit) edit(sheet);
  const file = path.join(dir, name);
  xlsx.writeFile({ SheetNames: ['s'], Sheets: { s: sheet } }, file);
  return file;
};

test('template spec: variables in order, Meta example values, and templates campaigns cannot send', () => {
  assert.deepStrictEqual(spec.variables, [1, 2]);
  assert.deepStrictEqual(spec.examples, ['سارة', '25%']);
  assert.strictEqual(spec.supported, true);
  const dynamicLink = templateSpec({ components: [{ type: 'BODY', text: 'hi' }, { type: 'BUTTONS', buttons: [{ type: 'URL', text: 'Track', url: 'https://x.com/{{1}}' }] }] });
  assert.strictEqual(dynamicLink.reason, 'buttons');
  assert.strictEqual(templateSpec({ components: [{ type: 'BODY', text: 'hi {{name}}' }] }).reason, 'variables');
  assert.strictEqual(templateSpec({ components: [{ type: 'CAROUSEL', cards: [] }] }).reason, 'carousel');
  assert.strictEqual(templateSpec({ components: [{ type: 'HEADER', format: 'IMAGE' }, { type: 'BODY', text: 'x' }] }).headerMedia, 'image');
});

test('phone numbers: international form from every common way of writing them', () => {
  const p = (v, c = SA) => audience.normalizePhone(v, c);
  assert.deepStrictEqual(p('966501234567'), { phone: '966501234567', converted: false });
  assert.deepStrictEqual(p(966501234567), { phone: '966501234567', converted: false }, 'Excel number cell');
  assert.strictEqual(p('+966 50 123 4567').phone, '966501234567');
  assert.strictEqual(p('00966501234567').phone, '966501234567');
  assert.deepStrictEqual(p('0501234567'), { phone: '966501234567', converted: true }, 'local number');
  assert.deepStrictEqual(p(501234567), { phone: '966501234567', converted: true }, 'Excel dropped the 0');
  assert.strictEqual(p('٠٥٠١٢٣٤٥٦٧').phone, '966501234567', 'Arabic digits');
  assert.strictEqual(p('‎+971 50 123 4567').phone, '971501234567', 'direction marks');
  assert.strictEqual(p('01012345678', audience.countryOf('20')).phone, '201012345678', 'Egypt');
  assert.strictEqual(p('+201012345678').phone, '201012345678', 'already international, other country');
  assert.strictEqual(p('0501234567', null).error, 'local', 'local number without a country');
  assert.strictEqual(p('9.66501E+11').error, 'scientific');
  assert.strictEqual(p('9665XXXXXXXX').error, 'example');
  assert.strictEqual(p('call me').error, 'invalid');
  assert.strictEqual(p('12345').error, 'length');
  assert.strictEqual(p('').error, 'empty');
});

test('an Excel file: header row, example row, values as shown in Excel, duplicates, missing values, extra columns', () => {
  const file = writeXlsx('u.xlsx', [
    ['الجوال', 'الاسم', 'الخصم', 'ملاحظة'],
    ['9665XXXXXXXX', 'سارة', '25%'],
    [966501234567, 'أحمد', 0.25],
    ['0551234567', '  علي\nمحمد  ', '10%', 'لا تُرسل'],
    ['+966 55 123 4567', 'مكرر', '5%'],
    [966502222222, 'منى', ''],
    ['abc', 'x', 'y'],
    [],
    [966503333333, 'رنا', 0.5]
  ], (sheet) => { sheet.C3.z = '0%'; sheet.C9.z = '0%'; });

  const { records, report } = audience.buildAudience(audience.readRows(file, 'u.xlsx'), { spec, country: SA });
  assert.deepStrictEqual(records.map(r => [r.phone, ...r.variables]), [
    ['966501234567', 'أحمد', '25%'],
    ['966551234567', 'علي محمد', '10%'],
    ['966503333333', 'رنا', '50%']
  ]);
  assert.deepStrictEqual(report.headerRow, ['الجوال', 'الاسم', 'الخصم', 'ملاحظة']);
  assert.strictEqual(report.exampleRows, 1);
  assert.strictEqual(report.duplicates, 1);
  assert.strictEqual(report.converted, 1);
  assert.deepStrictEqual(report.missing, [{ row: 6, column: 'C', variable: 2 }]);
  assert.deepStrictEqual(report.invalid, [{ row: 7, value: 'abc', reason: 'invalid' }]);
  assert.strictEqual(report.extraColumns, 1, 'the note column is not sent');
  assert.strictEqual(report.valid, 3);

  // An empty value can take the sender's fallback instead of skipping the row
  const withFallback = audience.buildAudience(audience.readRows(file, 'u.xlsx'), { spec, country: SA, fallbacks: ['', 'عرض خاص'] });
  assert.ok(withFallback.records.some(r => r.phone === '966502222222' && r.variables[1] === 'عرض خاص'));
});

test('too few columns for the template: every row is missing a value', () => {
  const file = writeXlsx('few.xlsx', [[966501234567, 'أحمد'], [966501234568, 'سارة']]);
  const { records, report } = audience.buildAudience(audience.readRows(file, 'few.xlsx'), { spec, country: SA });
  assert.strictEqual(records.length, 0);
  assert.strictEqual(report.columns.found, 1);
  assert.strictEqual(report.columns.needed, 2);
  assert.strictEqual(report.missingCount, 2);
});

test('CSV files: semicolons, quoted commas, Windows Arabic (1256) and Excel "Unicode text" (UTF-16)', () => {
  const csv = 'phone;name;discount\n966501234567;"أحمد, علي";10%\n0551234567;سارة;20%\n';
  const utf8 = path.join(dir, 'a.csv');
  fs.writeFileSync(utf8, '﻿' + csv);
  const rows = audience.readRows(utf8, 'a.csv');
  const { records } = audience.buildAudience(rows, { spec, country: SA });
  assert.deepStrictEqual(records.map(r => [r.phone, ...r.variables]), [['966501234567', 'أحمد, علي', '10%'], ['966551234567', 'سارة', '20%']]);

  // Windows-1256: "أحمد" = C3 CD E3 CF
  const cp1256 = path.join(dir, 'b.csv');
  fs.writeFileSync(cp1256, Buffer.concat([Buffer.from('966501234567,'), Buffer.from([0xc3, 0xcd, 0xe3, 0xcf]), Buffer.from(',5%\n')]));
  assert.deepStrictEqual(audience.buildAudience(audience.readRows(cp1256, 'b.csv'), { spec, country: SA }).records[0].variables, ['أحمد', '5%']);

  const utf16 = path.join(dir, 'c.txt');
  fs.writeFileSync(utf16, Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('phone\tname\tdiscount\r\n966501234567\tمنى\t7%\r\n', 'utf16le')]));
  assert.deepStrictEqual(audience.buildAudience(audience.readRows(utf16, 'c.txt'), { spec, country: SA }).records[0].variables, ['منى', '7%']);
});

test('without a known template every column after A is sent, as before', () => {
  const file = writeXlsx('any.xlsx', [[966501234567, 'a', 'b', '']]);
  const { records } = audience.buildAudience(audience.readRows(file, 'any.xlsx'), { spec: null, country: SA });
  assert.deepStrictEqual(records[0].variables, ['a', 'b']);
});

test('contact groups: each variable from the name, a field or fixed text; "Unknown" names take the fallback', () => {
  const contacts = [
    { phone: '966501234567', name: 'سارة', metadata: { city: 'الرياض' } },
    { phone: '0551234567', name: 'Unknown', metadata: { city: 'جدة' } },
    { phone: '966509999999', name: 'Unknown', metadata: {} }
  ];
  const fields = audience.contactFields(contacts);
  assert.deepStrictEqual(fields, ['city']);
  assert.deepStrictEqual(audience.defaultMapping(spec, fields), [{ source: 'name' }, { source: 'field', key: 'city' }]);

  const mapping = [{ source: 'name', fallback: 'عميلنا العزيز' }, { source: 'text', text: '15%' }];
  const { records, report } = audience.buildAudience(audience.contactRows(contacts, spec, mapping), {
    spec, country: SA, header: false, fallbacks: mapping.map(m => m.fallback)
  });
  assert.deepStrictEqual(records.map(r => [r.phone, ...r.variables]), [
    ['966501234567', 'سارة', '15%'],
    ['966551234567', 'عميلنا العزيز', '15%'],
    ['966509999999', 'عميلنا العزيز', '15%']
  ]);
  assert.strictEqual(report.headerRow, null);
});

test('the sample file has the template columns, an example row that is never sent, and reads back cleanly', () => {
  const file = path.join(dir, 'sample.xlsx');
  fs.writeFileSync(file, audience.sampleWorkbook(spec));
  const book = xlsx.readFile(file, { cellNF: true });
  assert.deepStrictEqual(book.SheetNames, ['الأرقام', 'طريقة التعبئة']);
  const header = xlsx.utils.sheet_to_json(book.Sheets['الأرقام'], { header: 1 })[0];
  assert.strictEqual(header.length, 3);
  assert.match(header[1], /\{\{1\}\}.*سارة/);
  assert.strictEqual(book.Sheets['الأرقام'].A3.z, '@', 'phone column kept as text');

  const { records, report } = audience.buildAudience(audience.readRows(file, 'sample.xlsx'), { spec, country: SA });
  assert.strictEqual(records.length, 0);
  assert.strictEqual(report.exampleRows, 1);
  assert.ok(report.headerRow);
});
