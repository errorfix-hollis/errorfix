/* errorfix developer tools. Everything runs locally in your browser; nothing is sent to a server. */
(function () {
'use strict';
var T = {};

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function two(n) { return (n < 10 ? '0' : '') + n; }
function listJoin(a) { return a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
T.esc = esc;

/* ---------------- JSON ---------------- */
function lineCol(text, pos) {
  var line = 1, col = 1;
  for (var i = 0; i < pos && i < text.length; i++) { if (text[i] === '\n') { line++; col = 1; } else col++; }
  return { line: line, col: col };
}
T.lineCol = lineCol;

// Strict JSON scanner that reports a precise position and a human-readable message.
function jsonLocate(s) {
  var i = 0, n = s.length;
  function fail(msg, at) { var e = new Error(msg); e.pos = at === undefined ? i : at; throw e; }
  function ws() { while (i < n) { var c = s[i]; if (c === ' ' || c === '\t' || c === '\n' || c === '\r') i++; else break; } }
  function word(w) { if (s.substr(i, w.length) === w) { i += w.length; return true; } return false; }
  function value() {
    ws();
    if (i >= n) fail('Unexpected end of input: expected a value');
    var c = s[i];
    if (c === '{') return obj();
    if (c === '[') return arr();
    if (c === '"') return str();
    if (c === '-' || (c >= '0' && c <= '9')) return num();
    if (word('true') || word('false') || word('null')) return;
    if (c === "'") fail('Strings must use double quotes ("), not single quotes');
    if (c === '/') fail('Comments are not allowed in JSON');
    if (c === '\uFEFF') fail('Byte order mark (BOM) found: remove the invisible U+FEFF character');
    var w = s.slice(i).match(/^[A-Za-z_$][\w$]*/);
    if (w) {
      if (/^(undefined|NaN|Infinity)$/.test(w[0])) fail('"' + w[0] + '" is not a valid JSON value');
      if (/^(True|False|None)$/.test(w[0])) fail('"' + w[0] + '" is Python, not JSON: use true, false or null');
      fail('Unexpected word "' + w[0] + '": strings must be in double quotes');
    }
    fail('Unexpected character "' + c + '": expected a value');
  }
  function obj() {
    i++; ws();
    if (s[i] === '}') { i++; return; }
    for (;;) {
      ws();
      if (i >= n) fail('Unexpected end of input: expected a property name');
      if (s[i] === '}') fail('Trailing comma before "}" is not allowed in JSON');
      if (s[i] === "'") fail('Property names must use double quotes ("), not single quotes');
      if (s[i] !== '"') fail('Expected a double-quoted property name');
      str(); ws();
      if (i >= n) fail('Unexpected end of input: expected ":"');
      if (s[i] !== ':') fail('Expected ":" after property name');
      i++; value(); ws();
      if (s[i] === ',') { i++; continue; }
      if (s[i] === '}') { i++; return; }
      if (i >= n) fail('Unexpected end of input: expected "," or "}" (unclosed object)');
      fail('Expected "," or "}" after property value (missing comma?)');
    }
  }
  function arr() {
    i++; ws();
    if (s[i] === ']') { i++; return; }
    for (;;) {
      ws();
      if (s[i] === ']') fail('Trailing comma before "]" is not allowed in JSON');
      value(); ws();
      if (s[i] === ',') { i++; continue; }
      if (s[i] === ']') { i++; return; }
      if (i >= n) fail('Unexpected end of input: expected "," or "]" (unclosed array)');
      fail('Expected "," or "]" after array element (missing comma?)');
    }
  }
  function str() {
    var start = i; i++;
    while (i < n) {
      var c = s[i];
      if (c === '"') { i++; return; }
      if (c === '\\') {
        var e = s[i + 1];
        if (e !== undefined && '"\\/bfnrt'.indexOf(e) >= 0) { i += 2; continue; }
        if (e === 'u') { if (/^[0-9a-fA-F]{4}$/.test(s.substr(i + 2, 4))) { i += 6; continue; } fail('Invalid \\u escape: expected 4 hex digits'); }
        fail('Invalid escape sequence "\\' + (e || '') + '"');
      }
      if (c < ' ') fail(c === '\n' ? 'Unescaped line break inside a string (missing closing quote?)' : 'Unescaped control character inside a string (use \\t, \\n, ...)');
      i++;
    }
    fail('Unterminated string: missing closing double quote', start);
  }
  function num() {
    var re = /-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/y;
    re.lastIndex = i;
    var r = re.exec(s);
    if (!r || r[0] === '' || r[0] === '-') fail('Invalid number');
    var nx = s[i + r[0].length];
    if (nx !== undefined && /[0-9.eExX]/.test(nx)) fail('Invalid number (no leading zeros, hex or trailing dots in JSON)');
    i += r[0].length;
  }
  try {
    value(); ws();
    if (i < n) fail('Unexpected data after the end of the JSON value (missing comma or extra bracket?)');
    return null;
  } catch (e) { return { message: e.message, pos: e.pos }; }
}
T.jsonLocate = jsonLocate;

T.jsonCheck = function (text) {
  try { return { ok: true, value: JSON.parse(text) }; } catch (err) {
    var loc = jsonLocate(text);
    if (!loc) { var m = /position (\d+)/.exec(err.message); loc = { message: err.message, pos: m ? +m[1] : 0 }; }
    var lc = lineCol(text, loc.pos);
    return { ok: false, message: loc.message, native: err.message, pos: loc.pos, line: lc.line, col: lc.col };
  }
};
function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') { var o = {}; Object.keys(v).sort().forEach(function (k) { o[k] = sortKeys(v[k]); }); return o; }
  return v;
}
T.jsonFormat = function (value, indent, sort) { return JSON.stringify(sort ? sortKeys(value) : value, null, indent); };

/* ---------------- Cron ---------------- */
var DOW_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
var MON_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
var DOW_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
var MON_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
var CF = [
  { name: 'minute', min: 0, max: 59 },
  { name: 'hour', min: 0, max: 23 },
  { name: 'day-of-month', min: 1, max: 31 },
  { name: 'month', min: 1, max: 12, names: MON_NAMES },
  { name: 'day-of-week', min: 0, max: 7, names: DOW_NAMES, dow: true }
];
var MACROS = { '@yearly': '0 0 1 1 *', '@annually': '0 0 1 1 *', '@monthly': '0 0 1 * *', '@weekly': '0 0 * * 0', '@daily': '0 0 * * *', '@midnight': '0 0 * * *', '@hourly': '0 * * * *' };
T.CRON_MACROS = MACROS;

function cronNum(tok, f) {
  var t = tok.toUpperCase();
  if (f.names && t.length === 3) { var k = f.names.indexOf(t); if (k >= 0) return f.dow ? k : k + 1; }
  if (!/^\d+$/.test(t)) throw new Error('Invalid value "' + tok + '" in the ' + f.name + ' field');
  var v = +t;
  if (v < f.min || v > f.max) throw new Error(cap(f.name) + ' value ' + v + ' is out of range (' + f.min + '-' + f.max + ')');
  return v;
}
function parseCronPart(p, f) {
  var m = p.match(/^([^\/]+)(?:\/(\d+))?$/);
  if (!m) throw new Error('Invalid ' + f.name + ' field part "' + p + '"');
  var r = { step: m[2] !== undefined ? +m[2] : 0 };
  if (m[2] !== undefined && r.step < 1) throw new Error('Step must be at least 1 in "' + p + '"');
  var hiAll = f.dow ? 6 : f.max;
  if (m[1] === '*' || m[1] === '?') { r.kind = 'all'; r.lo = f.min; r.hi = hiAll; }
  else if (m[1].indexOf('-') > 0) {
    var ab = m[1].split('-');
    if (ab.length !== 2) throw new Error('Invalid range "' + m[1] + '"');
    r.kind = 'range'; r.lo = cronNum(ab[0], f); r.hi = cronNum(ab[1], f);
    if (r.lo > r.hi) throw new Error('Range "' + m[1] + '" goes backwards in the ' + f.name + ' field');
  } else {
    r.lo = cronNum(m[1], f);
    if (r.step) { r.kind = 'start'; r.hi = hiAll; } else { r.kind = 'one'; r.hi = r.lo; }
  }
  return r;
}
function parseCronField(str, f) {
  if (str === '') throw new Error('Empty ' + f.name + ' field');
  var parts = str.split(',').map(function (p) { if (p === '') throw new Error('Empty list item in the ' + f.name + ' field'); return parseCronPart(p, f); });
  var set = [];
  parts.forEach(function (r) { for (var v = r.lo; v <= r.hi; v += (r.step || 1)) set[(f.dow && v === 7) ? 0 : v] = true; });
  return { raw: str, parts: parts, star: str[0] === '*' || str[0] === '?', any: str === '*' || str === '?', set: set };
}
T.parseCron = function (expr) {
  var e = String(expr).trim().replace(/\s+/g, ' ');
  if (!e) throw new Error('Enter a cron expression, e.g. */15 * * * *');
  var low = e.toLowerCase();
  if (low === '@reboot') return { reboot: true, expr: e };
  if (low[0] === '@') { if (!MACROS[low]) throw new Error('Unknown macro "' + e + '". Known: @reboot, ' + Object.keys(MACROS).join(', ')); e = MACROS[low]; }
  var f = e.split(' ');
  if (f.length === 6) throw new Error('6 fields found. Standard (Vixie/Linux) cron has 5 fields: minute hour day-of-month month day-of-week. A leading seconds field is Quartz/Spring syntax; a trailing year is not supported by cron.');
  if (f.length !== 5) throw new Error('Expected 5 fields (minute hour day-of-month month day-of-week), found ' + f.length);
  return { expr: e, fields: f.map(function (s, k) { return parseCronField(s, CF[k]); }) };
};

function partDesc(r, f, fmt, unit, units) {
  if (r.kind === 'one') return fmt(r.lo);
  var every = r.step === 1 ? 'every ' + unit : 'every ' + r.step + ' ' + units;
  if (r.kind === 'all') return every;
  if (r.kind === 'range') return (r.step ? every + ' from ' : '') + fmt(r.lo) + ' through ' + fmt(r.hi);
  return every + ' starting at ' + fmt(r.lo);
}
function hhmm(h, m) { return two(h) + ':' + two(m); }
T.describeCron = function (expr) {
  var c = T.parseCron(expr);
  if (c.reboot) return 'Once, when the cron daemon starts (at boot)';
  var F = c.fields, mi = F[0], ho = F[1], dom = F[2], mon = F[3], dow = F[4];
  var allOne = function (fl) { return fl.parts.every(function (p) { return p.kind === 'one'; }); };
  var vals = function (fl) { return fl.parts.map(function (p) { return p.lo; }); };
  var time;
  if (allOne(mi) && allOne(ho) && mi.parts.length * ho.parts.length <= 8) {
    var t = [];
    vals(ho).sort(function (a, b) { return a - b; }).forEach(function (h) { vals(mi).sort(function (a, b) { return a - b; }).forEach(function (m) { t.push(hhmm(h, m)); }); });
    time = 'At ' + listJoin(t);
  } else {
    var mp;
    if (mi.any) mp = 'Every minute';
    else if (allOne(mi)) mp = 'At minute' + (mi.parts.length > 1 ? 's ' : ' ') + listJoin(vals(mi).map(String));
    else if (mi.parts.length === 1 && mi.parts[0].kind === 'range' && !mi.parts[0].step) mp = 'Every minute from ' + mi.parts[0].lo + ' through ' + mi.parts[0].hi;
    else if (mi.parts.length === 1 && mi.parts[0].kind !== 'one') mp = cap(partDesc(mi.parts[0], CF[0], String, 'minute', 'minutes'));
    else mp = 'At minutes ' + listJoin(mi.parts.map(function (p) { return partDesc(p, CF[0], String, 'minute', 'minutes'); }));
    var pastHour = allOne(mi);
    var hp = '';
    var hfmt = function (h) { return hhmm(h, 0); };
    if (ho.any) hp = pastHour ? ' past every hour' : '';
    else if (ho.parts.length === 1) {
      var p = ho.parts[0];
      if (p.kind === 'one') hp = pastHour ? ' past hour ' + two(p.lo) + ' (' + hhmm(p.lo, 0) + '-' + hhmm(p.lo, 59) + ')' : ', between ' + hhmm(p.lo, 0) + ' and ' + hhmm(p.lo, 59);
      else if (p.kind === 'range' && !p.step) hp = pastHour ? ' past every hour from ' + hfmt(p.lo) + ' through ' + hfmt(p.hi) : ', between ' + hhmm(p.lo, 0) + ' and ' + hhmm(p.hi, 59);
      else hp = (pastHour ? ' past ' : ', ') + partDesc(p, CF[1], hfmt, 'hour', 'hours');
    } else hp = (pastHour ? ' past hours ' : ', during hours ') + listJoin(ho.parts.map(function (p) { return partDesc(p, CF[1], String, 'hour', 'hours'); }));
    time = mp + hp;
  }
  var out = [time];
  var dname = function (v) { return DOW_FULL[v % 7]; };
  var domTxt = function () {
    if (dom.parts.length === 1 && dom.parts[0].kind === 'all') return 'every ' + (dom.parts[0].step === 1 ? 'day' : dom.parts[0].step + ' days') + ' of the month (starting on the 1st)';
    var ones = dom.parts.every(function (p) { return p.kind === 'one'; });
    return 'on ' + (ones ? 'day' + (dom.parts.length > 1 ? 's ' : ' ') : '') + listJoin(dom.parts.map(function (p) { return partDesc(p, CF[2], function (v) { return (p.kind === 'one' ? '' : 'day ') + v; }, 'day', 'days'); })) + ' of the month';
  };
  var dowTxt = function () { return 'on ' + listJoin(dow.parts.map(function (p) { return partDesc(p, CF[4], dname, 'day of the week', 'days of the week'); })); };
  if (!dom.any && !dow.any) {
    if (dom.star || dow.star) out.push(domTxt(), dowTxt());
    else out.push(domTxt() + ' and ' + dowTxt() + ' (either one matching is enough)');
  } else if (!dom.any) out.push(domTxt());
  else if (!dow.any) out.push(dowTxt());
  if (!mon.any) out.push((mon.parts[0].kind === 'all' ? '' : 'in ') + listJoin(mon.parts.map(function (p) { return partDesc(p, CF[3], function (v) { return MON_FULL[v - 1]; }, 'month', 'months'); })));
  return out.join(', ');
};

T.cronNext = function (expr, from, count) {
  var c = T.parseCron(expr);
  if (c.reboot) return [];
  var F = c.fields, res = [];
  var d = new Date(from.getTime());
  d.setSeconds(0, 0); d.setMinutes(d.getMinutes() + 1);
  var limit = from.getTime() + 6 * 366 * 864e5, guard = 0;
  var dayOk = function (x) {
    var a = !!F[2].set[x.getDate()], b = !!F[4].set[x.getDay()];
    if (F[2].star || F[4].star) return a && b;
    return a || b;
  };
  while (res.length < count && d.getTime() <= limit && guard++ < 500000) {
    if (!F[3].set[d.getMonth() + 1]) { d.setMonth(d.getMonth() + 1, 1); d.setHours(0, 0, 0, 0); continue; }
    if (!dayOk(d)) { d.setDate(d.getDate() + 1); d.setHours(0, 0, 0, 0); continue; }
    if (!F[1].set[d.getHours()]) { d.setHours(d.getHours() + 1, 0, 0, 0); continue; }
    if (!F[0].set[d.getMinutes()]) { d.setMinutes(d.getMinutes() + 1, 0, 0); continue; }
    res.push(new Date(d.getTime()));
    d.setMinutes(d.getMinutes() + 1, 0, 0);
  }
  return res;
};

/* ---------------- chmod ---------------- */
T.octalToSymbolic = function (oct) {
  oct = String(oct).trim();
  if (!/^[0-7]{3,4}$/.test(oct)) throw new Error('Octal mode must be 3 or 4 digits from 0 to 7, e.g. 755 or 4755');
  if (oct.length === 3) oct = '0' + oct;
  var sp = +oct[0], out = '';
  for (var k = 0; k < 3; k++) {
    var d = +oct[k + 1];
    out += (d & 4 ? 'r' : '-') + (d & 2 ? 'w' : '-');
    var x = d & 1, special = k === 0 ? sp & 4 : k === 1 ? sp & 2 : sp & 1;
    out += special ? (k === 2 ? (x ? 't' : 'T') : (x ? 's' : 'S')) : (x ? 'x' : '-');
  }
  return out;
};
T.symbolicToOctal = function (sym) {
  sym = String(sym).trim();
  if (sym.length === 10) sym = sym.slice(1); // drop file type from ls -l output
  if (!/^[r-][w-][xsS-][r-][w-][xsS-][r-][w-][xtT-]$/.test(sym)) throw new Error('Symbolic mode must look like rwxr-xr-x (9 characters, optionally with s/S/t/T)');
  var sp = 0, digits = '';
  for (var k = 0; k < 3; k++) {
    var t = sym.substr(k * 3, 3), d = 0;
    if (t[0] === 'r') d += 4;
    if (t[1] === 'w') d += 2;
    if (/[xst]/.test(t[2])) d += 1;
    if (/[sStT]/.test(t[2])) sp += [4, 2, 1][k];
    digits += d;
  }
  return sp ? sp + digits : digits;
};
T.chmodSymbolicArg = function (oct) {
  var s = T.octalToSymbolic(oct), parts = [];
  ['u', 'g', 'o'].forEach(function (who, k) {
    var t = s.substr(k * 3, 3), p = '';
    if (t[0] === 'r') p += 'r';
    if (t[1] === 'w') p += 'w';
    if (/[xst]/.test(t[2])) p += 'x';
    if (/[sS]/.test(t[2])) p += 's';
    if (/[tT]/.test(t[2])) p += 't';
    parts.push(who + '=' + p);
  });
  return parts.join(',');
};

/* ---------------- Unix time ---------------- */
T.tsToMs = function (n) {
  var a = Math.abs(n);
  if (a < 1e11) return { ms: n * 1000, unit: 'seconds' };
  if (a < 1e14) return { ms: n, unit: 'milliseconds' };
  if (a < 1e17) return { ms: n / 1000, unit: 'microseconds' };
  return { ms: n / 1e6, unit: 'nanoseconds' };
};
T.relTime = function (ms, now) {
  var diff = (ms - now) / 1000, a = Math.abs(diff);
  if (a < 1) return 'now';
  var units = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60], ['second', 1]];
  for (var k = 0; k < units.length; k++) {
    if (a >= units[k][1]) { var v = Math.floor(a / units[k][1]); var s = v + ' ' + units[k][0] + (v > 1 ? 's' : ''); return diff < 0 ? s + ' ago' : 'in ' + s; }
  }
};
T.parseDateInput = function (str, utc) {
  str = String(str).trim();
  var m = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3})\d*)?)?)?$/);
  if (m) {
    var a = [+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0), +((m[7] || '0') + '00').slice(0, 3)];
    if (utc) return Date.UTC(a[0], a[1], a[2], a[3], a[4], a[5], a[6]);
    return new Date(a[0], a[1], a[2], a[3], a[4], a[5], a[6]).getTime();
  }
  return Date.parse(str);
};

