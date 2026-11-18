// Who a Meta campaign goes to, and with which values: reads the uploaded Excel / CSV file (or a contact group),
// checks every row against the chosen template and says what is wrong before anything is charged.
//
// File layout: column A = phone number, then one column per template variable in order (B = {{1}}, C = {{2}}…).
// A header row and the sample file's example row are skipped. Phone numbers are turned into the international
// form Meta needs (digits only, with the country code): "+966 50…", "00966…", a local "05…" and a number whose
// leading 0 Excel dropped ("5…") all become 9665…, using the country the sender picked for local numbers.
const fs = require('fs');
const xlsx = require('xlsx');

const MAX_ROWS = 200000;
const LIST_LIMIT = 50; // rows listed per problem kind (all of them are counted)

// Local numbers: national number length and the first digit(s) of mobile numbers
const COUNTRIES = [
  { code: '966', ar: 'السعودية', en: 'Saudi Arabia', nsn: [9], mobile: ['5'] },
  { code: '971', ar: 'الإمارات', en: 'UAE', nsn: [9], mobile: ['5'] },
  { code: '965', ar: 'الكويت', en: 'Kuwait', nsn: [8], mobile: ['5', '6', '9'] },
  { code: '974', ar: 'قطر', en: 'Qatar', nsn: [8], mobile: ['3', '5', '6', '7'] },
  { code: '973', ar: 'البحرين', en: 'Bahrain', nsn: [8], mobile: ['3', '6'] },
  { code: '968', ar: 'عُمان', en: 'Oman', nsn: [8], mobile: ['7', '9'] },
  { code: '962', ar: 'الأردن', en: 'Jordan', nsn: [9], mobile: ['7'] },
  { code: '963', ar: 'سوريا', en: 'Syria', nsn: [9], mobile: ['9'] },
  { code: '961', ar: 'لبنان', en: 'Lebanon', nsn: [7, 8], mobile: ['3', '7', '8'] },
  { code: '964', ar: 'العراق', en: 'Iraq', nsn: [10], mobile: ['7'] },
  { code: '970', ar: 'فلسطين', en: 'Palestine', nsn: [9], mobile: ['5'] },
  { code: '967', ar: 'اليمن', en: 'Yemen', nsn: [9], mobile: ['7'] },
  { code: '20', ar: 'مصر', en: 'Egypt', nsn: [10], mobile: ['1'] },
  { code: '249', ar: 'السودان', en: 'Sudan', nsn: [9], mobile: ['1', '9'] },
  { code: '212', ar: 'المغرب', en: 'Morocco', nsn: [9], mobile: ['6', '7'] },
  { code: '213', ar: 'الجزائر', en: 'Algeria', nsn: [9], mobile: ['5', '6', '7'] },
  { code: '216', ar: 'تونس', en: 'Tunisia', nsn: [8], mobile: ['2', '4', '5', '9'] },
  { code: '90', ar: 'تركيا', en: 'Turkey', nsn: [10], mobile: ['5'] }
];
const countryOf = (code) => COUNTRIES.find(c => c.code === String(code || '').replace(/\D/g, '')) || null;

const BIDI = /[‎‏‪-‮⁦-⁩ ]/g;
const latinDigits = (s) => s
  .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x660))
  .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x6f0));

/**
 * One phone cell → { phone, converted } or { error }
 * error: empty | example | scientific (9.66E+11) | invalid (letters or a fraction) | local (starts with 0, no country chosen) | length
 */
