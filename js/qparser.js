/* ===== Cú pháp soạn câu hỏi (mục 3A): parser + serializer ===== */
(function () {
'use strict';
const NS = (window.PG = window.PG || {});
const fold = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, ' ').trim();
const LABELS = {
  'dap an': 'answer', 'answer': 'answer', 'key': 'answer',
  'giai thich': 'explanation', 'explain': 'explanation',
  'do kho': 'difficulty', 'level': 'difficulty',
  'dang': 'type', 'type': 'type',
  'chu de': 'topic', 'topic': 'topic',
  'tag': 'tags', 'tags': 'tags',
  'tu': 'word', 'word': 'word',
  'doc': 'say', 'say': 'say',
  'goi y': 'hint', 'hint': 'hint',
  'am thanh': 'audio', 'audio': 'audio',
  'diem': 'points', 'points': 'points',
  'thoi gian': 'time', 'time': 'time',
  'xao': 'scramble', 'scramble': 'scramble',
  'tach': 'split', 'split': 'split',
  'bai': 'lesson', 'lesson': 'lesson',
  'nguon': 'source', 'source': 'source',
  'rubric': 'extra', 'bai mau': 'extra',
  'giu het lua chon': 'keepall'
};
const TYPES = ['trac-nghiem', 'dien-tu', 'dung-sai', 'sap-xep-chu', 'sap-xep-cau', 'nghe', 'ghep-cap', 'o-chu'];
const TYPE_ALIAS = { 'trac nghiem': 'trac-nghiem', 'dien tu': 'dien-tu', 'dung sai': 'dung-sai', 'sap xep chu': 'sap-xep-chu', 'dao chu': 'sap-xep-chu', 'sap xep cau': 'sap-xep-cau', 'nghe': 'nghe', 'ghep cap': 'ghep-cap', 'o chu': 'o-chu' };
const DIRS = { 'chu de': 'topic', 'do kho': 'difficulty', 'dang': 'type', 'bai': 'lesson', 'tag': 'tags', 'diem': 'points' };
const OPEN_Q = /^\s*(Câu|Cau|Q)\s*(\d+)\s*[:.)]\s*(.*)$/i;
const OPEN_C = /^\s*(Bộ thẻ|Bo the|Cards)\s*:\s*(.*)$/i;
const OPEN_P = /^\s*(Ô chữ|O chu|Puzzle)\s*:\s*(.*)$/i;
const OPT = /^\s*([A-F])\s*[.)]\s+(.+)$/;
const LBL = /^\s*([A-Za-zÀ-ỹĐđ ]{1,24}?)\s*:\s*(.*)$/;
const diffOf = v => { const f = fold(v); return ['de', '1'].includes(f) ? 1 : ['kho', '3'].includes(f) ? 3 : 2; };
const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return 'q' + (h >>> 0).toString(36); };