/* ---------------- Base64 ---------------- */
function bytesToBin(bytes) { var s = ''; for (var i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return s; }
T.b64encodeBytes = function (bytes, urlsafe) {
  var b = btoa(bytesToBin(bytes));
  return urlsafe ? b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : b;
};
T.b64encode = function (str, urlsafe) { return T.b64encodeBytes(new TextEncoder().encode(str), urlsafe); };
T.b64decodeBytes = function (str) {
  var s = String(str).replace(/^data:[^,]*;base64,/, '').replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  var bad = s.search(/[^A-Za-z0-9+\/=]/);
  if (bad >= 0) throw new Error('Invalid Base64 character "' + s[bad] + '" at position ' + bad);
  if (/=[^=]/.test(s) || /={3,}$/.test(s)) throw new Error('Padding "=" can only appear at the end (at most two)');
  s = s.replace(/=+$/, '');
  if (s.length % 4 === 1) throw new Error('Invalid Base64 length: input looks truncated');
  while (s.length % 4) s += '=';
  var bin = atob(s), out = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};
T.utf8Decode = function (bytes) {
  try { return { ok: true, text: new TextDecoder('utf-8', { fatal: true }).decode(bytes) }; }
  catch (e) { return { ok: false, text: new TextDecoder('utf-8').decode(bytes) }; }
};
T.b64decode = function (str) { return T.utf8Decode(T.b64decodeBytes(str)); };
T.hex = function (bytes, max) { var a = []; for (var i = 0; i < Math.min(bytes.length, max || 1e9); i++) a.push((bytes[i] < 16 ? '0' : '') + bytes[i].toString(16)); return a.join(' '); };

/* ---------------- URL ---------------- */
T.urlDecode = function (s, plus) {
  if (plus) s = s.replace(/\+/g, ' ');
  try { return decodeURIComponent(s); } catch (e) {
    var m = /%(?![0-9a-fA-F]{2})/.exec(s);
    throw new Error(m ? 'Malformed escape: "%" at position ' + m.index + ' is not followed by two hex digits (encode a literal % as %25)' : 'Malformed percent-encoding: the bytes are not valid UTF-8');
  }
};
T.parseQuery = function (s) {
  s = String(s).trim();
  var q = s, h = s.indexOf('#'); if (h >= 0) q = q.slice(0, h);
  var i = q.indexOf('?'); if (i >= 0) q = q.slice(i + 1);
  else if (/^[a-z][a-z0-9+.-]*:\/\//i.test(q)) q = '';
  var out = [];
  new URLSearchParams(q).forEach(function (v, k) { out.push([k, v]); });
  return out;
};

/* ---------------- JWT ---------------- */
function b64urlJson(part, what) {
  var bytes;
  try { bytes = T.b64decodeBytes(part); } catch (e) { throw new Error(what + ' is not valid Base64URL: ' + e.message); }
  var t = T.utf8Decode(bytes).text;
  try { return JSON.parse(t); } catch (e) { throw new Error(what + ' decoded, but it is not valid JSON'); }
}
T.jwtDecode = function (token) {
  var t = String(token).trim().replace(/^Bearer\s+/i, '').replace(/^["']|["']$/g, '');
  if (!t) throw new Error('Paste a JWT (three Base64URL parts separated by dots)');
  var p = t.split('.');
  if (p.length === 5) throw new Error('This has 5 parts, so it is an encrypted JWE token; its payload cannot be read without the decryption key');
  if (p.length !== 3) throw new Error('A JWT has 3 parts separated by dots (header.payload.signature); this has ' + p.length);
  return { header: b64urlJson(p[0], 'Header'), payload: b64urlJson(p[1], 'Payload'), signature: p[2] };
};
T.jwtStatus = function (payload, nowSec) {
  if (typeof payload.exp === 'number' && payload.exp <= nowSec) return { state: 'expired', text: 'Expired ' + T.relTime(payload.exp * 1000, nowSec * 1000) };
  if (typeof payload.nbf === 'number' && payload.nbf > nowSec) return { state: 'notyet', text: 'Not valid yet (nbf is ' + T.relTime(payload.nbf * 1000, nowSec * 1000) + ')' };
  if (typeof payload.exp === 'number') return { state: 'valid', text: 'Not expired: expires ' + T.relTime(payload.exp * 1000, nowSec * 1000) };
  return { state: 'noexp', text: 'No exp claim: this token never expires by time' };
};

/* ---------------- Regex ---------------- */
T.regexMatches = function (pattern, flags, text, limit) {
  var re = new RegExp(pattern, flags), out = [];
  limit = limit || 1000;
  var global = re.global || re.sticky;
  for (;;) {
    var m = re.exec(text);
    if (!m) break;
    out.push({ index: m.index, end: m.index + m[0].length, text: m[0], groups: m.slice(1), named: m.groups || null });
    if (!global || out.length >= limit) break;
    if (m[0] === '') re.lastIndex = m.index + ((re.unicode || re.unicodeSets) && text.codePointAt(m.index) > 0xffff ? 2 : 1);
  }
  return out;
};

if (typeof module !== 'undefined' && module.exports) module.exports = T;
if (typeof document === 'undefined') return;

/* ======================= UI ======================= */
function $(root, sel) { return root.querySelector(sel); }
function on(el, ev, fn) { el.addEventListener(ev, fn); }
function debounce(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }
function msg(el, cls, html) { el.className = 'msg ' + cls; el.innerHTML = html; el.hidden = !html; }
function copyBtn(btn, getText) {
  on(btn, 'click', function () { navigator.clipboard.writeText(getText()).then(function () { var o = btn.textContent; btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = o; }, 1200); }); });
}
function fmtLocal(d) { return d.toLocaleString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' }); }
function tz() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'local time'; } catch (e) { return 'local time'; } }

var UI = {};

UI.json = function (r) {
  var inp = $(r, '#json-in'), out = $(r, '#json-out'), m = $(r, '#json-msg'), ctx = $(r, '#json-ctx');
  function check(action) {
    var text = inp.value;
    ctx.hidden = true;
    if (!text.trim()) { msg(m, '', ''); if (action) out.value = ''; return; }
    var res = T.jsonCheck(text);
    if (res.ok) {
      msg(m, 'ok', '✓ Valid JSON');
      if (action) {
        var ind = $(r, '#json-indent').value;
        out.value = T.jsonFormat(res.value, action === 'min' ? 0 : (ind === 'tab' ? '\t' : +ind), $(r, '#json-sort').checked);
      }
      return;
    }
    msg(m, 'bad', '✗ Invalid JSON at <b>line ' + res.line + ', column ' + res.col + '</b>: ' + esc(res.message) +
      (res.native && res.native !== res.message ? '<br><small>Browser says: ' + esc(res.native) + '</small>' : ''));
    var lines = text.split('\n'), L = res.line - 1, html = '';
    for (var k = Math.max(0, L - 2); k <= Math.min(lines.length - 1, L + 1); k++) {
      var num = String(k + 1).padStart(4, ' ') + ' | ';
      if (k === L) {
        var ln = lines[k], c = res.col - 1;
        html += '<span class="eline">' + esc(num) + esc(ln.slice(0, c)) + '<mark class="e">' + (esc(ln.charAt(c)) || '&nbsp;') + '</mark>' + esc(ln.slice(c + 1)) + '</span>\n';
        html += esc(' '.repeat(num.length + c)) + '^\n';
      } else html += esc(num + lines[k]) + '\n';
    }
    ctx.innerHTML = html; ctx.hidden = false;
    if (action) { out.value = ''; inp.focus(); inp.setSelectionRange(res.pos, Math.min(res.pos + 1, text.length)); }
  }
  on($(r, '#json-fmt'), 'click', function () { check('fmt'); });
  on($(r, '#json-min'), 'click', function () { check('min'); });
  on($(r, '#json-clear'), 'click', function () { inp.value = ''; out.value = ''; check(); });
  on($(r, '#json-sample'), 'click', function () { inp.value = '{\n  "name": "errorfix",\n  "tags": ["json", "tools"],\n  "nested": {"ok": true, "count": 3,}\n}'; check(); });
  copyBtn($(r, '#json-copy'), function () { return out.value; });
  on(inp, 'input', debounce(function () { check(); }, 250));
};

UI.cron = function (r) {
  var inp = $(r, '#cron-in'), d = $(r, '#cron-desc'), m = $(r, '#cron-msg'), nx = $(r, '#cron-next');
  function run() {
    var e = inp.value;
    try {
      d.textContent = T.describeCron(e) + '.';
      msg(m, '', '');
      var c = T.parseCron(e);
      if (c.reboot) { nx.innerHTML = '<li>Runs once at system startup, not on a schedule.</li>'; return; }
      var runs = T.cronNext(e, new Date(), 5);
      nx.innerHTML = runs.length ? runs.map(function (x) { return '<li>' + esc(fmtLocal(x)) + ' <small>(' + esc(T.relTime(x.getTime(), Date.now())) + ')</small></li>'; }).join('')
        : '<li>Never: no date in the next few years matches (e.g. 30 February).</li>';
      if (history.replaceState) history.replaceState(null, '', '#' + encodeURIComponent(e.trim()));
    } catch (err) { d.textContent = '—'; nx.innerHTML = ''; msg(m, 'bad', esc(err.message)); }
  }
  $(r, '#cron-tz').textContent = tz();
  r.querySelectorAll('[data-cron]').forEach(function (b) { on(b, 'click', function () { inp.value = b.getAttribute('data-cron'); run(); }); });
  if (location.hash.length > 1) { try { inp.value = decodeURIComponent(location.hash.slice(1)); } catch (e) {} }
  on(inp, 'input', run); run();
};

UI.chmod = function (r) {
  var oct = $(r, '#chmod-oct'), sym = $(r, '#chmod-sym'), m = $(r, '#chmod-msg'), boxes = r.querySelectorAll('input[type=checkbox]');
  function fromBoxes() {
    var v = [0, 0, 0, 0];
    boxes.forEach(function (b) { if (b.checked) v[+b.getAttribute('data-i')] += +b.getAttribute('data-v'); });
    return (v[0] ? String(v[0]) : '') + v[1] + v[2] + v[3];
  }
  function setAll(o, skip) {
    var s = T.octalToSymbolic(o), o4 = o.length === 3 ? '0' + o : o;
    boxes.forEach(function (b) { b.checked = !!(+o4[+b.getAttribute('data-i')] & +b.getAttribute('data-v')); });
    if (skip !== 'oct') oct.value = o;
    if (skip !== 'sym') sym.value = s;
    $(r, '#chmod-cmd').textContent = 'chmod ' + o + ' file';
    $(r, '#chmod-cmd2').textContent = 'chmod ' + T.chmodSymbolicArg(o) + ' file';
    $(r, '#chmod-ls').textContent = '-' + s;
    msg(m, '', '');
  }
  boxes.forEach(function (b) { on(b, 'change', function () { setAll(fromBoxes()); }); });
  on(oct, 'input', function () { try { setAll(oct.value.trim(), 'oct'); } catch (e) { msg(m, 'bad', esc(e.message)); } });
  on(sym, 'input', function () { try { setAll(T.symbolicToOctal(sym.value), 'sym'); } catch (e) { msg(m, 'bad', esc(e.message)); } });
  r.querySelectorAll('[data-mode]').forEach(function (b) { on(b, 'click', function () { setAll(b.getAttribute('data-mode')); }); });
  copyBtn($(r, '#chmod-copy'), function () { return $(r, '#chmod-cmd').textContent; });
  setAll('755');
};

UI.timestamp = function (r) {
  var inp = $(r, '#ts-in'), out = $(r, '#ts-out'), m = $(r, '#ts-msg'), din = $(r, '#ts-date'), dout = $(r, '#ts-dout'), dm = $(r, '#ts-dmsg');
  function tick() { var n = Date.now(); $(r, '#ts-now-s').textContent = Math.floor(n / 1000); $(r, '#ts-now-ms').textContent = n; $(r, '#ts-now-iso').textContent = new Date(n).toISOString(); }
  function row(k, v) { return '<tr><th>' + k + '</th><td><code>' + esc(v) + '</code></td></tr>'; }
  function conv() {
    var v = inp.value.trim().replace(/[_,\s]/g, '');
    if (!v) { out.innerHTML = ''; msg(m, '', ''); return; }
    if (!/^-?\d+(\.\d+)?$/.test(v)) { out.innerHTML = ''; msg(m, 'bad', 'Enter a number such as 1700000000 (seconds) or 1700000000000 (milliseconds).'); return; }
    var t = T.tsToMs(+v), d = new Date(t.ms);
    if (isNaN(d.getTime())) { out.innerHTML = ''; msg(m, 'bad', 'Out of range for a JavaScript date.'); return; }
    msg(m, '', '');
    out.innerHTML = row('Detected unit', t.unit) + row('ISO 8601 (UTC)', d.toISOString()) + row('UTC', d.toUTCString()) + row('Local (' + tz() + ')', fmtLocal(d)) +
      row('Relative', T.relTime(t.ms, Date.now())) + row('Seconds', String(Math.floor(t.ms / 1000))) + row('Milliseconds', String(Math.round(t.ms)));
  }
  function dconv() {
    var ms = T.parseDateInput(din.value, $(r, '#ts-utc').checked);
    if (!din.value.trim()) { dout.innerHTML = ''; msg(dm, '', ''); return; }
    if (isNaN(ms)) { dout.innerHTML = ''; msg(dm, 'bad', 'Could not parse that date. Try 2026-01-31 14:30:00 or an ISO string like 2026-01-31T14:30:00Z.'); return; }
    msg(dm, '', '');
    dout.innerHTML = row('Seconds', String(Math.floor(ms / 1000))) + row('Milliseconds', String(ms)) + row('ISO 8601 (UTC)', new Date(ms).toISOString()) + row('Local', fmtLocal(new Date(ms)));
  }
  on($(r, '#ts-usenow'), 'click', function () { inp.value = Math.floor(Date.now() / 1000); conv(); });
  on(inp, 'input', conv); on(din, 'input', dconv); on($(r, '#ts-utc'), 'change', dconv);
  var n = new Date(); din.value = n.getFullYear() + '-' + two(n.getMonth() + 1) + '-' + two(n.getDate()) + ' ' + two(n.getHours()) + ':' + two(n.getMinutes()) + ':00';
  $(r, '#ts-tz').textContent = tz();
  tick(); setInterval(tick, 1000); inp.value = Math.floor(Date.now() / 1000); conv(); dconv();
};

UI.base64 = function (r) {
  var inp = $(r, '#b64-in'), out = $(r, '#b64-out'), m = $(r, '#b64-msg');
  function enc() { out.value = T.b64encode(inp.value, $(r, '#b64-url').checked); msg(m, 'ok', 'Encoded ' + new TextEncoder().encode(inp.value).length + ' bytes (UTF-8) → ' + out.value.length + ' characters.'); }
  function dec() {
    try {
      var bytes = T.b64decodeBytes(inp.value), t = T.utf8Decode(bytes);
      out.value = t.text;
      msg(m, t.ok ? 'ok' : 'bad', t.ok ? 'Decoded ' + bytes.length + ' bytes of UTF-8 text.' : 'Decoded ' + bytes.length + ' bytes, but they are not valid UTF-8 text (probably binary data). First bytes (hex): <code>' + T.hex(bytes, 48) + '</code>');
    } catch (e) { out.value = ''; msg(m, 'bad', esc(e.message)); }
  }
  on($(r, '#b64-enc'), 'click', enc); on($(r, '#b64-dec'), 'click', dec);
  on($(r, '#b64-swap'), 'click', function () { var t = inp.value; inp.value = out.value; out.value = t; });
  copyBtn($(r, '#b64-copy'), function () { return out.value; });
};

UI.url = function (r) {
  var inp = $(r, '#url-in'), out = $(r, '#url-out'), m = $(r, '#url-msg'), q = $(r, '#qs-in'), qt = $(r, '#qs-out');
  on($(r, '#url-encc'), 'click', function () { out.value = encodeURIComponent(inp.value); msg(m, '', ''); });
  on($(r, '#url-enc'), 'click', function () { try { out.value = encodeURI(inp.value); msg(m, '', ''); } catch (e) { msg(m, 'bad', 'Cannot encode: the text contains a lone surrogate character.'); } });
  on($(r, '#url-dec'), 'click', function () { try { out.value = T.urlDecode(inp.value, $(r, '#url-plus').checked); msg(m, '', ''); } catch (e) { out.value = ''; msg(m, 'bad', esc(e.message)); } });
  on($(r, '#url-swap'), 'click', function () { var t = inp.value; inp.value = out.value; out.value = t; });
  copyBtn($(r, '#url-copy'), function () { return out.value; });
  function parse() {
    var s = q.value.trim(), html = '';
    if (!s) { qt.innerHTML = ''; return; }
    try {
      var u = new URL(s);
      html += '<tr><th colspan="2">URL parts</th></tr>' + [['protocol', u.protocol], ['host', u.host], ['pathname', u.pathname], ['hash', u.hash]].filter(function (x) { return x[1]; })
        .map(function (x) { return '<tr><td>' + x[0] + '</td><td><code>' + esc(x[1]) + '</code></td></tr>'; }).join('');
    } catch (e) {}
    var p = T.parseQuery(s);
    html += '<tr><th>Parameter</th><th>Decoded value</th></tr>' + (p.length ? p.map(function (x) { return '<tr><td><code>' + esc(x[0]) + '</code></td><td><code>' + esc(x[1]) + '</code></td></tr>'; }).join('') : '<tr><td colspan="2">No query parameters found.</td></tr>');
    qt.innerHTML = html;
  }
  on(q, 'input', parse); parse();
};

UI.jwt = function (r) {
  var inp = $(r, '#jwt-in'), m = $(r, '#jwt-msg'), h = $(r, '#jwt-h'), p = $(r, '#jwt-p'), c = $(r, '#jwt-claims'), res = $(r, '#jwt-res');
  var NAMES = { iss: 'Issuer', sub: 'Subject', aud: 'Audience', exp: 'Expires', nbf: 'Not before', iat: 'Issued at', jti: 'JWT ID', auth_time: 'Authenticated at' };
  function run() {
    if (!inp.value.trim()) { res.hidden = true; msg(m, '', ''); return; }
    try {
      var j = T.jwtDecode(inp.value), now = Date.now() / 1000;
      h.textContent = JSON.stringify(j.header, null, 2); p.textContent = JSON.stringify(j.payload, null, 2);
      var st = T.jwtStatus(j.payload, now);
      msg(m, st.state === 'valid' ? 'ok' : st.state === 'noexp' ? '' : 'bad', esc(st.text) + (j.header.alg ? ' · algorithm <code>' + esc(j.header.alg) + '</code>' : '') + ' · signature <b>not verified</b>');
      var rows = '';
      Object.keys(NAMES).forEach(function (k) {
        if (!(k in j.payload)) return;
        var v = j.payload[k], extra = '';
        if (typeof v === 'number' && /^(exp|nbf|iat|auth_time)$/.test(k)) { var d = new Date(v * 1000); extra = '<br><small>' + esc(fmtLocal(d)) + ' · ' + esc(d.toISOString()) + ' · ' + esc(T.relTime(v * 1000, Date.now())) + '</small>'; }
        rows += '<tr><td><code>' + k + '</code> ' + NAMES[k] + '</td><td><code>' + esc(JSON.stringify(v)) + '</code>' + extra + '</td></tr>';
      });
      c.innerHTML = rows || '<tr><td>No registered claims (iss, sub, aud, exp, nbf, iat, jti).</td></tr>';
      res.hidden = false;
    } catch (e) { res.hidden = true; msg(m, 'bad', esc(e.message)); }
  }
  on($(r, '#jwt-sample'), 'click', function () {
    var n = Math.floor(Date.now() / 1000);
    inp.value = T.b64encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }), true) + '.' + T.b64encode(JSON.stringify({ sub: '1234567890', name: 'Jane Doe', role: 'admin', iat: n, exp: n + 3600 }), true) + '.' + 'c2lnbmF0dXJlLW5vdC1yZWFs';
    run();
  });
  on(inp, 'input', run);
};

