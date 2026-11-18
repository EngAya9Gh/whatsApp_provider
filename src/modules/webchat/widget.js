/*!
 * Wakeel website chat widget.
 * <script src="https://provider.wakeel.cc/api/v1/webchat/widget.js" data-id="WIDGET_ID" async></script>
 * Self-contained: no libraries, its own styles inside a shadow root, so it never clashes with the site.
 */
(function () {
  'use strict';
  var script = document.currentScript || (function () {
    var all = document.querySelectorAll('script[data-id][src*="webchat/widget.js"]');
    return all[all.length - 1];
  })();
  if (!script || window.__wakeelChat) return;
  window.__wakeelChat = true;

  var WIDGET_ID = script.getAttribute('data-id');
  var BASE = new URL(script.src, location.href).origin + '/api/v1/webchat/public/' + encodeURIComponent(WIDGET_ID);
  var STORE_KEY = 'wakeel_chat_' + WIDGET_ID;
  var POLL_OPEN_MS = 3000;
  var POLL_CLOSED_MS = 15000;

  var T = {
    ar: {
      open: 'افتح المحادثة', close: 'إغلاق', online: 'متصلون الآن', offline: 'خارج الدوام، نرد عليك بأقرب وقت',
      placeholder: 'اكتب رسالتك…', send: 'إرسال', name: 'الاسم', phone: 'رقم الجوال', phoneOptional: 'رقم الجوال (اختياري)',
      start: 'ابدأ المحادثة', whatsapp: 'تابع على واتساب', error: 'تعذّر الإرسال، حاول مرة أخرى',
      needName: 'اكتب اسمك', needPhone: 'اكتب رقم جوالك مع رمز الدولة', powered: 'مدعوم من وكيل'
    },
    en: {
      open: 'Open chat', close: 'Close', online: 'We are online', offline: 'We are away, we will reply soon',
      placeholder: 'Write a message…', send: 'Send', name: 'Name', phone: 'Mobile number', phoneOptional: 'Mobile number (optional)',
      start: 'Start chat', whatsapp: 'Continue on WhatsApp', error: 'Could not send, try again',
      needName: 'Write your name', needPhone: 'Write your number with the country code', powered: 'Powered by Wakeel'
    }
  };

  var state = { config: null, me: load(), messages: {}, pending: [], open: false, lastAt: null, timer: null, unread: 0, busy: false };
  var t = T.ar;
  var ui = {};

  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state.me)); } catch (e) { /* private mode */ }
  }

  function api(method, path, body) {
    var headers = { 'Content-Type': 'application/json' };
    if (state.me.visitorId) { headers['X-Visitor-Id'] = state.me.visitorId; headers['X-Visitor-Token'] = state.me.token; }
    return fetch(BASE + path, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (json) {
          if (!res.ok) { var err = new Error((json.error && json.error.message) || 'Request failed'); err.status = res.status; err.code = json.error && json.error.code; throw err; }
          return json.data;
        });
      });
  }

  function session() {
    return api('POST', '/session', { visitorId: state.me.visitorId, token: state.me.token }).then(function (s) {
      if (s.visitorId !== state.me.visitorId) { state.messages = {}; state.lastAt = null; }
      state.me.visitorId = s.visitorId; state.me.token = s.token; state.me.ref = s.ref;
      save();
    });
  }

  // ─── Building the widget ───
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') node.textContent = attrs[k];
      else if (k === 'on') Object.keys(attrs.on).forEach(function (ev) { node.addEventListener(ev, attrs.on[ev]); });
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  /** Text with clickable web links, without ever parsing HTML */
  function richText(text) {
    var frag = document.createDocumentFragment();
    String(text || '').split(/(https?:\/\/[^\s<]+)/g).forEach(function (part, i) {
      if (i % 2 === 1) frag.appendChild(el('a', { href: part, target: '_blank', rel: 'noopener noreferrer', text: part }));
      else if (part) frag.appendChild(document.createTextNode(part));
    });
    return frag;
  }

  function styles(color) {
    return ':host{all:initial}*{box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",Tahoma,Arial,sans-serif}' +
      '.wrap{position:fixed;bottom:20px;z-index:2147483000;display:flex;flex-direction:column;gap:12px}' +
      '.wrap.right{right:20px;align-items:flex-end}.wrap.left{left:20px;align-items:flex-start}' +
      '.launcher{width:58px;height:58px;border-radius:50%;border:0;cursor:pointer;background:' + color + ';color:#fff;box-shadow:0 6px 20px rgba(0,0,0,.2);display:flex;align-items:center;justify-content:center;position:relative}' +
      '.launcher svg{width:28px;height:28px}.badge{position:absolute;top:-4px;right:-4px;background:#e11d48;color:#fff;border-radius:10px;font-size:11px;padding:2px 6px;font-weight:700}' +
      '.panel{width:360px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 110px);background:#fff;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.2);display:none;flex-direction:column;overflow:hidden;color:#1f2937}' +
      '.panel.open{display:flex}.head{background:' + color + ';color:#fff;padding:14px 16px;display:flex;align-items:center;gap:10px}' +
      '.head .t{flex:1;min-width:0}.head b{display:block;font-size:15px}.head small{font-size:12px;opacity:.9;display:flex;align-items:center;gap:6px}' +
      '.dot{width:8px;height:8px;border-radius:50%;background:#86efac;display:inline-block}.dot.off{background:#fde68a}' +
      '.x{background:transparent;border:0;color:#fff;font-size:22px;cursor:pointer;line-height:1;padding:4px}' +
      '.body{flex:1;overflow-y:auto;padding:14px;background:#f6f7f9;display:flex;flex-direction:column;gap:8px}' +
      '.msg{max-width:82%;padding:9px 12px;border-radius:14px;font-size:14px;line-height:1.6;white-space:pre-wrap;word-wrap:break-word}' +
      '.msg a{color:inherit;text-decoration:underline}.them{background:#fff;align-self:flex-start;border:1px solid #e5e7eb}' +
      '.me{background:' + color + ';color:#fff;align-self:flex-end}.pending{opacity:.6}' +
      '.opts{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.opt{border:1px solid ' + color + ';color:' + color + ';background:#fff;border-radius:999px;padding:6px 12px;font-size:13px;cursor:pointer}' +
      '.opt:disabled{opacity:.5;cursor:default}.linkbtn{display:block;text-align:center;margin-top:8px;background:' + color + ';color:#fff !important;text-decoration:none !important;border-radius:10px;padding:8px}' +
      '.foot{border-top:1px solid #e5e7eb;padding:10px;display:flex;gap:8px;align-items:flex-end;background:#fff}' +
      'textarea,input{width:100%;border:1px solid #d1d5db;border-radius:10px;padding:9px 11px;font-size:14px;outline:none;resize:none;color:#111827;background:#fff}' +
      'textarea:focus,input:focus{border-color:' + color + '}.send{background:' + color + ';color:#fff;border:0;border-radius:10px;padding:0 14px;height:40px;cursor:pointer;font-size:14px;flex-shrink:0}' +
      '.send:disabled{opacity:.5}.form{padding:16px;display:flex;flex-direction:column;gap:10px;background:#fff;border-top:1px solid #e5e7eb}' +
      '.err{color:#e11d48;font-size:12px;padding:0 12px 8px;background:#fff}.wa{display:flex;align-items:center;justify-content:center;gap:6px;font-size:12px;color:#15803d;background:#f0fdf4;border:0;border-top:1px solid #dcfce7;padding:8px;cursor:pointer;width:100%}' +
      '.pw{font-size:10px;color:#9ca3af;text-align:center;padding:4px;background:#fff}' +
      '@media (max-width:480px){.panel{width:calc(100vw - 24px);height:calc(100vh - 100px)}.wrap.right{right:12px}.wrap.left{left:12px}}';
  }

  var ICON_CHAT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';

  function build(config) {
    t = T[config.language] || T.ar;
    var host = el('div', { id: 'wakeel-chat' });
    var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
    root.appendChild(el('style', { text: styles(config.color) }));

    // The corner is physical (right / left) whatever the language: only the panel's contents follow it
    ui.wrap = el('div', { class: 'wrap ' + (config.position === 'left' ? 'left' : 'right'), dir: 'ltr' });
    ui.status = el('small');
    ui.body = el('div', { class: 'body', 'aria-live': 'polite' });
    ui.err = el('div', { class: 'err' });
    ui.err.style.display = 'none';
    ui.text = el('textarea', { rows: '1', placeholder: t.placeholder, 'aria-label': t.placeholder });
    ui.text.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText(); } });
    ui.sendBtn = el('button', { class: 'send', type: 'button', text: t.send, on: { click: sendText } });
    ui.foot = el('div', { class: 'foot' }, [ui.text, ui.sendBtn]);
    ui.form = buildForm(config);

    var waBtn = config.whatsapp ? el('button', { class: 'wa', type: 'button', text: '🟢 ' + t.whatsapp, on: { click: openWhatsApp } }) : null;
    ui.panel = el('div', { class: 'panel', role: 'dialog', 'aria-label': config.title, dir: config.language === 'en' ? 'ltr' : 'rtl' }, [
      el('div', { class: 'head' }, [
        el('div', { class: 't' }, [el('b', { text: config.title }), ui.status]),
        el('button', { class: 'x', type: 'button', 'aria-label': t.close, text: '×', on: { click: toggle } })
      ]),
      ui.body, ui.err, ui.form, ui.foot, waBtn, el('div', { class: 'pw', text: t.powered })
    ]);
    ui.badge = el('span', { class: 'badge' });
    ui.badge.style.display = 'none';
    ui.launcher = el('button', { class: 'launcher', type: 'button', 'aria-label': t.open, on: { click: toggle } });
    ui.launcher.innerHTML = ICON_CHAT; // fixed markup of our own icon
    ui.launcher.appendChild(ui.badge);

    ui.wrap.appendChild(ui.panel);
    ui.wrap.appendChild(ui.launcher);
    root.appendChild(ui.wrap);
    document.body.appendChild(host);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && state.open) toggle(); });
    setStatus(config.online);
    showFormIfNeeded();
  }

  function buildForm(config) {
    var fields = [];
    ui.name = config.askName ? el('input', { type: 'text', placeholder: t.name, autocomplete: 'name', maxlength: '80' }) : null;
    ui.phone = config.askPhone !== 'OFF' ? el('input', { type: 'tel', placeholder: config.askPhone === 'REQUIRED' ? t.phone : t.phoneOptional, autocomplete: 'tel', dir: 'ltr', maxlength: '20' }) : null;
    if (ui.name) fields.push(ui.name);
    if (ui.phone) fields.push(ui.phone);
    fields.push(el('button', { class: 'send', type: 'button', text: t.start, on: { click: submitForm } }));
    return el('div', { class: 'form' }, fields);
  }

  function needsForm() {
    var c = state.config;
    if (state.me.started || Object.keys(state.messages).length) return false;
    return !!(c.askName || c.askPhone === 'REQUIRED');
  }
  function showFormIfNeeded() {
    var form = needsForm();
    ui.form.style.display = form ? 'flex' : 'none';
    ui.foot.style.display = form ? 'none' : 'flex';
  }
  function submitForm() {
    var name = ui.name ? ui.name.value.trim() : '';
    var phone = ui.phone ? ui.phone.value.trim() : '';
    if (ui.name && !name) return showError(t.needName);
    if (state.config.askPhone === 'REQUIRED' && phone.replace(/\D/g, '').length < 8) return showError(t.needPhone);
    state.me.name = name || undefined;
    state.me.phone = phone || undefined;
    state.me.started = true;
    save();
    showError('');
    showFormIfNeeded();
    ui.text.focus();
  }

  function setStatus(online) {
    ui.status.textContent = '';
    ui.status.appendChild(el('span', { class: 'dot' + (online ? '' : ' off') }));
    ui.status.appendChild(document.createTextNode(online ? t.online : t.offline));
  }
  function showError(text) {
    ui.err.textContent = text || '';
    ui.err.style.display = text ? 'block' : 'none';
  }

  // ─── Messages ───
  function render() {
    var list = Object.keys(state.messages).map(function (id) { return state.messages[id]; })
      .sort(function (a, b) { return new Date(a.at) - new Date(b.at); });
    var lastOptionsId = null;
    list.forEach(function (m) { if (m.from !== 'visitor') lastOptionsId = m.options && m.options.length ? m.id : lastOptionsId; if (m.from === 'visitor') lastOptionsId = null; });

    ui.body.textContent = '';
    if (state.config.welcome) ui.body.appendChild(el('div', { class: 'msg them' }, [richText(state.config.welcome)]));
    list.forEach(function (m) {
      var bubble = el('div', { class: 'msg ' + (m.from === 'visitor' ? 'me' : 'them') }, [richText(m.text)]);
      if (m.options && m.options.length) {
        var answered = m.id !== lastOptionsId;
        bubble.appendChild(el('div', { class: 'opts' }, m.options.map(function (o) {
          var b = el('button', { class: 'opt', type: 'button', text: o.title, on: { click: function () { send(o.title, o.id); } } });
          if (answered) b.disabled = true;
          return b;
        })));
      }
      if (m.link && /^https?:\/\//.test(m.link.url)) {
        bubble.appendChild(el('a', { class: 'linkbtn', href: m.link.url, target: '_blank', rel: 'noopener noreferrer', text: m.link.text }));
      }
      ui.body.appendChild(bubble);
    });
    state.pending.forEach(function (p) { ui.body.appendChild(el('div', { class: 'msg me pending' }, [richText(p.text)])); });
    ui.body.scrollTop = ui.body.scrollHeight;
  }

  function merge(messages) {
    var fresh = 0;
    messages.forEach(function (m) {
      if (!state.messages[m.id]) {
        fresh++;
        if (m.from === 'visitor') {
          var i = state.pending.findIndex(function (p) { return p.text === m.text; });
          if (i >= 0) state.pending.splice(i, 1);
        } else if (!state.open && state.lastAt) {
          state.unread++;
        }
      }
      state.messages[m.id] = m;
      if (!state.lastAt || new Date(m.at) > new Date(state.lastAt)) state.lastAt = m.at;
    });
    return fresh;
  }

  function poll() {
    clearTimeout(state.timer);
    if (!state.me.visitorId || document.visibilityState === 'hidden') return schedule();
    var q = '/messages?seen=' + (state.open ? '1' : '0') + (state.lastAt ? '&after=' + encodeURIComponent(state.lastAt) : '');
    api('GET', q).then(function (data) {
      if (merge(data.messages || [])) render();
      updateBadge();
    }).catch(function (err) {
      if (err.status === 401) return session();
    }).then(schedule, schedule);
  }
  function schedule() {
    clearTimeout(state.timer);
    var hasChat = Object.keys(state.messages).length || state.pending.length;
    if (!state.open && !hasChat) return; // nothing to watch until the visitor writes
    state.timer = setTimeout(poll, state.open ? POLL_OPEN_MS : POLL_CLOSED_MS);
  }
  function updateBadge() {
    ui.badge.textContent = String(state.unread);
    ui.badge.style.display = state.unread && !state.open ? 'block' : 'none';
  }

  function sendText() {
    var text = ui.text.value.trim();
    if (!text || state.busy) return;
    ui.text.value = '';
    send(text, null);
  }
  function send(text, interactiveId) {
    state.pending.push({ text: text });
    render();
    showError('');
    var ready = state.me.visitorId ? Promise.resolve() : session();
    ready.then(function () {
      return api('POST', '/messages', {
        text: text, interactiveId: interactiveId || undefined,
        name: state.me.name, phone: state.me.phone,
        pageUrl: location.href, pageTitle: document.title
      });
    }).then(function () {
      state.me.started = true;
      save();
      poll();
    }).catch(function (err) {
      state.pending = state.pending.filter(function (p) { return p.text !== text; });
      render();
      if (err.code === 'PHONE_REQUIRED' || err.code === 'BAD_PHONE') { state.me.started = false; save(); showFormIfNeeded(); return showError(t.needPhone); }
      showError(err.status === 429 ? err.message : t.error);
      ui.text.value = ui.text.value || text;
    });
  }

  function openWhatsApp() {
    var win = window.open('', '_blank');
    var ready = state.me.visitorId ? Promise.resolve() : session();
    ready.then(function () { return api('GET', '/whatsapp'); })
      .then(function (data) { if (win) win.location.href = data.url; else location.href = data.url; })
      .catch(function () { if (win) win.close(); showError(t.error); });
  }

  function toggle() {
    state.open = !state.open;
    ui.panel.classList.toggle('open', state.open);
    ui.launcher.setAttribute('aria-expanded', String(state.open));
    if (state.open) {
      state.unread = 0;
      updateBadge();
      render();
      showFormIfNeeded();
      (needsForm() ? (ui.name || ui.phone) : ui.text).focus();
      if (state.me.visitorId) poll(); else schedule();
    } else {
      schedule();
    }
  }

  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') poll(); });

  function start() {
    api('GET', '/config').then(function (config) {
      state.config = config;
      build(config);
      if (state.me.visitorId) poll();
    }).catch(function () { /* widget off, or not allowed on this site: show nothing */ });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