function normalizePhone(raw, country = null) {
  let s;
  if (typeof raw === 'number') {
    if (!Number.isInteger(raw)) return { error: 'invalid' };
    s = raw.toFixed(0);
  } else {
    s = latinDigits(String(raw ?? '').replace(BIDI, ' ')).trim();
  }
  if (!s) return { error: 'empty' };
  if (/x{3,}/i.test(s)) return { error: 'example' };
  // "9.66501E+11": Excel saved the number in short form and its last digits are lost
  if (/^\d+(\.\d+)?e\+?\d+$/i.test(s.replace(/\s/g, ''))) return { error: 'scientific' };
  if (/[^\d\s+\-().]/.test(s) || /\d\s*\+/.test(s)) return { error: 'invalid' };

  const plus = s.startsWith('+');
  let digits = s.replace(/\D/g, '');
  let converted = false;
  if (!plus && digits.startsWith('00')) {
    digits = digits.slice(2);
  } else if (!plus && digits.startsWith('0')) {
    if (!country) return { error: 'local' };
    digits = country.code + digits.slice(1);
    converted = true;
  } else if (!plus && country && country.nsn.includes(digits.length) && country.mobile.some(p => digits.startsWith(p))) {
    digits = country.code + digits; // Excel dropped the 0 of a local number
    converted = true;
  }
  if (digits.length < 8 || digits.length > 15) return { error: 'length' };
  return { phone: digits, converted };
}

// Meta refuses variable values with new lines, tabs or long runs of spaces
const cleanValue = (v) => String(v ?? '').replace(BIDI, ' ').replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim();

/** What a spreadsheet cell shows (dates and decimals as formatted in Excel; long numbers in full) */
function cellText(cell) {
  if (!cell) return '';
  if (cell.t === 'n') {
    if (cell.w && !/e[+-]/i.test(cell.w)) return cell.w;
    return Number.isInteger(cell.v) ? cell.v.toFixed(0) : String(cell.v);
  }
  if (cell.t === 'b') return cell.v ? 'TRUE' : 'FALSE';
  if (cell.t === 'e' || cell.t === 'z') return '';
  if (cell.t === 'd') return cell.w || (cell.v instanceof Date ? cell.v.toISOString().slice(0, 10) : String(cell.v));
  return String(cell.v ?? '');
}

/** A CSV / TXT file's text: UTF-8 (with or without BOM), UTF-16 (Excel "Unicode text"), or Arabic Windows-1256 */
function decodeText(buf) {
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return buf.subarray(3).toString('utf8');
  if (buf[0] === 0xff && buf[1] === 0xfe) return new TextDecoder('utf-16le').decode(buf.subarray(2));
  if (buf[0] === 0xfe && buf[1] === 0xff) return new TextDecoder('utf-16be').decode(buf.subarray(2));
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder('windows-1256').decode(buf);
  }
}

const tooBig = () => ({ status: 400, code: 'FILE_TOO_MANY_ROWS', message: `The file has more than ${MAX_ROWS.toLocaleString('en-US')} rows. Split it into smaller campaigns.` });

/** Rows of the first sheet: [[{ raw, text }, …], …] (raw = the cell value, text = what the cell shows) */
function readRows(filePath, originalName = '') {
  const isText = /\.(csv|txt)$/i.test(originalName);
  let workbook;
  try {
    workbook = isText
      ? xlsx.read(decodeText(fs.readFileSync(filePath)), { type: 'string', raw: true })
      : xlsx.readFile(filePath);
  } catch (e) {
    throw { status: 400, code: 'FILE_UNREADABLE', message: 'The file could not be read. Upload an Excel (.xlsx) or CSV file.' };
  }
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet || !sheet['!ref']) return [];
  const range = xlsx.utils.decode_range(sheet['!ref']);
  if (range.e.r - range.s.r + 1 > MAX_ROWS + 1) throw tooBig();
  const lastCol = Math.min(range.e.c, range.s.c + 60);
  const rows = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const row = [];
    for (let c = range.s.c; c <= lastCol; c++) {
      const cell = sheet[xlsx.utils.encode_cell({ r, c })];
      row.push({ raw: cell ? cell.v : '', text: cellText(cell) });
    }
    while (row.length && !row[row.length - 1].text) row.pop();
    rows.push(row);
  }
  return rows;
}