UI.regex = function (r) {
  var pat = $(r, '#re-pat'), fl = $(r, '#re-flags'), txt = $(r, '#re-text'), m = $(r, '#re-msg'), hl = $(r, '#re-hl'), tb = $(r, '#re-table'), rep = $(r, '#re-rep'), ro = $(r, '#re-repout');
  function run() {
    var p = pat.value, f = fl.value.trim(), t = txt.value;
    if (!p) { hl.textContent = t; tb.innerHTML = ''; msg(m, '', ''); ro.textContent = ''; return; }
    var ms;
    try { ms = T.regexMatches(p, f, t, 1000); } catch (e) { msg(m, 'bad', esc(e.message)); hl.textContent = t; tb.innerHTML = ''; return; }
    msg(m, ms.length ? 'ok' : '', ms.length ? ms.length + (ms.length >= 1000 ? '+' : '') + ' match' + (ms.length > 1 ? 'es' : '') + (/[gy]/.test(f) ? '' : ' (add the g flag to find all matches)') : 'No matches');
    var html = '', last = 0;
    ms.forEach(function (x, k) { html += esc(t.slice(last, x.index)) + '<mark class="m' + (k % 2) + '">' + (x.text ? esc(x.text) : '<span class="zw"></span>') + '</mark>'; last = x.end; });
    hl.innerHTML = html + esc(t.slice(last)) + '\n';
    tb.innerHTML = ms.length ? '<tr><th>#</th><th>Index</th><th>Match</th><th>Groups</th></tr>' + ms.slice(0, 200).map(function (x, k) {
      var g = x.groups.map(function (v, i) { return '<code>$' + (i + 1) + '</code> ' + (v === undefined ? '<i>undefined</i>' : '<code>' + esc(v) + '</code>'); });
      if (x.named) Object.keys(x.named).forEach(function (n) { g.push('<code>' + esc(n) + '</code> ' + (x.named[n] === undefined ? '<i>undefined</i>' : '<code>' + esc(x.named[n]) + '</code>')); });
      return '<tr><td>' + (k + 1) + '</td><td>' + x.index + '</td><td><code>' + esc(x.text) + '</code></td><td>' + (g.join('<br>') || '—') + '</td></tr>';
    }).join('') : '';
    try { ro.textContent = rep.value ? t.replace(new RegExp(p, f), rep.value) : ''; } catch (e) { ro.textContent = ''; }
    $(r, '#re-repwrap').hidden = !rep.value;
  }
  var d = debounce(run, 150);
  [pat, fl, txt, rep].forEach(function (el) { on(el, 'input', d); });
  run();
};

document.querySelectorAll('[data-tool]').forEach(function (el) { var f = UI[el.getAttribute('data-tool')]; if (f) f(el); });
})();