NS.parseQuestions = function (text, opts) {
  opts = opts || {};
  const words = opts.words || (NS.vocab && NS.vocab.words) || [], topics = opts.topics || (NS.vocab && NS.vocab.topics) || [];
  const res = { questions: [], cardSets: [], puzzles: [], errors: [], warnings: [], total: 0, stats: { type: {}, diff: {}, topic: {} } };
  const err = (code, line, msg, excerpt, hint) => res.errors.push({ code, line, msg, excerpt: excerpt || '', hint: hint || '' });
  const warn = (code, line, msg, excerpt, hint) => res.warnings.push({ code, line, msg, excerpt: excerpt || '', hint: hint || '' });
  text = String(text || '');
  if (text.length > 2000000) { err('E900', 0, 'File quá lớn (tối đa 2 MB).'); return res; }
  const lines = text.replace(/^\uFEFF/, '').split(/\r\n|\r|\n/).map(l => l.replace(/\s+$/, '').replace(/\t/g, '  '));

  /* 1) chia khối */
  const hasOpeners = lines.some(l => OPEN_Q.test(l) || OPEN_C.test(l) || OPEN_P.test(l));
  const blocks = []; let cur = null; let defaults = {};
  const close = () => { if (cur) { while (cur.lines.length && !cur.lines[cur.lines.length - 1].s.trim()) cur.lines.pop(); blocks.push(cur); cur = null; } };
  const open = (kind, n, first, d) => { close(); cur = { kind, n, head: first, lines: [], defaults: Object.assign({}, d) }; };
  lines.forEach((raw, i) => {
    const n = i + 1;
    if (/^\s*\/\//.test(raw)) return;
    if (/^\s*-{3,}\s*$/.test(raw)) { close(); return; }
    let m = raw.match(/^\s*@(hết|het)\s*$/i);
    if (m) { close(); defaults = {}; return; }
    m = raw.match(/^\s*@([^:]+?)\s*:\s*(.*)$/);
    if (m) { close(); const k = DIRS[fold(m[1])]; if (k) defaults[k] = m[2].trim(); else warn('W003', n, 'Chỉ thị lạ: @' + m[1], raw); return; }
    if ((m = raw.match(OPEN_C))) { open('cards', n, m[2], defaults); return; }
    if ((m = raw.match(OPEN_P))) { open('puzzle', n, m[2], defaults); return; }
    if ((m = raw.match(OPEN_Q))) { open('q', n, m[3], defaults); return; }
    if (hasOpeners) { if (cur) cur.lines.push({ n, s: raw }); return; }
    if (!raw.trim()) { close(); return; }
    if (!cur) open('q', n, raw, defaults); else cur.lines.push({ n, s: raw });
  });
  close();
  if (blocks.length > 5000) { err('E901', 0, 'Quá nhiều khối (tối đa 5000).'); blocks.length = 5000; }
  res.total = blocks.length;

  const topicOf = v => { if (v == null || v === '') return undefined; const x = parseInt(v, 10); if (!isNaN(x) && String(x) === String(v).trim()) return x; const f = fold(v); const i = topics.findIndex(t => fold(t).includes(f) || f.includes(fold(t))); return i >= 0 ? i + 1 : undefined; };
  const wordFind = id => words.find(w => w.id === id || w.text.toLowerCase() === String(id).toLowerCase());

  /* 2) phân tích từng khối */
  blocks.forEach(b => {
    if (b.kind === 'cards') return parseCards(b);
    if (b.kind === 'puzzle') return parsePuzzle(b);
    parseQ(b);
  });

  function parseCards(b) {
    const set = { name: b.head.trim() || 'Bộ thẻ', pairs: [], topic: undefined, line: b.n }; let ok = true;
    b.lines.forEach(l => {
      const s = l.s.trim(); if (!s) return;
      const lm = s.match(LBL);
      if (lm && LABELS[fold(lm[1])] === 'topic') { set.topic = topicOf(lm[2]); return; }
      const i = s.indexOf('::');
      if (i < 0) { warn('W011', l.n, 'Dòng thẻ thiếu "::" nên bị bỏ qua.', s, 'Viết: từ :: nghĩa'); return; }
      let left = s.slice(0, i).trim(), right = s.slice(i + 2).trim(), ipa;
      const mm = left.match(/^(.*?)\s*\/([^\/]+)\/\s*$/); if (mm) { left = mm[1].trim(); ipa = mm[2].trim(); }
      if (!left || !right) { warn('W011', l.n, 'Thẻ có vế rỗng nên bị bỏ qua.', s); return; }
      if (set.pairs.some(p => p.left.toLowerCase() === left.toLowerCase() || p.right.toLowerCase() === right.toLowerCase())) warn('W010', l.n, 'Thẻ trùng từ hoặc nghĩa.', s);
      set.pairs.push({ left, ipa, right });
    });
    if (set.pairs.length < 4) { err('E040', b.n, 'Bộ thẻ "' + set.name + '" cần ít nhất 4 cặp (hiện ' + set.pairs.length + ').', 'Bộ thẻ: ' + set.name); ok = false; }
    if (set.topic === undefined && b.defaults.topic) set.topic = topicOf(b.defaults.topic);
    if (ok) res.cardSets.push(set);
  }

  function parsePuzzle(b) {
    const kw = b.head.trim(); const letters = kw.replace(/[^A-Za-z]/g, '').toUpperCase(); const N = letters.length;
    const rows = []; let bad = false;
    b.lines.forEach(l => {
      const m = l.s.match(LBL); if (!m || fold(m[1]) !== 'hang') { if (l.s.trim()) warn('W012', l.n, 'Dòng không phải "Hàng:" nên bị bỏ qua.', l.s); return; }
      const parts = m[2].split('|').map(x => x.trim());
      if (parts.length < 4) { err('E053', l.n, 'Hàng cần dạng: từ | vị trí ô cam | Ô số | gợi ý.', l.s); bad = true; return; }
      rows.push({ word: parts[0], hi: parseInt(parts[1], 10), slot: parseInt(parts[2], 10), clue: parts.slice(3).join(' | '), line: l.n });
    });
    if (rows.length !== N) { err('E050', b.n, 'Từ khóa "' + kw + '" có ' + N + ' chữ cái nhưng có ' + rows.length + ' hàng.', 'Ô chữ: ' + kw); bad = true; }
    const slots = rows.map(r => r.slot).sort((a, c) => a - c);
    if (slots.some((s, i) => s !== i + 1)) { err('E051', b.n, 'Cột "Ô số" phải là hoán vị đầy đủ 1..' + N + ' (không thiếu, không trùng).', 'Ô chữ: ' + kw); bad = true; }
    rows.forEach(r => {
      const w = r.word.toUpperCase();
      if (!(r.hi >= 1 && r.hi <= w.length) || w[r.hi - 1] !== letters[r.slot - 1]) { err('E052', r.line, 'Chữ ở ô cam của "' + r.word + '" (vị trí ' + r.hi + ') không khớp chữ thứ ' + r.slot + ' của từ khóa (' + (letters[r.slot - 1] || '?') + ').', 'Hàng: ' + r.word); bad = true; }
      if (/in|on|at|the/i.test(r.word)) warn('W020', r.line, '"' + r.word + '" chứa in/on/at/the.', r.word);
      if (r.clue && r.clue.toLowerCase().includes(r.word.toLowerCase())) warn('W021', r.line, 'Gợi ý chứa chính đáp án.', r.clue);
    });
    for (let i = 1; i < rows.length; i++) if (rows[i].hi === rows[i - 1].hi) warn('W022', rows[i].line, 'Hai hàng liền kề có ô cam cùng cột.', rows[i].word);
    if (!bad) res.puzzles.push({ keyword: kw, rows: rows.map(r => ({ word: r.word, hi: r.hi, slot: r.slot, clue: r.clue })), line: b.n });
  }

  function parseQ(b) {
    const stem = [b.head]; const opts2 = []; const fields = {}; const extra = {}; const marked = [];
    let ctx = { t: 'stem' }, afterStart = false;
    const append = (c, text, blank) => {
      if (c.t === 'stem') stem.push(text);
      else if (c.t === 'opt') opts2[c.i].text += (blank ? '\n' : '\n') + text;
      else if (c.t === 'field') fields[c.k] = (fields[c.k] || '') + '\n' + text;
      else if (c.t === 'extra') extra[c.k] += '\n' + text;
    };
    b.lines.forEach(l => {
      let s = l.s;
      if (/^\s*\\/.test(s)) { append(ctx, s.replace(/^(\s*)\\/, '$1').trim()); return; }
      if (!s.trim()) { if (hasOpeners) append(ctx, ''); return; }
      let m = s.match(OPT);
      if (m) {
        let t = m[2].trim(), mk = false;
        if (/\(\s*(đúng|dung)\s*\)\s*$/i.test(t)) { t = t.replace(/\s*\(\s*(đúng|dung)\s*\)\s*$/i, ''); mk = true; }
        else if (/(^|[^\\])\*\s*$/.test(t)) { t = t.replace(/\s*\*\s*$/, ''); mk = true; }
        t = t.replace(/\\\*/g, '*');
        opts2.push({ key: m[1], text: t }); if (mk) marked.push(m[1]); ctx = { t: 'opt', i: opts2.length - 1 }; afterStart = true; return;
      }
      if (ctx.t === 'opt' && /^ {2,}\S/.test(s)) { append(ctx, s.trim()); return; }
      m = s.match(LBL);
      if (m) {
        const k = LABELS[fold(m[1])];
        if (k === 'extra') { extra[m[1].trim()] = m[2].trim(); ctx = { t: 'extra', k: m[1].trim() }; afterStart = true; return; }
        if (k) { fields[k] = m[2].trim(); ctx = { t: 'field', k }; afterStart = true; return; }
        if (afterStart && fold(m[1]).split(' ').length <= 3 && !/^\s/.test(s)) { warn('W002', l.n, 'Nhãn lạ "' + m[1].trim() + '" được giữ lại ở trường tự do.', s); extra[m[1].trim()] = m[2].trim(); ctx = { t: 'extra', k: m[1].trim() }; return; }
      }
      append(ctx, s.trim());
    });
    const st = stem.join('\n').replace(/^\n+|\n+$/g, '').trim();
    const f = Object.assign({}, b.defaults, fields);
    const q = { id: '', type: '', stem: st, options: opts2.length ? opts2 : undefined, answers: [], explanation: (f.explanation || '').trim() || undefined, difficulty: diffOf(f.difficulty || 'Vừa'), topic: topicOf(f.topic), tags: [], extra, sourceLine: b.n };
    const firstLine = b.n;
    q.tags = [...new Set([b.defaults.tags, fields.tags].filter(Boolean).join(',').split(',').map(x => x.trim()).filter(Boolean))];
    ['say', 'audio', 'hint', 'lesson', 'source'].forEach(k => { if (f[k] && String(f[k]).trim()) q[k] = String(f[k]).trim(); });
    if (f.points) q.points = parseInt(f.points, 10) || undefined;
    if (f.time) q.timeLimit = parseInt(f.time, 10) || undefined;
    if (f.keepall) q.extra['Giữ hết lựa chọn'] = f.keepall;
    if (f.scramble) q.scramble = f.scramble.split(/\s+/).filter(Boolean);
    if (f.split) q.chunks = f.split.split('|').map(x => x.trim()).filter(Boolean);
    let word = null;
    if (f.word) { word = wordFind(String(f.word).trim()); if (!word) { const sug = words.map(w => ({ w, d: NS.lev(String(f.word).toLowerCase(), w.id) })).sort((a, c) => a.d - c.d).slice(0, 3).map(x => x.w.id).join(', '); err('E030', b.n, 'Từ "' + f.word + '" không có trong kho từ vựng.', 'Từ: ' + f.word, 'Có thể bạn muốn: ' + sug); return; } q.wordId = word.id; }
    /* dạng */
    let type = f.type ? (TYPES.includes(fold(f.type).replace(/ /g, '-')) ? fold(f.type).replace(/ /g, '-') : TYPE_ALIAS[fold(f.type)]) : '';
    if (f.type && !type) { err('E011', b.n, 'Dạng "' + f.type + '" không hợp lệ.', 'Dạng: ' + f.type, 'Dùng: ' + TYPES.join(', ')); return; }
    const ansF = (f.answer || '').trim();
    if (!type) {
      if (opts2.length >= 2 && f.word && (q.say || q.audio)) type = 'nghe';
      else if (opts2.length >= 2) type = 'trac-nghiem';
      else if (['dung', 'sai', 'true', 'false'].includes(fold(ansF))) type = 'dung-sai';
      else if (q.scramble) type = 'sap-xep-chu';
      else if (q.chunks) type = 'sap-xep-cau';
      else if (/_{3,}/.test(st) && !opts2.length) type = 'dien-tu';
      else if (word) type = 'trac-nghiem';
    }
    if (!type) { err('E010', b.n, 'Không xác định được dạng câu hỏi.', st.split('\n')[0], 'Thêm dòng "Dạng: ..." hoặc các lựa chọn A. B. C.'); return; }
    q.type = type;
    if (type === 'ghep-cap' || type === 'o-chu') { err('E012', b.n, 'Dạng ' + type + ' phải viết bằng khối "Bộ thẻ:" hoặc "Ô chữ:".', st.split('\n')[0]); return; }
    /* điền khuyết từ kho */
    const lvl = q.difficulty;
    if (!q.stem && word) q.stem = type === 'nghe' ? 'Nghe và chọn nghĩa đúng.' : type === 'dung-sai' ? '"' + word.text + '" nghĩa là "' + word.meaning + '".' : 'Từ tiếng Anh nào có nghĩa là "' + word.meaning + '"?';
    if ((type === 'trac-nghiem' || type === 'nghe') && (!q.options || q.options.length < 2) && word) {
      const g = NS.makeMC(word, type === 'nghe' ? 'en2vi' : 'vi2en', lvl, words);
      if (g) { q.options = g.options.map((t, i) => ({ key: 'ABCD'[i], text: t })); marked.length = 0; marked.push('ABCD'[g.answer]); }
    }
    if (type === 'trac-nghiem' || type === 'nghe') {
      if (!q.options || q.options.length < 2) { err('E002', b.n, 'Cần ít nhất 2 lựa chọn.', q.stem.split('\n')[0]); return; }
      const keys = q.options.map(o => o.key);
      const fromField = ansF ? ansF.toUpperCase().replace(/[^A-F]/g, '').split('') : [];
      if (marked.length > 1 || fromField.length > 1) { err('E022', b.n, 'Có nhiều hơn một đáp án đúng.', q.stem.split('\n')[0]); return; }
      if (!marked.length && !fromField.length) { err('E020', b.n, 'Không có đáp án đúng.', q.stem.split('\n')[0], 'Thêm dấu * sau đáp án đúng hoặc dòng "Đáp án: B".'); return; }
      if (marked.length && fromField.length && marked[0] !== fromField[0]) { err('E021', b.n, 'Dấu * (' + marked[0] + ') và dòng Đáp án (' + fromField[0] + ') không khớp.', q.stem.split('\n')[0]); return; }
      const a = marked[0] || fromField[0];
      if (!keys.includes(a)) { err('E023', b.n, 'Đáp án "' + a + '" không có trong các lựa chọn.', q.stem.split('\n')[0]); return; }
      q.answers = [a];
    } else if (type === 'dung-sai') {
      const v = fold(ansF); if (!['dung', 'sai', 'true', 'false', 'd', 's'].includes(v)) { err('E024', b.n, 'Đáp án đúng/sai phải là "Đúng" hoặc "Sai".', q.stem.split('\n')[0]); return; }
      q.answers = [['dung', 'true', 'd'].includes(v) ? 'Đúng' : 'Sai'];
    } else {
      q.answers = ansF.split('|').map(x => x.trim()).filter(Boolean);
      if (!q.answers.length && word && (type === 'sap-xep-chu' || type === 'dien-tu')) q.answers = [word.text];
      if (!q.answers.length) { err('E025', b.n, 'Thiếu dòng "Đáp án:".', q.stem.split('\n')[0]); return; }
      if (type === 'dien-tu' && !/_{3,}/.test(q.stem)) warn('W004', b.n, 'Đề điền từ nên có chỗ trống "___".', q.stem.split('\n')[0]);
      if (type === 'sap-xep-chu' && !q.hint && word) q.hint = word.meaning;
    }
    if (q.options && q.options.length > 6) { err('E003', b.n, 'Tối đa 6 lựa chọn.', q.stem.split('\n')[0]); return; }
    q.id = hash(q.type + '|' + q.stem + '|' + q.answers.join('|'));
    res.questions.push(q);
  }

  res.questions.forEach(q => { const s = res.stats; s.type[q.type] = (s.type[q.type] || 0) + 1; s.diff[q.difficulty] = (s.diff[q.difficulty] || 0) + 1; if (q.topic) s.topic[q.topic] = (s.topic[q.topic] || 0) + 1; });
  return res;
};

/* ---------- Serializer (xuất ngược cú pháp chuẩn) ---------- */
NS.serializeQuestions = function (data) {
  const out = []; const DIFF = ['', 'Dễ', 'Vừa', 'Khó'];
  const esc = (s, first) => String(s).split('\n').map((l, i) => (!(first && i === 0) && (OPT.test(l) || (LBL.test(l) && LABELS[fold(l.match(LBL)[1])]) || OPEN_Q.test(l) || /^\s*(\/\/|@|---)/.test(l))) ? '\\' + l : l).join('\n');
  (data.questions || []).forEach((q, i) => {
    const L = ['Câu ' + (i + 1) + ': ' + esc(q.stem, true)];
    (q.options || []).forEach(o => {
      const parts = esc(o.text).split('\n'), first = parts[0].replace(/\*$/, '\\*');
      const mark = q.answers.includes(o.key) && (q.type === 'trac-nghiem' || q.type === 'nghe') ? '*' : '';
      L.push(o.key + '. ' + first + mark + parts.slice(1).map(x => '\n  ' + x).join(''));
    });
    L.push('Dạng: ' + q.type);
    if (q.type === 'trac-nghiem' || q.type === 'nghe') L.push('Đáp án: ' + q.answers[0]);
    else if (q.answers.length) L.push('Đáp án: ' + q.answers.join(' | '));
    if (q.wordId) L.push('Từ: ' + q.wordId);
    L.push('Độ khó: ' + DIFF[q.difficulty]);
    if (q.topic) L.push('Chủ đề: ' + q.topic);
    if (q.tags && q.tags.length) L.push('Tag: ' + q.tags.join(', '));
    if (q.lesson) L.push('Bài: ' + q.lesson);
    if (q.source) L.push('Nguồn: ' + q.source);
    if (q.points) L.push('Điểm: ' + q.points);
    if (q.timeLimit) L.push('Thời gian: ' + q.timeLimit);
    if (q.say) L.push('Đọc: ' + q.say);
    if (q.audio) L.push('Âm thanh: ' + q.audio);
    if (q.hint) L.push('Gợi ý: ' + q.hint);
    if (q.scramble) L.push('Xáo: ' + q.scramble.join(' '));
    if (q.chunks) L.push('Tách: ' + q.chunks.join(' | '));
    if (q.explanation) L.push('Giải thích: ' + esc(q.explanation));
    Object.keys(q.extra || {}).forEach(k => L.push(k + ': ' + esc(q.extra[k])));
    out.push(L.join('\n'));
  });
  (data.cardSets || []).forEach(c => {
    const L = ['Bộ thẻ: ' + c.name]; if (c.topic) L.push('Chủ đề: ' + c.topic);
    c.pairs.forEach(p => L.push(p.left + (p.ipa ? ' /' + p.ipa + '/' : '') + ' :: ' + p.right)); out.push(L.join('\n'));
  });
  (data.puzzles || []).forEach(p => { out.push(['Ô chữ: ' + p.keyword].concat(p.rows.map(r => 'Hàng: ' + r.word + ' | ' + r.hi + ' | ' + r.slot + ' | ' + r.clue)).join('\n')); });
  return out.join('\n\n') + '\n';
};
})();
