/* ===== PG core: RNG, từ vựng, bộ chọn câu hỏi, âm thanh, giao diện dùng chung ===== */
(function () {
'use strict';
const NS = (window.PG = window.PG || {});
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
NS.LS = LS;

/* ---------- RNG có seed ---------- */
NS.mulberry = function (seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0; let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
NS.rand = Math.random;
NS.setSeed = s => { NS.rand = s == null ? Math.random : NS.mulberry(s); };
NS.shuffle = (arr, r) => { r = r || NS.rand; const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
NS.pick = (a, r) => a[Math.floor((r || NS.rand)() * a.length)];
NS.randInt = (a, b, r) => a + Math.floor((r || NS.rand)() * (b - a + 1));
NS.slug = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
NS.lev = function (a, b) {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
};

/* ---------- Cấu hình chung ---------- */
const defTeams = () => {
  try { if (typeof S !== 'undefined' && S.students && S.students.length >= 2) return [S.students[0].name || 'Cam', S.students[1].name || 'Xanh']; } catch (e) {}
  return ['Cam', 'Xanh'];
};
NS.cfg = Object.assign({ topics: [], phrases: false, level: 2, dir: 'mix', source: 'auto', sound: true, vibrate: true, teams: null }, LS.get('pg-cfg', {}));
if (!NS.cfg.teams) NS.cfg.teams = defTeams();
NS.saveCfg = () => LS.set('pg-cfg', NS.cfg);
NS.TEAM_ICON = ['🟠', '🔵'];
NS.TEAM_TAG = ['CAM', 'XANH'];

/* ---------- Từ vựng ---------- */
const PLURAL_OK = new Set(['bus', 'gas', 'lens', 'always', 'sometimes', 'news', 'this', 'his', 'yes', 'physics', 'is', 'has', 'chess', 'canvas', 'christmas', 'perhaps', 'across', 'thus', 'plus', 'us', 'as', 'does', 'was']);
NS.parseVocab = function (text) {
  const topics = [], map = new Map(), warn = [];
  let cur = -1, inCode = false;
  String(text || '').replace(/^﻿/, '').split(/\r?\n/).forEach((raw, ln) => {
    const line = raw.trim();
    if (line.startsWith('```')) { inCode = !inCode; return; }
    const m = line.match(/^##\s*\d+\.\s*(.+)$/);
    if (m && !inCode) { topics.push(m[1].replace(/\s*\(\s*\d+\s*từ\s*\)\s*$/i, '').trim()); cur = topics.length - 1; return; }
    if (!inCode || cur < 0 || !line) return;
    const i = line.indexOf('::');
    if (i < 0) { warn.push('Dòng ' + (ln + 1) + ': thiếu "::"'); return; }
    let left = line.slice(0, i).trim(); const meaning = line.slice(i + 2).trim();
    if (!left || !meaning) { warn.push('Dòng ' + (ln + 1) + ': thiếu vế trái hoặc phải'); return; }
    let ipa; const mm = left.match(/^(.*?)\s*\/([^\/]+)\/\s*$/);
    if (mm) { left = mm[1].trim(); ipa = mm[2].trim(); }
    const key = left.toLowerCase();
    if (map.has(key)) { const w = map.get(key); if (!w.topics.includes(cur)) w.topics.push(cur); return; }
    const letters = left.replace(/[^A-Za-z]/g, '');
    map.set(key, {
      id: NS.slug(left), text: left, ipa, meaning, topics: [cur],
      isPhrase: /[\s-]/.test(left), length: letters.length,
      hasBannedSub: /in|on|at|the/i.test(letters),
      maybePlural: /[^s]s$/i.test(left) && !PLURAL_OK.has(key),
      isProper: /^[A-Z]/.test(left) && left !== 'I'
    });
  });
  return { topics, words: [...map.values()], warn };
};
NS.vocab = { topics: [], words: [], warn: [], source: '' };
NS.setVocab = function (text, src) {
  const r = NS.parseVocab(text); if (!r.words.length) return false;
  NS.vocab = Object.assign(r, { source: src }); return true;
};
NS.loadVocab = async function () {
  const custom = LS.get('pg-vocab-text', null);
  if (custom && NS.setVocab(custom, 'đã nhập tay')) return;
  try { const r = await fetch('data/vocab.txt', { cache: 'no-cache' }); if (r.ok && NS.setVocab(await r.text(), 'data/vocab.txt')) return; } catch (e) {}
  NS.setVocab(NS.SAMPLE_VOCAB, 'từ mẫu (chưa có data/vocab.txt)');
};
NS.pool = function (o) {
  o = o || {}; const c = NS.cfg;
  const ts = c.topics && c.topics.length ? c.topics : null;
  const phrases = o.phrases !== undefined ? o.phrases : c.phrases;
  return NS.vocab.words.filter(w => (phrases || !w.isPhrase) && (!ts || w.topics.some(t => ts.includes(t))));
};

/* ---------- Thống kê từ hay sai ---------- */
NS.wrongStats = LS.get('pg-wrong', {});
NS.markWrong = w => { if (!w) return; NS.wrongStats[w.id] = (NS.wrongStats[w.id] || 0) + 1; LS.set('pg-wrong', NS.wrongStats); };
NS.clearWrong = () => { NS.wrongStats = {}; LS.set('pg-wrong', {}); };

/* ---------- Túi trộn có trọng số ---------- */
NS.makeBag = function (pool) {
  let bag = [], last = null;
  return {
    next(filter) {
      for (let tries = 0; tries < 2; tries++) {
        if (!bag.length) bag = pool.slice();
        let cand = bag.filter(w => (!filter || filter(w)));
        if (cand.length > 1) cand = cand.filter(w => !last || w.id !== last.id);
        if (cand.length) {
          const wts = cand.map(w => 1 + (NS.wrongStats[w.id] || 0) * 1.5);
          let r = NS.rand() * wts.reduce((a, b) => a + b, 0), k = 0;
          while (k < cand.length - 1 && (r -= wts[k]) > 0) k++;
          const w = cand[k]; bag = bag.filter(x => x !== w); last = w; return w;
        }
        bag = pool.slice(); // hết từ thỏa điều kiện -> nạp lại 1 lần
      }
      const f = pool.filter(w => !filter || filter(w));
      return f.length ? NS.pick(f) : null;
    }
  };
};

/* ---------- Câu hỏi trắc nghiệm tự sinh ---------- */
NS.makeMC = function (word, dir, level, pool) {
  const sameMean = o => o.meaning.toLowerCase() === word.meaning.toLowerCase();
  let others = pool.filter(o => o.id !== word.id && !sameMean(o) && o.text.toLowerCase() !== word.text.toLowerCase());
  let cands;
  if (level === 1) cands = NS.shuffle(others);
  else if (level === 2) cands = NS.shuffle(others.filter(o => o.topics.some(t => word.topics.includes(t)))).concat(NS.shuffle(others));
  else {
    const a = word.text.toLowerCase();
    cands = others.map(o => { const b = o.text.toLowerCase(); return { o, d: NS.lev(a, b) + (a[0] === b[0] ? -2 : 0) + NS.rand() * 0.5 }; })
      .sort((x, y) => x.d - y.d).map(x => x.o);
  }
  const used = new Set([word.text.toLowerCase()]), usedM = new Set([word.meaning.toLowerCase()]), ds = [];
  for (const o of cands) {
    if (used.has(o.text.toLowerCase()) || usedM.has(o.meaning.toLowerCase())) continue;
    used.add(o.text.toLowerCase()); usedM.add(o.meaning.toLowerCase()); ds.push(o);
    if (ds.length === 3) break;
  }
  if (ds.length < 3) return null;
  const items = NS.shuffle([word, ...ds]);
  const vi2en = dir === 'vi2en' || dir === 'spell';
  return {
    kind: 'mc', dir, word, say: word.text,
    stem: dir === 'vi2en' ? 'Từ tiếng Anh nào có nghĩa là "' + word.meaning + '"?'
        : dir === 'en2vi' ? 'Nghĩa của "' + word.text + '" là gì?' : 'Bạn nghe thấy từ nào?',
    sub: dir === 'en2vi' && word.ipa ? '/' + word.ipa + '/' : '',
    options: items.map(o => vi2en ? o.text : o.meaning),
    answer: items.indexOf(word), explanation: word.text + (word.ipa ? ' /' + word.ipa + '/' : '') + ' = ' + word.meaning
  };
};

NS.handUsed = new Set();
NS.hand = { questions: [], cardSets: [], puzzles: [] };
let genBag = null, genKey = '';
NS.nextMC = function (o) {
  o = o || {}; const level = o.level || NS.cfg.level;
  const pool = NS.pool({ phrases: o.phrases });
  const key = pool.map(w => w.id).join(',');
  if (!genBag || genKey !== key) { genBag = NS.makeBag(pool); genKey = key; }
  const src = NS.cfg.source;
  const okType = q => ['trac-nghiem', 'dung-sai'].includes(q.type) || (q.type === 'nghe');
  let hand = NS.hand.questions.filter(q => okType(q) && !NS.handUsed.has(q.id));
  const lv = hand.filter(q => q.difficulty === level); if (lv.length) hand = lv;
  if (o.listen) { const l = hand.filter(q => q.type === 'nghe'); if (l.length) hand = l; else if (src === 'hand') hand = []; }
  const useHand = hand.length && (src === 'hand' || (src === 'mix' && NS.rand() < 0.5));
  if (useHand) {
    const q = NS.pick(hand); NS.handUsed.add(q.id);
    const w = q.wordId ? NS.vocab.words.find(x => x.id === q.wordId) : null;
    if (q.type === 'dung-sai') return { kind: 'mc', hand: true, id: q.id, word: w, stem: q.stem, options: ['Đúng', 'Sai'], answer: NS.checkAnswer(q, 'Đúng') ? 0 : 1, explanation: q.explanation, points: q.points, timeLimit: q.timeLimit };
    let options = (q.options || []).map(x => x.text), answer = (q.options || []).findIndex(x => q.answers.includes(x.key));
    if (options.length < 2 && w) { const g = NS.makeMC(w, o.listen ? 'en2vi' : 'vi2en', level, pool); if (g) { options = g.options; answer = g.answer; } }
    if (options.length >= 2 && answer >= 0) {
      if (options.length > 4 && !(q.extra && q.extra['Giữ hết lựa chọn'])) {
        const keep = NS.shuffle(options.map((_, i) => i).filter(i => i !== answer)).slice(0, 3).concat(answer);
        keep.sort((a, b) => a - b); options = keep.map(i => options[i]); answer = keep.indexOf(answer);
      }
      return { kind: 'mc', hand: true, id: q.id, word: w, stem: q.stem || '', say: q.say || (w && w.text) || '', audio: q.audio, options, answer, explanation: q.explanation, points: q.points, timeLimit: q.timeLimit };
    }
  }
  for (let i = 0; i < 20; i++) {
    const w = genBag.next(); if (!w) return null;
    let dir = o.dir || (NS.cfg.dir === 'mix' ? (NS.rand() < 0.5 ? 'vi2en' : 'en2vi') : NS.cfg.dir);
    const q = NS.makeMC(w, dir, level, pool); if (q) return q;
  }
  return null;
};

/* ---------- Chấm đáp án dùng chung ---------- */
NS.norm = s => String(s == null ? '' : s).toLowerCase().replace(/[’‘`]/g, "'").replace(/^[\s.,!?;:]+|[\s.,!?;:]+$/g, '').replace(/\s+/g, ' ').trim();
NS.checkAnswer = function (q, resp) {
  if (typeof q.answer === 'number') return resp === q.answer;
  const A = q.answers || [];
  switch (q.type) {
    case 'trac-nghiem': case 'nghe': {
      const idx = typeof resp === 'number' ? resp : 'ABCDEF'.indexOf(String(resp).toUpperCase());
      return idx >= 0 && q.options && q.options[idx] && A.includes(q.options[idx].key);
    }
    case 'dung-sai': {
      const v = NS.norm(resp), t = ['đúng', 'dung', 'true', 'đ', 'd', 't'].includes(v), f = ['sai', 'false', 's', 'f'].includes(v);
      const ans = NS.norm(A[0]); const at = ['đúng', 'dung', 'true'].includes(ans);
      return (t && at) || (f && !at);
    }
    default: return A.some(a => NS.norm(a) === NS.norm(resp));
  }
};

/* ---------- Âm thanh, rung, giọng đọc ---------- */
let actx = null;
NS.sfx = function (name) {
  if (!NS.cfg.sound) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const seqs = { ok: [[660, .08], [880, .12]], bad: [[220, .12], [160, .16]], tick: [[520, .04]], flip: [[400, .05]], win: [[523, .1], [659, .1], [784, .1], [1047, .25]], dice: [[300, .04], [380, .04], [460, .04]], pow: [[300, .08], [600, .08], [900, .12]] };
    let t = actx.currentTime;
    (seqs[name] || []).forEach(([f, d]) => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'square'; o.frequency.value = f; g.gain.setValueAtTime(.08, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
      o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + d); t += d;
    });
  } catch (e) {}
};
NS.vibe = ms => { try { if (NS.cfg.vibrate && navigator.vibrate) navigator.vibrate(ms); } catch (e) {} };
NS.hasTTS = () => typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined';
NS.enVoice = function () {
  if (!NS.hasTTS()) return null;
  const vs = speechSynthesis.getVoices();
  return vs.find(v => /^en[-_]US/i.test(v.lang)) || vs.find(v => /^en[-_]GB/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null;
};
NS.speak = function (text, o) {
  o = o || {};
  return new Promise(res => {
    if (!NS.hasTTS()) return res(false);
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = o.rate || .9;
      const v = NS.enVoice(); if (v) u.voice = v;
      let done = false; const fin = ok => { if (!done) { done = true; res(ok); } };
      u.onend = () => fin(true); u.onerror = () => fin(false);
      setTimeout(() => fin(true), 5000);
      speechSynthesis.speak(u);
    } catch (e) { res(false); }
  });
};
NS.sayWord = function (w, o) {
  o = o || {};
  if (NS.cfg.audioFiles && w && w.id) {
    return new Promise(res => {
      const a = new Audio('audio/' + w.id + '.mp3'); let fb = false;
      const fallback = () => { if (fb) return; fb = true; NS.speak(w.text, o).then(res); };
      a.onended = () => res(true); a.onerror = fallback; a.play().catch(fallback);
    });
  }
  return NS.speak(typeof w === 'string' ? w : w.text, o);
};

/* ---------- DOM helpers ---------- */
NS.h = function (tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const k in attrs || {}) {
    const v = attrs[k];
    if (k === 'class') e.className = v; else if (k === 'style') e.style.cssText = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  kids.flat(9).forEach(c => { if (c == null || c === false) return; e.append(c.nodeType ? c : document.createTextNode(String(c))); });
  return e;
};
NS.tap = function (el, fn) {
  el.addEventListener('pointerdown', e => { e.preventDefault(); if (el.disabled || el.classList.contains('locked')) return; el.classList.add('pressed'); fn(e); });
  const up = () => el.classList.remove('pressed');
  el.addEventListener('pointerup', up); el.addEventListener('pointerleave', up); el.addEventListener('pointercancel', up);
  el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!el.disabled && !el.classList.contains('locked')) fn(e); } });
  return el;
};
const h = NS.h;

/* ---------- Bàn phím chữ cái trong game ---------- */
NS.kbd = function (onChar, onBack, onEnter, opt) {
  opt = opt || {};
  const rows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
  const el = h('div', { class: 'kbd' });
  rows.forEach((r, ri) => {
    const row = h('div', { class: 'krow' });
    [...r].forEach(ch => row.append(NS.tap(h('button', { class: 'key', type: 'button' }, ch), () => { NS.sfx('tick'); onChar(ch); })));
    if (ri === 2) row.append(NS.tap(h('button', { class: 'key wide red', type: 'button' }, '⌫'), () => onBack()));
    el.append(row);
  });
  el.append(h('div', { class: 'krow' },
    NS.tap(h('button', { class: 'key wide', type: 'button' }, '␣'), () => onChar(' ')),
    NS.tap(h('button', { class: 'key xwide green', type: 'button' }, opt.enter || '✔ Xác nhận'), () => onEnter())));
  return el;
};

/* ---------- Khung chơi chung ---------- */
NS.curShell = null;
NS.timer = function (ms, onTick, onEnd) {
  let left = ms, stopped = false;
  const sh = NS.curShell;
  const iv = setInterval(() => {
    if (stopped) return; if (sh && (sh.paused)) return;
    left -= 100; if (onTick) onTick(left);
    if (left <= 0) { stop(); if (onEnd) onEnd(); }
  }, 100);
  function stop() { stopped = true; clearInterval(iv); if (sh) sh.timers.delete(stop); }
  if (sh) sh.timers.add(stop);
  return { stop, get left() { return left; }, add(x) { left += x; } };
};

NS.shell = function (root, o) {
  if (NS.curShell) NS.curShell.destroy();
  root.innerHTML = '';
  const names = NS.cfg.teams;
  const sh = { paused: false, dead: false, timers: new Set(), scores: [0, 0] };
  const tbox = i => {
    const pts = h('span', { class: 'tpts' }, '0');
    const el = h('div', { class: 'tbox t' + i },
      h('span', { class: 'ticon' }, NS.TEAM_ICON[i]),
      h('span', { class: 'tname' }, names[i] || NS.TEAM_TAG[i], h('small', {}, ' ' + NS.TEAM_TAG[i])), pts);
    return { el, pts };
  };
  const t0 = tbox(0), t1 = tbox(1), tb = [t0, t1];
  const info = h('div', { class: 'ginfo' }), title = h('div', { class: 'gtitle' }, o.title || '');
  const pauseBtn = h('button', { class: 'small', type: 'button' }, '⏸');
  const area = h('div', { class: 'garea' }), ov = h('div', { class: 'govl' });
  const el = h('div', { class: 'gshell' }, h('div', { class: 'gbar' }, t0.el, h('div', { class: 'gmid' }, title, info, pauseBtn), t1.el), area, ov);
  root.append(el);
  sh.el = el; sh.area = area;
  sh.setScore = (i, v) => { sh.scores[i] = v; tb[i].pts.textContent = v; tb[i].pts.classList.remove('bump'); void tb[i].pts.offsetWidth; tb[i].pts.classList.add('bump'); };
  sh.addScore = (i, d, floor) => { sh.setScore(i, Math.max(floor === undefined ? 0 : floor, sh.scores[i] + d)); };
  sh.setInfo = t => { info.textContent = t; };
  sh.setActive = i => { tb[0].el.classList.toggle('active', i === 0); tb[1].el.classList.toggle('active', i === 1); };
  sh.overlay = node => { ov.innerHTML = ''; ov.append(node); ov.classList.add('show'); };
  sh.closeOverlay = () => { ov.classList.remove('show'); ov.innerHTML = ''; };
  sh.sleep = ms => new Promise(res => { if (sh.dead) return res(false); NS.timer(ms, null, () => res(!sh.dead)); sh.sleepers = (sh.sleepers || []).concat(res); });
  sh.destroy = () => { sh.dead = true; sh.timers.forEach(s => s()); sh.timers.clear(); try { speechSynthesis.cancel(); } catch (e) {} (sh.sleepers || []).forEach(r => r(false)); document.body.classList.remove('playing'); if (NS.curShell === sh) NS.curShell = null; };
  sh.toast = (msg, ms) => { const t = h('div', { class: 'gtoast' }, msg); el.append(t); setTimeout(() => t.remove(), ms || 1500); };
  pauseBtn.addEventListener('click', () => {
    sh.paused = true;
    sh.overlay(h('div', { class: 'gdlg' }, h('h2', {}, '⏸ Tạm dừng'),
      h('button', { class: 'green', onclick: () => { sh.paused = false; sh.closeOverlay(); } }, '▶ Tiếp tục'), ' ',
      h('button', { onclick: () => { sh.destroy(); o.onRestart && o.onRestart(); } }, '↺ Chơi lại'), ' ',
      h('button', { class: 'red', onclick: () => { sh.destroy(); o.onExit && o.onExit(); } }, '⌂ Về menu')));
  });
  sh.result = function (r) {
    sh.setActive(-1);
    const sc = r.scores || sh.scores, st = r.stats || [{ right: 0, wrong: 0 }, { right: 0, wrong: 0 }];
    let head, cls = '';
    const tb = r.tie && sc[0] === sc[1] && r.tie[0] !== r.tie[1] ? (r.tie[0] > r.tie[1] ? 0 : 1) : -1;
    if (sc[0] === sc[1] && tb < 0) head = '🤝 HÒA!'; else { const w = tb >= 0 ? tb : (sc[0] > sc[1] ? 0 : 1); head = '🏆 ' + (names[w] || NS.TEAM_TAG[w]).toUpperCase() + ' THẮNG!'; cls = 't' + w; }
    NS.sfx('win');
    const col = i => h('div', { class: 'rcol t' + i }, h('div', { class: 'rname' }, NS.TEAM_ICON[i] + ' ' + (names[i] || NS.TEAM_TAG[i])), h('div', { class: 'rpts' }, sc[i] + ' điểm'),
      h('div', {}, '✔ ' + st[i].right + '  ✘ ' + st[i].wrong + (st[i].avg ? '  ⏱ ' + st[i].avg.toFixed(1) + 's' : '')));
    const wr = r.wrong || [];
    const addBtn = i => {
      if (typeof S === 'undefined' || !S.students || !S.students[i] || !st[i].right) return null;
      const b = h('button', { class: 'green small', type: 'button' }, '➕ ' + st[i].right + ' câu vào thành tích của ' + S.students[i].name);
      b.addEventListener('click', () => { const s = S.students[i]; s.game = Math.min(+S.game || 0, (+s.game || 0) + st[i].right); save(); render(); b.disabled = true; b.textContent = '✔ Đã ghi (tối đa ' + S.game + ' câu trò chơi)'; });
      return b;
    };
    sh.overlay(h('div', { class: 'gdlg wide ' + cls }, h('h2', {}, head), h('div', { class: 'rrow' }, col(0), col(1)),
      wr.length ? h('div', { class: 'rwrong' }, h('b', {}, 'Từ cần ôn lại:'), h('ul', {}, wr.map(w => h('li', {}, w.text + (w.ipa ? ' /' + w.ipa + '/' : '') + ' — ' + w.meaning)))) : null,
      h('div', { class: 'rbtns' }, addBtn(0), addBtn(1)),
      h('div', { class: 'rbtns' }, h('button', { class: 'green', onclick: () => { sh.destroy(); o.onRestart && o.onRestart(); } }, '↺ Chơi lại'), h('button', { onclick: () => { sh.destroy(); o.onExit && o.onExit(); } }, '⌂ Về menu'))));
  };
  NS.curShell = sh; document.body.classList.add('playing');
  return sh;
};

/* Hộp chọn nhanh: trả về Promise<index> */
NS.choose = function (sh, title, options, sub) {
  return new Promise(res => {
    const box = h('div', { class: 'gdlg' }, h('h2', {}, title), sub ? h('p', {}, sub) : null,
      h('div', { class: 'chbtns' }, options.map((t, i) => NS.tap(h('button', { type: 'button', class: i === 0 ? 'green' : '' }, t), () => { sh.closeOverlay(); res(i); }))));
    sh.overlay(box);
  });
};
})();