const columnLetter = (i) => {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

/**
 * Checks the rows against the template. Returns { records: [{ phone, variables, row }], report }.
 *  spec: templateSpec() of the template (null = unknown: every column after A is sent, as before)
 *  country: COUNTRIES entry for local numbers (null = local numbers are invalid)
 *  fallbacks: value per variable when its cell is empty (otherwise the row is skipped: Meta refuses empty values)
 *  header: true (default) = the first row is a header when its column A holds no phone number
 */
function buildAudience(rows, { spec = null, country = null, fallbacks = [], header = true } = {}) {
  const need = spec ? spec.variables.length : null;
  const report = {
    rows: 0,
    valid: 0,
    headerRow: null, // the header row's cells, when the file has one
    exampleRows: 0,
    duplicates: 0,
    converted: 0,
    invalid: [], // { row, value, reason }
    invalidCount: 0,
    missing: [], // { row, column, variable }
    missingCount: 0,
    columns: { needed: need, found: 0 },
    extraColumns: 0,
    sample: []
  };
  const records = [];
  const seen = new Set();
  let first = true;

  rows.forEach((row, index) => {
    if (!row.length || row.every(c => !String(c.text).trim())) return;
    const rowNo = index + 1;
    if (first && header) {
      first = false;
      const a = latinDigits(String(row[0]?.text ?? ''));
      if (!/\d{7,}/.test(a.replace(/[\s\-().+]/g, ''))) {
        report.headerRow = row.map(c => String(c.text).trim());
        return;
      }
    }
    first = false;
    report.rows++;
    report.columns.found = Math.max(report.columns.found, row.length - 1);

    const result = normalizePhone(typeof row[0]?.raw === 'number' ? row[0].raw : row[0]?.text, country);
    if (result.error === 'example') { report.rows--; report.exampleRows++; return; }
    if (result.error) {
      report.invalidCount++;
      if (report.invalid.length < LIST_LIMIT) report.invalid.push({ row: rowNo, value: String(row[0]?.text ?? '').slice(0, 40), reason: result.error });
      return;
    }

    let variables;
    if (need === null) {
      variables = row.slice(1).map(c => cleanValue(c.text));
      while (variables.length && variables[variables.length - 1] === '') variables.pop();
    } else {
      variables = [];
      let missing = null;
      for (let i = 0; i < need; i++) {
        const value = cleanValue(row[i + 1]?.text) || cleanValue(fallbacks[i]);
        if (!value) { missing = i; break; }
        variables.push(value);
      }
      if (missing !== null) {
        report.missingCount++;
        if (report.missing.length < LIST_LIMIT) report.missing.push({ row: rowNo, column: columnLetter(missing + 1), variable: spec.variables[missing] });
        return;
      }
      if (row.slice(need + 1).some(c => String(c.text).trim())) report.extraColumns = Math.max(report.extraColumns, row.length - 1 - need);
    }

    if (seen.has(result.phone)) { report.duplicates++; return; }
    seen.add(result.phone);
    if (result.converted) report.converted++;
    records.push({ phone: result.phone, variables, row: rowNo });
  });

  report.valid = records.length;
  report.sample = records.slice(0, 3).map(r => ({ phone: r.phone, variables: r.variables, row: r.row }));
  return { records, report };
}

/** Metadata fields of a contact group's contacts (from their imported columns), for mapping variables */
function contactFields(contacts) {
  const keys = new Set();
  for (const c of contacts.slice(0, 5000)) {
    if (c.metadata && typeof c.metadata === 'object') Object.keys(c.metadata).forEach(k => keys.add(k));
  }
  return [...keys].sort();
}

/**
 * What fills each variable for a contact group: [{ source: 'name' | 'phone' | 'field' | 'text', key?, text?, fallback? }]
 * Default: {{1}} = the contact's name, the next ones = the contacts' extra fields in order.
 */
function defaultMapping(spec, fields) {
  return (spec?.variables || []).map((_, i) => (i === 0 ? { source: 'name' } : (fields[i - 1] ? { source: 'field', key: fields[i - 1] } : { source: 'text', text: '' })));
}

const contactName = (c) => (c.name && c.name !== 'Unknown' ? c.name : '');

/** Contacts → rows like a file's (no header). Without a template spec: name + extra fields, as before. */
function contactRows(contacts, spec, mapping) {
  return contacts.map(c => {
    const values = spec
      ? (mapping || []).map(m => {
        if (m.source === 'name') return contactName(c);
        if (m.source === 'phone') return c.phone;
        if (m.source === 'field') return c.metadata?.[m.key] ?? '';
        return m.text || '';
      })
      : [contactName(c), ...Object.keys(c.metadata || {}).sort().map(k => c.metadata[k])].filter(v => v !== '');
    return [{ raw: c.phone, text: c.phone }, ...values.map(v => ({ raw: v, text: v === null || v === undefined ? '' : String(v) }))];
  });
}

/** The sample .xlsx for a template: the columns it needs, one example row (skipped when sending) and how to fill it */
function sampleWorkbook(spec) {
  const variables = spec?.variables || [];
  const headers = ['رقم الجوال مع رمز الدولة — Phone', ...variables.map((n, i) => `{{${n}}}${spec.examples?.[i] ? ` — مثال: ${spec.examples[i]}` : ''}`)];
  const example = ['9665XXXXXXXX', ...variables.map((n, i) => spec.examples?.[i] || `قيمة {{${n}}}`)];
  const sheet = xlsx.utils.aoa_to_sheet([headers, example]);
  // Column A as text, so Excel keeps long numbers as typed (not 9.66E+11) for the first rows people fill
  for (let r = 0; r <= 1001; r++) {
    const ref = xlsx.utils.encode_cell({ r, c: 0 });
    sheet[ref] = { ...(sheet[ref] || { t: 's', v: '' }), z: '@' };
  }
  sheet['!ref'] = xlsx.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 1001, c: Math.max(0, variables.length) } });
  sheet['!cols'] = [{ wch: 30 }, ...variables.map(() => ({ wch: 28 }))];

  const lines = [
    ['طريقة تعبئة ملف الحملة'],
    [''],
    [`القالب: ${spec?.name || ''}`],
    ['نص الرسالة:'],
    [spec?.body || ''],
    [''],
    ['1. العمود A: رقم جوال العميل مع رمز الدولة، مثل 966501234567. الأرقام المحلية (05…) تتحول تلقائياً حسب الدولة التي تختارها عند رفع الملف.'],
    ...variables.map((n, i) => [`${i + 2}. العمود ${columnLetter(i + 1)}: قيمة {{${n}}} لكل عميل${spec.examples?.[i] ? ` (مثال: ${spec.examples[i]})` : ''}. لا تتركها فارغة.`]),
    [variables.length ? `${variables.length + 2}. لا تغيّر ترتيب الأعمدة. صف العناوين وصف المثال (9665XXXXXXXX) لا يُرسل لهما.` : '2. هذا القالب بلا متغيرات: يكفي عمود الأرقام. صف العناوين وصف المثال لا يُرسل لهما.'],
    ['الأرقام المكررة تُرسل مرة واحدة، والصفوف الناقصة تظهر لك قبل الإطلاق ولا تُحسب عليك.']
  ];
  const help = xlsx.utils.aoa_to_sheet(lines);
  help['!cols'] = [{ wch: 110 }];

  const workbook = { SheetNames: ['الأرقام', 'طريقة التعبئة'], Sheets: { 'الأرقام': sheet, 'طريقة التعبئة': help }, Workbook: { Views: [{ RTL: true }] } };
  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = {
  COUNTRIES, MAX_ROWS, countryOf, normalizePhone, cleanValue, decodeText, readRows, buildAudience,
  contactFields, defaultMapping, contactRows, sampleWorkbook, columnLetter
};
